import asyncio
import logging
from datetime import datetime, timezone, timedelta
import httpx
from sqlalchemy import select, func
from app.core.config import settings, SNAPSHOTS_DIR, RECORDINGS_DIR
from app.core.database import AsyncSessionLocal
from app.models.entities import AlertRule, SecurityEvent, Camera
from app.services.telegram_service import telegram_service

logger = logging.getLogger("edgesentinel.alert")


class AlertService:
    def __init__(self):
        self.cooldown_tracker: dict[str, float] = {}
        self.last_digest_date: str | None = None
        self.digest_task: asyncio.Task | None = None

    def start_scheduler(self):
        if not self.digest_task:
            self.digest_task = asyncio.create_task(self._morning_digest_loop())

    async def _morning_digest_loop(self):
        """Checks every 15 minutes if it's 07:00 WIB and sends the morning security digest."""
        logger.info("Morning security digest scheduler started.")
        while True:
            try:
                now_utc = datetime.now(timezone.utc)
                now_wib = now_utc + timedelta(hours=7)
                today_str = now_wib.strftime("%Y-%m-%d")

                # Trigger between 07:00 and 07:15 WIB once a day
                if now_wib.hour == 7 and self.last_digest_date != today_str:
                    self.last_digest_date = today_str
                    await self._send_daily_digest(today_str)

                await asyncio.sleep(600)  # Check every 10 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in morning digest loop: {e}")
                await asyncio.sleep(300)

    async def _send_daily_digest(self, date_str: str):
        """Constructs and broadcasts morning summary to all active WhatsApp recipients."""
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        async with AsyncSessionLocal() as session:
            stmt_rules = select(AlertRule).where(AlertRule.is_active.is_(True))
            rules = (await session.execute(stmt_rules)).scalars().all()
            if not rules:
                return

            stmt_cnt = select(func.count(SecurityEvent.id)).where(SecurityEvent.created_at >= since_24h)
            total_events = (await session.execute(stmt_cnt)).scalar() or 0

            stmt_person = select(func.count(SecurityEvent.id)).where(
                SecurityEvent.created_at >= since_24h,
                SecurityEvent.object_class == "person"
            )
            person_cnt = (await session.execute(stmt_person)).scalar() or 0

            # Collect unique phone numbers
            recipients = {r.whatsapp_number.strip().replace("+", "").replace("-", "").replace(" ", "") for r in rules if r.whatsapp_number}

            message = (
                f"📋 *[Laporan Keamanan Pagi EdgeSentinel]*\n"
                f"📅 *Tanggal:* {date_str}\n"
                f"⏰ *Waktu:* 07:00 WIB\n\n"
                f"🛡️ *Ringkasan 24 Jam Terakhir:*\n"
                f"• Total Objek Terdeteksi: {total_events}\n"
                f"• Deteksi Orang: {person_cnt} kali\n"
                f"• Status Rumah: Aman & Terkendali 🟢\n\n"
                f"Ketik *!status* untuk info detail atau *!foto 1* untuk cek kamera."
            )

            for phone in recipients:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        target_url = f"{settings.WABRIDGE_URL.rstrip('/')}/send"
                        payload = {"phone": phone, "message": message}
                        await client.post(target_url, json=payload)
                except Exception as e:
                    logger.warning(f"Failed sending daily digest to {phone}: {e}")

            # Also broadcast to Telegram if configured
            if telegram_service.is_configured:
                await telegram_service.send_alert(message)

    async def evaluate_event(self, event: SecurityEvent, camera: Camera):
        """
        Evaluates a newly detected security event against active AlertRules.
        Triggers WhatsApp notification if rules match and cooldown expired.
        """
        # 0. Global Arming Mode Check
        arming = getattr(settings, "ARMING_MODE", "always")
        if arming == "disarmed":
            logger.info("Security alert suppressed: System is DISARMED.")
            return

        now = datetime.now(timezone.utc)
        # Convert to WIB (UTC+7) for local night check
        wib_hour = (now + timedelta(hours=7)).hour

        if arming == "night_only":
            # Only trigger between 21:00 (9 PM) and 05:00 (5 AM)
            is_night = (wib_hour >= 21 or wib_hour < 5)
            if not is_night:
                logger.info(f"Security alert suppressed: Night-only mode active (Current WIB hour: {wib_hour}).")
                return

        async with AsyncSessionLocal() as session:
            # Query active rules matching this camera or all cameras
            stmt = select(AlertRule).where(AlertRule.is_active.is_(True))
            result = await session.execute(stmt)
            rules = result.scalars().all()

            for rule in rules:
                # 1. Camera check
                if rule.camera_id and rule.camera_id != camera.id:
                    continue

                # 2. Object class check
                target_classes = [c.strip().lower() for c in rule.object_classes.split(",") if c.strip()]
                if target_classes and event.object_class.lower() not in target_classes:
                    continue

                # 3. Confidence threshold
                if event.confidence < rule.min_confidence:
                    continue

                # 4. Active hours check (rule-specific)
                if rule.start_hour <= rule.end_hour:
                    if not (rule.start_hour <= wib_hour <= rule.end_hour):
                        continue
                else:  # Overnight range, e.g., 22:00 to 05:00
                    if not (wib_hour >= rule.start_hour or wib_hour <= rule.end_hour):
                        continue

                # 5. Cooldown check
                cooldown_key = f"{rule.id}_{event.object_class}"
                last_time = self.cooldown_tracker.get(cooldown_key, 0)
                current_epoch = now.timestamp()
                if (current_epoch - last_time) < rule.cooldown_seconds:
                    logger.info(f"Alert rule '{rule.name}' suppressed due to cooldown ({rule.cooldown_seconds}s)")
                    continue

                # Trigger WhatsApp notification
                success = await self._send_whatsapp_alert(
                    rule=rule,
                    event=event,
                    camera=camera
                )

                if success:
                    self.cooldown_tracker[cooldown_key] = current_epoch
                    rule.last_triggered_at = now

                    # Trigger Smart Home / Floodlight Webhook if configured
                    if getattr(rule, "webhook_url", None):
                        asyncio.create_task(self._trigger_webhook(rule.webhook_url, event, camera))

                    # Mark event as notified
                    stmt_evt = select(SecurityEvent).where(SecurityEvent.id == event.id)
                    evt_res = await session.execute(stmt_evt)
                    db_event = evt_res.scalar_one_or_none()
                    if db_event:
                        db_event.notified_whatsapp = True
                    await session.commit()
                    break

    async def _trigger_webhook(self, url: str, event: SecurityEvent, camera: Camera):
        """Sends HTTP POST to smart home IoT device / floodlight relay."""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                payload = {
                    "event": "motion_alert",
                    "camera": camera.name,
                    "object": event.object_class,
                    "confidence": event.confidence,
                    "time": datetime.now(timezone.utc).isoformat()
                }
                await client.post(url, json=payload)
                logger.info(f"Smart home floodlight webhook fired successfully: {url}")
        except Exception as e:
            logger.warning(f"Failed to fire smart home webhook ({url}): {e}")

    async def _send_whatsapp_alert(self, rule: AlertRule, event: SecurityEvent, camera: Camera) -> bool:
        phone = rule.whatsapp_number.strip().replace("+", "").replace("-", "").replace(" ", "")
        if not phone:
            return False

        public_base = settings.PUBLIC_URL.rstrip("/")
        snapshot_url = f"{public_base}{event.snapshot_url}" if event.snapshot_url else ""
        live_url = f"{public_base}/"
        local_time_str = (event.created_at + timedelta(hours=7)).strftime("%d-%m-%Y %H:%M:%S WIB")

        # Custom alert title based on Face Recognition / Loitering
        if getattr(event, "familiar_face", None):
            alert_title = f"🟢 *[WAJAH DIKENAL: {event.familiar_face.upper()}]*"
        elif getattr(event, "is_stranger", False):
            alert_title = "🚨 *[PERINGATAN: ORANG ASING TIDAK DIKENAL!]*"
        elif getattr(event, "is_loitering", False):
            alert_title = "⚠️ *[PERINGATAN LOITERING / MENGINTAI]*"
        else:
            alert_title = "🚨 *[EdgeSentinel AI Alert]*"

        loitering_warn = "\n⚠️ *PERINGATAN:* Objek mencurigakan terdeteksi berdiam diri >15 detik!\n" if getattr(event, "is_loitering", False) else ""
        plate_info = f"🚗 *Plat Nomor:* {event.license_plate}\n" if getattr(event, "license_plate", None) else ""
        face_info = f"👤 *Identitas Wajah:* {event.familiar_face}\n" if getattr(event, "familiar_face", None) else ""

        message = (
            f"{alert_title}\n\n"
            f"📹 *Kamera:* {camera.name} ({camera.location})\n"
            f"🔍 *Objek Terdeteksi:* {event.object_class.upper()} (Akurasi: {int(event.confidence * 100)}%)\n"
            f"{face_info}"
            f"{plate_info}"
            f"{loitering_warn}"
            f"⏰ *Waktu:* {local_time_str}\n"
            f"🎯 *Peraturan:* {rule.name}\n\n"
            f"📸 *Snapshot Foto:* {snapshot_url}\n"
            f"📡 *Live Pantau CCTV:* {live_url}\n\n"
            f"⚡ *Balas Perintah Cepat:*\n"
            f"• *!sirine* ➡️ Bunyikan sirine speaker di rumah\n"
            f"• *!video* ➡️ Minta rekaman video klip kejadian\n"
            f"• *!foto* ➡️ Minta foto live terkini"
        )

        # Also dispatch to Telegram backup channel in background
        if telegram_service.is_configured:
            photo_file = SNAPSHOTS_DIR / event.snapshot_filename
            video_file = (RECORDINGS_DIR / event.video_filename) if event.video_filename else None
            asyncio.create_task(telegram_service.send_alert(
                caption=message,
                photo_path=photo_file if photo_file.exists() else None,
                video_path=video_file if video_file and video_file.exists() else None
            ))

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                target_url = f"{settings.WABRIDGE_URL.rstrip('/')}/send"
                payload = {
                    "phone": phone,
                    "message": message,
                    "media_url": snapshot_url if snapshot_url else None
                }
                res = await client.post(target_url, json=payload)
                if res.status_code in (200, 201):
                    logger.info(f"WhatsApp alert successfully delivered to {phone} for event {event.id}")
                    return True
                else:
                    logger.warning(f"WABridge responded with status {res.status_code}: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to send WhatsApp alert via WABridge ({settings.WABRIDGE_URL}): {e}")
            return False


alert_service = AlertService()

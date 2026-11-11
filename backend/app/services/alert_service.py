import logging
from datetime import datetime, timezone, timedelta
import httpx
from sqlalchemy import select
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.entities import AlertRule, SecurityEvent, Camera

logger = logging.getLogger("edgesentinel.alert")


class AlertService:
    def __init__(self):
        self.cooldown_tracker: dict[str, float] = {}

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
                    # Mark event as notified
                    stmt_evt = select(SecurityEvent).where(SecurityEvent.id == event.id)
                    evt_res = await session.execute(stmt_evt)
                    db_event = evt_res.scalar_one_or_none()
                    if db_event:
                        db_event.notified_whatsapp = True
                    await session.commit()
                    break

    async def _send_whatsapp_alert(self, rule: AlertRule, event: SecurityEvent, camera: Camera) -> bool:
        phone = rule.whatsapp_number.strip().replace("+", "").replace("-", "").replace(" ", "")
        if not phone:
            return False

        public_base = settings.PUBLIC_URL.rstrip("/")
        snapshot_url = f"{public_base}{event.snapshot_url}" if event.snapshot_url else ""
        live_url = f"{public_base}/"
        local_time_str = (event.created_at + timedelta(hours=7)).strftime("%d-%m-%Y %H:%M:%S WIB")

        message = (
            f"🚨 *[EdgeSentinel AI Alert]*\n\n"
            f"📹 *Kamera:* {camera.name} ({camera.location})\n"
            f"🔍 *Objek Terdeteksi:* {event.object_class.upper()} (Akurasi: {int(event.confidence * 100)}%)\n"
            f"⏰ *Waktu:* {local_time_str}\n"
            f"🎯 *Peraturan:* {rule.name}\n\n"
            f"📸 *Snapshot Foto:* {snapshot_url}\n"
            f"📡 *Live Pantau CCTV:* {live_url}"
        )

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

import time
import logging
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
import psutil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.entities import Camera, SecurityEvent
from app.services.camera_manager import camera_manager

logger = logging.getLogger("edgesentinel.whatsapp_bot")
router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bot"])


class IncomingWAMessage(BaseModel):
    phone: str | None = None
    sender: str | None = None
    message: str | None = None
    text: str | None = None


async def send_wa_reply(phone: str, text: str, media_url: str | None = None):
    """Sends a WhatsApp response back to the sender via WABridge."""
    phone_clean = phone.strip().replace("+", "").replace("-", "").replace(" ", "")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            target_url = f"{settings.WABRIDGE_URL.rstrip('/')}/send"
            payload = {
                "phone": phone_clean,
                "message": text,
                "media_url": media_url
            }
            await client.post(target_url, json=payload)
    except Exception as e:
        logger.error(f"Failed to send WA reply to {phone_clean}: {e}")


@router.post("/webhook")
async def whatsapp_webhook(payload: dict):
    """
    Receives incoming WhatsApp messages from WABridge and processes bot commands:
    !status, !foto [1-4], !arm, !malam, !disarm, !help
    """
    # Extract phone & message text from various WABridge payload formats
    phone = payload.get("phone") or payload.get("sender") or payload.get("from", "")
    text = (payload.get("message") or payload.get("text") or payload.get("body") or "").strip()

    if not phone or not text:
        return {"status": "ignored", "reason": "empty phone or message"}

    cmd = text.lower().strip()
    logger.info(f"Received WhatsApp command from {phone}: {cmd}")

    # 1. COMMAND: !status
    if cmd in ["!status", "status", "/status"]:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        active_cams = sum(1 for w in camera_manager.workers.values() if w.is_running)
        total_cams = len(camera_manager.workers)

        mode_desc = {
            "always": "Aktif 24 Jam 🟢",
            "night_only": "Hanya Malam 🌙 (21:00-05:00)",
            "disarmed": "Senyap / Disarmed 🔕"
        }.get(settings.ARMING_MODE, settings.ARMING_MODE)

        reply = (
            f"🛡️ *[EdgeSentinel Status AI NVR]*\n\n"
            f"⚡ *CPU:* {cpu}%\n"
            f"💾 *RAM:* {mem}%\n"
            f"📹 *Kamera Aktif:* {active_cams}/{total_cams}\n"
            f"🔒 *Mode Keamanan:* {mode_desc}\n"
            f"🌐 *Web Dashboard:* {settings.PUBLIC_URL}\n\n"
            f"Ketik *!foto 1* untuk melihat foto kamera, atau *!help* untuk menu perintah."
        )
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "status"}

    # 2. COMMAND: !foto [channel]
    elif cmd.startswith("!foto") or cmd.startswith("!snapshot") or cmd.startswith("/foto"):
        parts = cmd.split()
        target_idx = 1
        if len(parts) > 1 and parts[1].isdigit():
            target_idx = int(parts[1])

        # Find camera matching target index
        workers = list(camera_manager.workers.values())
        if not workers:
            await send_wa_reply(phone, "❌ Tidak ada kamera CCTV yang sedang aktif saat ini.")
            return {"status": "no_camera"}

        worker = workers[min(len(workers) - 1, max(0, target_idx - 1))]
        if worker.latest_frame is None:
            await send_wa_reply(phone, f"⚠️ Kamera '{worker.name}' belum memiliki frame siap.")
            return {"status": "no_frame"}

        # Save snapshot file
        import cv2
        from app.core.config import SNAPSHOTS_DIR
        now_ts = int(time.time())
        filename = f"wa_req_{worker.id[:6]}_{now_ts}.jpg"
        filepath = SNAPSHOTS_DIR / filename
        cv2.imwrite(str(filepath), worker.latest_frame)

        public_base = settings.PUBLIC_URL.rstrip("/")
        photo_url = f"{public_base}/snapshots/{filename}"
        reply = (
            f"📸 *[Snapshot Terkini]*\n"
            f"📹 *Kamera:* {worker.name}\n"
            f"⏰ *Waktu:* {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')}\n"
            f"🔗 {photo_url}"
        )
        await send_wa_reply(phone, reply, media_url=photo_url)
        return {"status": "handled", "command": "foto", "photo_url": photo_url}

    # 3. COMMAND: !arm / !aktif
    elif cmd in ["!arm", "!aktif", "/arm"]:
        settings.ARMING_MODE = "always"
        reply = "✅ *[Mode Keamanan Diubah]*\nMode: *AKTIF 24 JAM* 🟢\nNotifikasi WhatsApp akan langsung dikirim setiap kali ada objek mencurigakan terdeteksi."
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "arm"}

    # 4. COMMAND: !malam
    elif cmd in ["!malam", "/malam"]:
        settings.ARMING_MODE = "night_only"
        reply = "🌙 *[Mode Keamanan Diubah]*\nMode: *HANYA MALAM* (21:00 - 05:00 WIB)\nNotifikasi WhatsApp hanya akan berbunyi saat malam hari."
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "night_only"}

    # 5. COMMAND: !disarm / !senyap
    elif cmd in ["!disarm", "!senyap", "/disarm"]:
        settings.ARMING_MODE = "disarmed"
        reply = "🔕 *[Mode Keamanan Diubah]*\nMode: *SENYAP / DISARMED*\nNotifikasi WhatsApp dinonaktifkan sementara. Ketik *!arm* untuk mengaktifkan kembali."
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "disarm"}

    # 6. COMMAND: !sirine / !bunyi (Physical Audio Deterrence)
    elif cmd in ["!sirine", "!bunyi", "/sirine", "/alarm"]:
        from app.services.siren_service import siren_service
        await siren_service.trigger(duration_seconds=10.0)
        reply = (
            "🚨 *[Sirine Speaker Diaktifkan!]*\n"
            "Sirine audio di lokasi berhasil dibunyikan selama 10 detik untuk menakuti penyusup!"
        )
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "siren"}

    # 7. COMMAND: !video / !klip (Send latest MP4 video recording)
    elif cmd in ["!video", "!klip", "/video"]:
        async with AsyncSessionLocal() as session:
            stmt = select(SecurityEvent).where(SecurityEvent.video_url.isnot(None)).order_by(SecurityEvent.created_at.desc()).limit(1)
            res = await session.execute(stmt)
            event = res.scalar_one_or_none()

        if not event or not event.video_url:
            await send_wa_reply(phone, "ℹ️ Belum ada rekaman klip video kejadian yang tersimpan.")
            return {"status": "no_video"}

        reply = (
            f"🎥 *[Klip Video Kejadian Terakhir]*\n\n"
            f"📹 *Kamera:* {event.camera_name}\n"
            f"🏷️ *Objek:* {event.object_class.upper()} ({int(event.confidence * 100)}%)\n"
            f"🕒 *Waktu:* {event.created_at.strftime('%d/%m/%Y %H:%M:%S UTC')}\n"
            f"🔗 {event.video_url}"
        )
        await send_wa_reply(phone, reply, media_url=event.video_url)
        return {"status": "handled", "command": "video", "video_url": event.video_url}

    # 8. COMMAND: !rekap / !digest
    elif cmd in ["!rekap", "!digest", "/rekap", "!laporan"]:
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        async with AsyncSessionLocal() as session:
            stmt = select(func.count(SecurityEvent.id)).where(SecurityEvent.created_at >= since_24h)
            cnt_res = await session.execute(stmt)
            total_events = cnt_res.scalar() or 0

            stmt_person = select(func.count(SecurityEvent.id)).where(
                SecurityEvent.created_at >= since_24h,
                SecurityEvent.object_class == "person"
            )
            person_cnt = (await session.execute(stmt_person)).scalar() or 0

        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        disk = psutil.disk_usage("/")
        free_gb = disk.free / (1024 ** 3)

        reply = (
            f"📊 *[Laporan Keamanan 24 Jam EdgeSentinel]*\n\n"
            f"🚨 *Total Kejadian:* {total_events} deteksi\n"
            f"👤 *Deteksi Orang:* {person_cnt} kali\n"
            f"⚡ *CPU:* {cpu}% | 💾 *RAM:* {mem}%\n"
            f"📦 *Sisa Storage:* {free_gb:.1f} GB\n"
            f"🟢 *Status Sistem:* Berjalan normal & terlindungi."
        )
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "digest"}

    # 9. COMMAND: !help / !menu
    elif cmd in ["!help", "!menu", "help", "menu", "/help"]:
        reply = (
            f"🤖 *[Menu Perintah WhatsApp EdgeSentinel]*\n\n"
            f"📌 *!status* - Cek kesehatan sistem & CCTV\n"
            f"📸 *!foto 1* - Minta foto snapshot live kamera 1\n"
            f"🎥 *!video* - Minta video klip MP4 kejadian terakhir\n"
            f"🚨 *!sirine* - Bunyikan sirine speaker di lokasi (10 dtk)\n"
            f"📊 *!rekap* - Laporan rekapitulasi kejadian 24 jam\n"
            f"🟢 *!arm* - Aktifkan proteksi 24 Jam\n"
            f"🌙 *!malam* - Proteksi khusus malam hari (21:00-05:00)\n"
            f"🔕 *!senyap* - Matikan alarm sementara\n\n"
            f"🌐 Live Monitoring: {settings.PUBLIC_URL}"
        )
        await send_wa_reply(phone, reply)
        return {"status": "handled", "command": "help"}

    return {"status": "unrecognized_command"}


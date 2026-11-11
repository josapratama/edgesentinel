import os
import logging
from pathlib import Path
import httpx
from app.core.config import settings

logger = logging.getLogger("edgesentinel.telegram")


class TelegramService:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    async def send_alert(
        self,
        caption: str,
        photo_path: Path | None = None,
        video_path: Path | None = None
    ) -> bool:
        """Sends an instant alert with optional photo or video to Telegram."""
        if not self.is_configured:
            return False

        base_url = f"https://api.telegram.org/bot{self.bot_token}"

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                # 1. Try sending video if provided and file size < 48MB
                if video_path and video_path.exists() and video_path.stat().st_size < 48 * 1024 * 1024:
                    with open(video_path, "rb") as vf:
                        files = {"video": (video_path.name, vf, "video/mp4")}
                        data = {"chat_id": self.chat_id, "caption": caption, "parse_mode": "Markdown"}
                        resp = await client.post(f"{base_url}/sendVideo", data=data, files=files)
                        if resp.status_code == 200:
                            logger.info(f"Telegram video alert sent successfully to {self.chat_id}")
                            return True
                        logger.warning(f"Telegram sendVideo failed: {resp.text}")

                # 2. Try sending photo snapshot
                if photo_path and photo_path.exists():
                    with open(photo_path, "rb") as pf:
                        files = {"photo": (photo_path.name, pf, "image/jpeg")}
                        data = {"chat_id": self.chat_id, "caption": caption, "parse_mode": "Markdown"}
                        resp = await client.post(f"{base_url}/sendPhoto", data=data, files=files)
                        if resp.status_code == 200:
                            logger.info(f"Telegram photo alert sent successfully to {self.chat_id}")
                            return True
                        logger.warning(f"Telegram sendPhoto failed: {resp.text}")

                # 3. Fallback: text message
                data = {"chat_id": self.chat_id, "text": caption, "parse_mode": "Markdown"}
                resp = await client.post(f"{base_url}/sendMessage", json=data)
                return resp.status_code == 200

        except Exception as e:
            logger.error(f"Error sending Telegram alert: {e}")
            return False

    async def test_connection(self) -> tuple[bool, str]:
        if not self.is_configured:
            return False, "Bot Token atau Chat ID Telegram belum diatur (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)"

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": "🛡️ *[EdgeSentinel Test]*\nKoneksi Bot Telegram berhasil terhubung!",
            "parse_mode": "Markdown"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    return True, "Pesan tes berhasil dikirim ke Telegram!"
                return False, f"Telegram API error {res.status_code}: {res.text}"
        except Exception as e:
            return False, f"Gagal menghubungi server Telegram: {e}"


telegram_service = TelegramService()


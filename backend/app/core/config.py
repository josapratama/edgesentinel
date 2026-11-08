import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SNAPSHOTS_DIR = DATA_DIR / "snapshots"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    APP_NAME: str = "EdgeSentinel AI NVR"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server Host & Port
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Storage
    DATA_PATH: str = str(DATA_DIR)
    SNAPSHOTS_PATH: str = str(SNAPSHOTS_DIR)

    # Database (Async SQLite)
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR}/sentinel.db"

    # WhatsApp Notification Integration (WABridge)
    WABRIDGE_URL: str = os.getenv("WABRIDGE_URL", "http://localhost:8088")
    ALERT_WHATSAPP_NUMBER: str = os.getenv("ALERT_WHATSAPP_NUMBER", "")

    # Vision & Edge AI Settings
    DEFAULT_DETECTION_FPS: float = 5.0
    CONFIDENCE_THRESHOLD: float = 0.45
    SNAPSHOT_RETENTION_DAYS: int = 14

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()


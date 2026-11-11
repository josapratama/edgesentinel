import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str] = mapped_column(String(100), default="Lokasi Utama")
    stream_url: Mapped[str] = mapped_column(String(500), nullable=False)  # "rtsp://...", "http://...", or "demo://front_gate"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    detection_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    fps_limit: Mapped[float] = mapped_column(Float, default=5.0)
    status: Mapped[str] = mapped_column(String(20), default="online")  # "online", "offline", "error"
    connection_status: Mapped[str] = mapped_column(String(30), default="online")  # "online", "authenticating", "auth_error", "encrypted_error", "offline", "fallback_demo"
    error_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(30), nullable=True)
    roi_polygon_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # "[[x1,y1],[x2,y2],...]" normalized
    exclusion_zones_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # "[[[x1,y1],[x2,y2],...], ...]" normalized exclusion masks
    tripwire_direction: Mapped[str] = mapped_column(String(20), default="both")  # "both", "inbound", "outbound"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    events: Mapped[list["SecurityEvent"]] = relationship("SecurityEvent", back_populates="camera", cascade="all, delete-orphan")


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id: Mapped[str] = mapped_column(String(36), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    camera_name: Mapped[str] = mapped_column(String(100), nullable=False)
    object_class: Mapped[str] = mapped_column(String(50), nullable=False)  # "person", "car", "motorcycle", "package", "dog"
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    snapshot_filename: Mapped[str] = mapped_column(String(200), nullable=False)
    snapshot_url: Mapped[str] = mapped_column(String(500), nullable=False)
    video_filename: Mapped[str | None] = mapped_column(String(200), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_loitering: Mapped[bool] = mapped_column(Boolean, default=False)
    familiar_face: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_stranger: Mapped[bool] = mapped_column(Boolean, default=False)
    license_plate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bbox_json: Mapped[str] = mapped_column(Text, default="[]")  # "[x, y, w, h]" normalized
    notified_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    camera: Mapped["Camera"] = relationship("Camera", back_populates="events")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    camera_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # None = semua kamera
    object_classes: Mapped[str] = mapped_column(String(255), default="person,car,package")  # comma-separated
    min_confidence: Mapped[float] = mapped_column(Float, default=0.5)
    start_hour: Mapped[int] = mapped_column(Integer, default=0)    # 0 - 23
    end_hour: Mapped[int] = mapped_column(Integer, default=23)     # 0 - 23
    whatsapp_number: Mapped[str] = mapped_column(String(50), nullable=False)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=60)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Smart Floodlight / IoT relay
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class KnownFace(Base):
    __tablename__ = "known_faces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    relation: Mapped[str] = mapped_column(String(100), default="Keluarga")
    photo_filename: Mapped[str] = mapped_column(String(200), nullable=False)
    features_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SettingItem(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


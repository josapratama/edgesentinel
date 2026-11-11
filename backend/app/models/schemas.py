from datetime import datetime
from pydantic import BaseModel, Field


# Camera schemas
class CameraCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    location: str = Field(default="Lokasi Utama", max_length=100)
    stream_url: str = Field(..., min_length=4, max_length=500)
    is_active: bool = True
    detection_enabled: bool = True
    fps_limit: float = Field(default=5.0, ge=1.0, le=30.0)
    roi_polygon_json: str | None = None


class CameraUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    stream_url: str | None = None
    is_active: bool | None = None
    detection_enabled: bool | None = None
    fps_limit: float | None = None
    roi_polygon_json: str | None = None


class CameraResponse(BaseModel):
    id: str
    name: str
    location: str
    stream_url: str
    is_active: bool
    detection_enabled: bool
    fps_limit: float
    status: str
    connection_status: str = "online"
    error_message: str | None = None
    resolution: str | None = None
    roi_polygon_json: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Event schemas
class SecurityEventResponse(BaseModel):
    id: str
    camera_id: str
    camera_name: str
    object_class: str
    confidence: float
    snapshot_filename: str
    snapshot_url: str
    video_filename: str | None = None
    video_url: str | None = None
    is_loitering: bool = False
    bbox_json: str
    notified_whatsapp: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Alert rule schemas
class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    camera_id: str | None = None
    object_classes: str = "person,car,package"
    min_confidence: float = Field(default=0.5, ge=0.1, le=1.0)
    start_hour: int = Field(default=0, ge=0, le=23)
    end_hour: int = Field(default=23, ge=0, le=23)
    whatsapp_number: str = Field(..., min_length=6, max_length=50)
    cooldown_seconds: int = Field(default=60, ge=10, le=3600)
    is_active: bool = True


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    camera_id: str | None = None
    object_classes: str | None = None
    min_confidence: float | None = None
    start_hour: int | None = None
    end_hour: int | None = None
    whatsapp_number: str | None = None
    cooldown_seconds: int | None = None
    is_active: bool | None = None


class AlertRuleResponse(BaseModel):
    id: str
    name: str
    camera_id: str | None
    object_classes: str
    min_confidence: float
    start_hour: int
    end_hour: int
    whatsapp_number: str
    cooldown_seconds: int
    is_active: bool
    last_triggered_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


# System stats schema
class SystemStatsResponse(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float
    disk_percent: float
    disk_free_gb: float
    active_cameras: int
    total_events_today: int
    uptime_seconds: float


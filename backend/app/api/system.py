import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
import psutil
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import SecurityEvent
from app.models.schemas import SystemStatsResponse
from app.services.camera_manager import camera_manager
from app.services.scanner import scan_lan_cctv

router = APIRouter(prefix="/system", tags=["System"])
START_TIME = time.time()


class ArmingModePayload(BaseModel):
    mode: str  # 'always' | 'night_only' | 'disarmed'


class ScanRequestPayload(BaseModel):
    subnet: str | None = None


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    # Count today's events
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    stmt = select(func.count(SecurityEvent.id)).where(SecurityEvent.created_at >= today_start)
    res = await db.execute(stmt)
    today_events_count = res.scalar() or 0

    active_cams = sum(1 for w in camera_manager.workers.values() if w.is_running)

    return SystemStatsResponse(
        cpu_percent=cpu_percent,
        memory_percent=mem.percent,
        memory_used_mb=round(mem.used / (1024 * 1024), 1),
        memory_total_mb=round(mem.total / (1024 * 1024), 1),
        disk_percent=disk.percent,
        disk_free_gb=round(disk.free / (1024 * 1024 * 1024), 1),
        active_cameras=active_cams,
        total_events_today=today_events_count,
        uptime_seconds=round(time.time() - START_TIME, 1)
    )


@router.get("/arming")
async def get_arming_mode():
    return {
        "mode": settings.ARMING_MODE,
        "description": {
            "always": "Aktif 24 Jam (Deteksi & Notifikasi Selalu Hidup)",
            "night_only": "Hanya Malam (21:00 - 05:00 WIB)",
            "disarmed": "Nonaktif (Senyap / Tanpa Notifikasi)"
        }.get(settings.ARMING_MODE, "Custom")
    }


@router.put("/arming")
async def set_arming_mode(payload: ArmingModePayload):
    if payload.mode not in ["always", "night_only", "disarmed"]:
        raise HTTPException(status_code=400, detail="Mode tidak valid. Pilihan: always, night_only, disarmed")
    settings.ARMING_MODE = payload.mode
    return {
        "mode": settings.ARMING_MODE,
        "message": f"Mode keamanan berhasil diubah ke: {settings.ARMING_MODE}"
    }


@router.post("/scan-cameras")
async def scan_cameras(payload: ScanRequestPayload | None = None):
    subnet = payload.subnet if payload else None
    devices = await scan_lan_cctv(subnet)
    return {
        "success": True,
        "scanned_subnet": subnet or "auto-detected",
        "devices_found": len(devices),
        "devices": devices
    }

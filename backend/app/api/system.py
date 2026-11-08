import time
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
import psutil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.entities import SecurityEvent
from app.models.schemas import SystemStatsResponse
from app.services.camera_manager import camera_manager

router = APIRouter(prefix="/system", tags=["System"])
START_TIME = time.time()


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


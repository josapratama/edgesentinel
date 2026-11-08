from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.config import SNAPSHOTS_DIR
from app.core.database import get_db
from app.models.entities import SecurityEvent
from app.models.schemas import SecurityEventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=list[SecurityEventResponse])
async def list_events(
    camera_id: str | None = Query(default=None),
    object_class: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SecurityEvent).order_by(desc(SecurityEvent.created_at))

    if camera_id:
        stmt = stmt.where(SecurityEvent.camera_id == camera_id)
    if object_class:
        stmt = stmt.where(SecurityEvent.object_class == object_class.lower())

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(SecurityEvent).where(SecurityEvent.id == event_id)
    res = await db.execute(stmt)
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Remove snapshot file
    filepath = SNAPSHOTS_DIR / event.snapshot_filename
    if filepath.is_file():
        try:
            filepath.unlink()
        except Exception:
            pass

    await db.delete(event)
    await db.commit()
    return None


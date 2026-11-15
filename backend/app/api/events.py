import csv
import io
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.config import SNAPSHOTS_DIR
from app.core.database import get_db
from app.models.entities import SecurityEvent
from app.models.schemas import SecurityEventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/export/csv")
async def export_events_csv(
    camera_id: str | None = Query(default=None),
    object_class: str | None = Query(default=None),
    limit: int = Query(default=500, le=2000),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SecurityEvent).order_by(desc(SecurityEvent.created_at))
    if camera_id:
        stmt = stmt.where(SecurityEvent.camera_id == camera_id)
    if object_class:
        stmt = stmt.where(SecurityEvent.object_class == object_class.lower())

    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    events = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID",
        "Timestamp",
        "Camera ID",
        "Object Class",
        "Confidence (%)",
        "Snapshot Filename",
        "Video Clip Filename",
        "Extra Metadata"
    ])

    for evt in events:
        writer.writerow([
            evt.id,
            evt.created_at.isoformat() if hasattr(evt.created_at, "isoformat") else str(evt.created_at),
            evt.camera_id,
            evt.object_class,
            f"{evt.confidence * 100:.1f}" if evt.confidence is not None else "N/A",
            evt.snapshot_filename or "",
            evt.clip_filename or "",
            str(evt.extra_metadata or "")
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=edgesentinel-events.csv"}
    )


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


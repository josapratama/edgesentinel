from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.entities import Camera
from app.models.schemas import CameraCreate, CameraUpdate, CameraResponse
from app.services.camera_manager import camera_manager

router = APIRouter(prefix="/cameras", tags=["Cameras"])


def _to_camera_response(cam: Camera) -> CameraResponse:
    worker = camera_manager.workers.get(cam.id)
    status_val = "online" if worker and worker.is_running else "offline"
    conn_status = worker.connection_status if worker else (cam.connection_status or "offline")
    err_msg = worker.error_message if worker else cam.error_message
    res_val = worker.resolution if worker else cam.resolution
    return CameraResponse(
        id=cam.id,
        name=cam.name,
        location=cam.location,
        stream_url=cam.stream_url,
        is_active=cam.is_active,
        detection_enabled=cam.detection_enabled,
        fps_limit=cam.fps_limit,
        status=status_val,
        connection_status=conn_status,
        error_message=err_msg,
        resolution=res_val,
        roi_polygon_json=cam.roi_polygon_json,
        exclusion_zones_json=cam.exclusion_zones_json,
        created_at=cam.created_at,
        updated_at=cam.updated_at
    )


@router.get("", response_model=list[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).order_by(Camera.created_at.asc())
    result = await db.execute(stmt)
    cameras = result.scalars().all()
    return [_to_camera_response(cam) for cam in cameras]


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(payload: CameraCreate, db: AsyncSession = Depends(get_db)):
    camera = Camera(
        name=payload.name,
        location=payload.location,
        stream_url=payload.stream_url,
        is_active=payload.is_active,
        detection_enabled=payload.detection_enabled,
        fps_limit=payload.fps_limit,
        roi_polygon_json=payload.roi_polygon_json,
        exclusion_zones_json=payload.exclusion_zones_json,
        status="online"
    )
    db.add(camera)
    await db.commit()
    await db.refresh(camera)

    if camera.is_active:
        await camera_manager.start_camera(camera)

    return _to_camera_response(camera)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).where(Camera.id == camera_id)
    result = await db.execute(stmt)
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    return _to_camera_response(cam)


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: str, payload: CameraUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).where(Camera.id == camera_id)
    result = await db.execute(stmt)
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(cam, field, val)

    await db.commit()
    await db.refresh(cam)

    if cam.is_active:
        await camera_manager.start_camera(cam)
    else:
        await camera_manager.stop_camera(cam.id)

    return _to_camera_response(cam)


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(camera_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Camera).where(Camera.id == camera_id)
    result = await db.execute(stmt)
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")

    await camera_manager.stop_camera(cam.id)
    await db.delete(cam)
    await db.commit()
    return None


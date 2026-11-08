from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
import cv2

from app.services.camera_manager import camera_manager

router = APIRouter(prefix="/streams", tags=["Streams"])


@router.get("/{camera_id}/live")
async def live_stream(camera_id: str):
    """
    Returns continuous multipart/x-mixed-replace MJPEG video stream with AI detection overlay.
    Usable directly inside <img src="/api/streams/{camera_id}/live" /> in browser.
    """
    return StreamingResponse(
        camera_manager.iter_mjpeg_stream(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/{camera_id}/snapshot")
async def snapshot(camera_id: str):
    """Returns single current JPEG frame"""
    worker = camera_manager.workers.get(camera_id)
    if not worker or worker.latest_frame is None:
        raise HTTPException(status_code=404, detail="Camera offline or not ready")

    ret, jpeg = cv2.imencode('.jpg', worker.latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to encode snapshot")

    return Response(content=jpeg.tobytes(), media_type="image/jpeg")


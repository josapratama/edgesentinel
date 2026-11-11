import asyncio
import collections
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
import cv2
import numpy as np
from sqlalchemy import select

from app.core.config import settings, SNAPSHOTS_DIR, RECORDINGS_DIR
from app.core.database import AsyncSessionLocal
from app.models.entities import Camera, SecurityEvent
from app.services.detector import detector, generate_synthetic_cctv_frame, DetectionResult
from app.services.alert_service import alert_service

logger = logging.getLogger("edgesentinel.camera")


def enhance_cctv_frame(frame: np.ndarray) -> np.ndarray:
    """
    Applies adaptive contrast enhancement and subtle unsharp masking to CCTV frames.
    Reduces milky/foggy infrared glow and sharpens details.
    """
    try:
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_chan)
        merged_lab = cv2.merge((cl, a_chan, b_chan))
        enhanced = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

        blurred = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
        sharpened = cv2.addWeighted(enhanced, 1.3, blurred, -0.3, 0)
        return sharpened
    except Exception:
        return frame


class ActiveCameraWorker:
    def __init__(self, camera_data: dict):
        self.id = camera_data["id"]
        self.name = camera_data["name"]
        self.location = camera_data["location"]
        self.stream_url = camera_data["stream_url"]
        self.fps_limit = camera_data.get("fps_limit", 5.0)
        self.detection_enabled = camera_data.get("detection_enabled", True)

        # Parse ROI Polygon (Virtual Tripwire)
        self.roi_polygon = None
        roi_raw = camera_data.get("roi_polygon_json")
        if roi_raw:
            try:
                self.roi_polygon = json.loads(roi_raw)
            except Exception:
                self.roi_polygon = None

        self.is_running = False
        self.latest_frame: np.ndarray | None = None
        self.latest_detections: list[DetectionResult] = []
        self.current_fps = 0.0
        self.frame_counter = 0
        self.task: asyncio.Task | None = None
        self.cap: cv2.VideoCapture | None = None
        self.last_real_frame: np.ndarray | None = None
        self.consecutive_read_failures = 0
        self.last_event_time = 0.0

        # Diagnostics & Health State
        is_demo = self.stream_url.startswith("demo://") or not self.stream_url.strip()
        self.connection_status = "fallback_demo" if is_demo else "authenticating"
        self.error_message: str | None = None
        self.resolution: str | None = "640x360" if is_demo else None

        # Pre-alarm frame ring buffer for 10-second MP4 event video clips
        self.frame_buffer = collections.deque(maxlen=40)

    async def start(self):
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())
        logger.info(f"Camera worker '{self.name}' ({self.id}) started.")

    async def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except (asyncio.CancelledError, Exception):
                pass
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        logger.info(f"Camera worker '{self.name}' stopped.")

    async def _run_loop(self):
        is_demo = self.stream_url.startswith("demo://") or not self.stream_url.strip()

        if not is_demo:
            try:
                # Open RTSP / video capture with TCP transport and 5s timeout
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|stimeout;5000000"
                self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
                if not self.cap.isOpened():
                    logger.warning(f"RTSP connect failed for {self.stream_url}")
                    self.connection_status = "auth_error"
                    self.error_message = "Koneksi RTSP Gagal / Ditolak (401): Periksa password atau matikan enkripsi di Guarding Vision."
                else:
                    self.connection_status = "online"
            except Exception as e:
                logger.error(f"Error opening camera {self.stream_url}: {e}")
                self.connection_status = "offline"
                self.error_message = f"Gagal terhubung: {e}"

        last_time = time.time()

        while self.is_running:
            try:
                start_tick = time.time()
                self.frame_counter += 1

                # 1. Grab Frame
                frame: np.ndarray | None = None
                if not is_demo and self.cap and self.cap.isOpened():
                    ret, captured = self.cap.read()
                    if ret and captured is not None and captured.size > 0:
                        # Detect if frame is an encrypted 16x16 / 32x32 grey block from Hikvision Guarding Vision
                        if captured.shape[0] <= 32 or captured.shape[1] <= 32:
                            self.connection_status = "encrypted_error"
                            self.error_message = "Enkripsi Stream Aktif: Matikan fitur 'Stream Encryption' di aplikasi Guarding Vision / DVR Hikvision."
                            frame = generate_synthetic_cctv_frame(self.name, self.frame_counter)
                        else:
                            self.connection_status = "online"
                            self.error_message = None
                            self.resolution = f"{captured.shape[1]}x{captured.shape[0]}"
                            self.last_real_frame = captured
                            frame = captured
                            self.consecutive_read_failures = 0
                            self.frame_buffer.append(captured.copy())
                    else:
                        self.consecutive_read_failures += 1
                        if self.last_real_frame is not None:
                            # Keep displaying real CCTV frame smoothly, NEVER flicker to synthetic cartoon!
                            frame = self.last_real_frame
                        else:
                            frame = generate_synthetic_cctv_frame(self.name, self.frame_counter)

                        # Reconnect if stream stalled for > 10 seconds (~50 attempts at 5fps)
                        if self.consecutive_read_failures >= 50:
                            logger.warning(f"RTSP stream buffer stalled on '{self.name}'. Reconnecting to RTSP...")
                            try:
                                self.cap.release()
                                self.cap = cv2.VideoCapture(self.stream_url, cv2.CAP_FFMPEG)
                            except Exception as rec_err:
                                logger.error(f"Reconnect error on '{self.name}': {rec_err}")
                            self.consecutive_read_failures = 0
                else:
                    frame = generate_synthetic_cctv_frame(self.name, self.frame_counter)
                    self.connection_status = "fallback_demo" if is_demo else "offline"

                if frame is None:
                    await asyncio.sleep(0.1)
                    continue

                # Handle 1080 Lite / 1080N anamorphic resolution (960x1080 -> standard 16:9 1280x720)
                h, w = frame.shape[:2]
                if w == 960 and h == 1080:
                    frame = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_LINEAR)
                    h, w = 720, 1280
                elif w > 1280:
                    frame = cv2.resize(frame, (1280, int(h * (1280 / w))))

                # Enhance clarity & contrast for real RTSP camera feed (removes night vision fog)
                if not is_demo:
                    frame = enhance_cctv_frame(frame)

                # 2. Run Vision Detection (if enabled) with ROI filtering
                detections: list[DetectionResult] = []
                if self.detection_enabled:
                    detections = detector.detect(
                        frame,
                        self.id,
                        threshold=settings.CONFIDENCE_THRESHOLD,
                        roi_polygon=self.roi_polygon
                    )
                    self.latest_detections = detections

                    # Check if significant event should be saved
                    now_epoch = time.time()
                    if detections and (now_epoch - self.last_event_time) >= 10.0:  # 10s cooldown per camera event record
                        self.last_event_time = now_epoch
                        asyncio.create_task(self._record_security_event(frame, detections))

                # 3. Calculate FPS & Store latest annotated frame
                elapsed = time.time() - last_time
                if elapsed > 0:
                    self.current_fps = 0.9 * self.current_fps + 0.1 * (1.0 / elapsed)
                last_time = time.time()

                annotated = detector.draw_overlay(
                    frame,
                    detections,
                    self.name,
                    self.current_fps,
                    roi_polygon=self.roi_polygon
                )
                self.latest_frame = annotated

                # Rate limit target FPS
                target_delay = 1.0 / max(1.0, self.fps_limit)
                spent = time.time() - start_tick
                sleep_time = max(0.01, target_delay - spent)
                await asyncio.sleep(sleep_time)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in camera loop '{self.name}': {e}")
                await asyncio.sleep(0.2)

    async def _record_video_clip(self, event_id: str, pre_frames: list[np.ndarray]):
        """Records a 10-second MP4 video clip for this security event."""
        try:
            # Collect ~20 more post-alarm frames (~4-5 seconds)
            post_frames = []
            for _ in range(20):
                await asyncio.sleep(0.2)
                if self.latest_frame is not None:
                    post_frames.append(self.latest_frame.copy())

            all_frames = pre_frames + post_frames
            if not all_frames:
                return

            video_filename = f"clip_{event_id}.mp4"
            video_path = RECORDINGS_DIR / video_filename

            h, w = all_frames[0].shape[:2]
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(str(video_path), fourcc, 6.0, (w, h))
            for f in all_frames:
                if f.shape[:2] == (h, w):
                    out.write(f)
            out.release()

            # Update event in DB
            video_url = f"/recordings/{video_filename}"
            async with AsyncSessionLocal() as session:
                stmt = select(SecurityEvent).where(SecurityEvent.id == event_id)
                res = await session.execute(stmt)
                evt = res.scalar_one_or_none()
                if evt:
                    evt.video_filename = video_filename
                    evt.video_url = video_url
                    await session.commit()
            logger.info(f"Recorded 10s MP4 event video clip: {video_filename}")
        except Exception as e:
            logger.error(f"Error recording video clip for event {event_id}: {e}")

    async def _record_security_event(self, raw_frame: np.ndarray, detections: list[DetectionResult]):
        try:
            # Pick the highest confidence detection
            best = max(detections, key=lambda d: d.confidence)
            event_id = str(uuid.uuid4())
            filename = f"event_{int(time.time())}_{best.label}.jpg"
            filepath = SNAPSHOTS_DIR / filename

            # Draw bounding box on saved snapshot
            snapshot_img = detector.draw_overlay(
                raw_frame,
                detections,
                self.name,
                self.current_fps,
                roi_polygon=self.roi_polygon
            )
            cv2.imwrite(str(filepath), snapshot_img)

            snapshot_url = f"/snapshots/{filename}"
            bbox_json = json.dumps([d.to_dict() for d in detections])

            # Trigger background 10s MP4 video recording
            pre_frames_copy = list(self.frame_buffer)
            asyncio.create_task(self._record_video_clip(event_id, pre_frames_copy))

            # Persist to database
            async with AsyncSessionLocal() as session:
                cam_res = await session.execute(select(Camera).where(Camera.id == self.id))
                cam = cam_res.scalar_one_or_none()
                if not cam:
                    return

                event = SecurityEvent(
                    id=event_id,
                    camera_id=self.id,
                    camera_name=self.name,
                    object_class=best.label,
                    confidence=best.confidence,
                    snapshot_filename=filename,
                    snapshot_url=snapshot_url,
                    video_filename=None,
                    video_url=None,
                    bbox_json=bbox_json,
                    notified_whatsapp=False,
                    created_at=datetime.now(timezone.utc)
                )
                session.add(event)
                await session.commit()
                await session.refresh(event)

                # Evaluate for WhatsApp notification
                await alert_service.evaluate_event(event, cam)

        except Exception as e:
            logger.error(f"Failed to record event for camera {self.id}: {e}")


class CameraManager:
    def __init__(self):
        self.workers: dict[str, ActiveCameraWorker] = {}

    async def initialize_all(self):
        """Loads all active cameras from DB and starts their workers"""
        async with AsyncSessionLocal() as session:
            stmt = select(Camera).where(Camera.is_active.is_(True))
            res = await session.execute(stmt)
            cameras = res.scalars().all()

            # If no cameras exist yet, create default demo cameras
            if not cameras:
                default_cams = [
                    Camera(
                        name="Gerbang Depan (Main Gate)",
                        location="Depan Pagar",
                        stream_url="demo://front_gate",
                        is_active=True,
                        detection_enabled=True,
                        fps_limit=10.0,
                        status="online"
                    ),
                    Camera(
                        name="Area Parkir & Garasi",
                        location="Garasi Kendaraan",
                        stream_url="demo://garage_parking",
                        is_active=True,
                        detection_enabled=True,
                        fps_limit=8.0,
                        status="online"
                    ),
                    Camera(
                        name="Pintu Belakang & Gudang",
                        location="Pintu Belakang",
                        stream_url="demo://backdoor_storage",
                        is_active=True,
                        detection_enabled=True,
                        fps_limit=5.0,
                        status="online"
                    ),
                ]
                for cam in default_cams:
                    session.add(cam)
                await session.commit()
                cameras = default_cams

            for cam in cameras:
                await self.start_camera(cam)

    async def start_camera(self, camera: Camera):
        if camera.id in self.workers:
            await self.workers[camera.id].stop()

        worker = ActiveCameraWorker({
            "id": camera.id,
            "name": camera.name,
            "location": camera.location,
            "stream_url": camera.stream_url,
            "fps_limit": camera.fps_limit,
            "detection_enabled": camera.detection_enabled
        })
        self.workers[camera.id] = worker
        await worker.start()

    async def stop_camera(self, camera_id: str):
        if camera_id in self.workers:
            await self.workers[camera_id].stop()
            del self.workers[camera_id]

    async def stop_all(self):
        for worker in self.workers.values():
            await worker.stop()
        self.workers.clear()

    async def iter_mjpeg_stream(self, camera_id: str):
        """Yields multipart MJPEG stream for browsers"""
        worker = self.workers.get(camera_id)
        while True:
            if worker and worker.latest_frame is not None:
                ret, jpeg = cv2.imencode('.jpg', worker.latest_frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
                if ret:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                    )
            else:
                # Standby placeholder frame
                placeholder = np.zeros((360, 640, 3), dtype=np.uint8)
                cv2.putText(placeholder, "CONNECTING...", (220, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (120, 120, 120), 2)
                ret, jpeg = cv2.imencode('.jpg', placeholder)
                if ret:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + jpeg.tobytes() + b"\r\n"
                    )
            await asyncio.sleep(0.1)


camera_manager = CameraManager()


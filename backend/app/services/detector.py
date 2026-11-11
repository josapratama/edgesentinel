import time
import math
import cv2
import numpy as np
from datetime import datetime


class DetectionResult:
    def __init__(self, label: str, confidence: float, bbox: tuple[int, int, int, int]):
        self.label = label
        self.confidence = confidence
        self.bbox = bbox  # (x1, y1, x2, y2)

    def to_dict(self):
        return {
            "label": self.label,
            "confidence": round(self.confidence, 2),
            "bbox": list(self.bbox)
        }


class EdgeDetector:
    """
    Lightweight Edge AI Vision Detector.
    Uses motion contour heuristics + adaptive tracking, capable of running
    efficiently on low-power devices like Raspberry Pi 4/5.
    """

    def __init__(self):
        self.classes = ["person", "car", "motorcycle", "package", "dog"]
        self.prev_frames = {}

    def detect(
        self,
        frame: np.ndarray,
        camera_id: str,
        threshold: float = 0.45,
        roi_polygon: list[list[float]] | None = None
    ) -> list[DetectionResult]:
        results: list[DetectionResult] = []
        try:
            h, w = frame.shape[:2]

            # 1. Motion Analysis via background subtraction
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            prev_gray = self.prev_frames.get(camera_id)
            self.prev_frames[camera_id] = gray

            if prev_gray is not None and prev_gray.shape == gray.shape:
                delta = cv2.absdiff(prev_gray, gray)
                thresh = cv2.threshold(delta, 25, 255, cv2.THRESH_BINARY)[1]
                thresh = cv2.dilate(thresh, None, iterations=2)
                contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for c in contours:
                    area = cv2.contourArea(c)
                    if area < 1500:  # Noise threshold
                        continue

                    x, y, cw, ch = cv2.boundingRect(c)
                    aspect_ratio = ch / float(cw)
                    conf = min(0.96, 0.55 + (area / (w * h)) * 1.5)

                    if conf < threshold:
                        continue

                    # Heuristic categorization based on shape ratio & area
                    if aspect_ratio > 1.4:
                        label = "person"
                    elif aspect_ratio < 0.8 and cw > 80:
                        label = "car"
                    elif 0.8 <= aspect_ratio <= 1.4 and area < 8000:
                        label = "package"
                    elif aspect_ratio < 1.1:
                        label = "motorcycle"
                    else:
                        label = "person"

                    # Check ROI Filter (Tripwire / Perimeter Zone)
                    center_x = x + cw / 2
                    center_y = y + ch / 2
                    if roi_polygon and len(roi_polygon) >= 3:
                        poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in roi_polygon], dtype=np.int32)
                        inside = cv2.pointPolygonTest(poly_pts, (float(center_x), float(center_y)), False) >= 0
                        if not inside:
                            # Ignored because object is outside the protected ROI zone
                            continue

                    results.append(DetectionResult(label, conf, (x, y, x + cw, y + ch)))
        except Exception as e:
            logger.error(f"Detector error on camera {camera_id}: {e}")

        return results

    def draw_overlay(
        self,
        frame: np.ndarray,
        detections: list[DetectionResult],
        camera_name: str,
        fps: float = 0.0,
        roi_polygon: list[list[float]] | None = None
    ) -> np.ndarray:
        out = frame.copy()
        h, w = out.shape[:2]

        # Draw ROI Polygon if configured
        if roi_polygon and len(roi_polygon) >= 3:
            poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in roi_polygon], dtype=np.int32)
            breached = len(detections) > 0
            roi_color = (0, 0, 230) if breached else (255, 200, 0)
            
            # Semi-transparent overlay fill
            overlay = out.copy()
            cv2.fillPoly(overlay, [poly_pts], (0, 0, 180) if breached else (180, 120, 0))
            cv2.addWeighted(overlay, 0.22, out, 0.78, 0, out)
            
            # Boundary line
            cv2.polylines(out, [poly_pts], isClosed=True, color=roi_color, thickness=2, lineType=cv2.LINE_AA)
            tag_pos = poly_pts[0]
            tag_text = "⚠️ ZONA SIAGA TEROBOS!" if breached else "🛡️ ZONA SIAGA (ROI)"
            cv2.putText(out, tag_text, (tag_pos[0] + 5, tag_pos[1] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, roi_color, 1, cv2.LINE_AA)

        # Header bar (CCTV HUD style)
        cv2.rectangle(out, (0, 0), (w, 36), (15, 23, 42), -1)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Camera info & Live badge
        cv2.circle(out, (20, 18), 6, (0, 0, 240), -1)  # Red recording dot
        cv2.putText(out, "LIVE", (32, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(out, f"|  {camera_name.upper()}", (75, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(out, f"{now_str}  |  {fps:.1f} FPS", (w - 240, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1, cv2.LINE_AA)

        # Draw detections
        color_map = {
            "person": (59, 130, 246),       # Blue / Amber
            "car": (16, 185, 129),          # Emerald Green
            "motorcycle": (245, 158, 11),   # Amber
            "package": (236, 72, 153),      # Pink / Purple
            "dog": (139, 92, 246),          # Violet
        }

        for det in detections:
            x1, y1, x2, y2 = det.bbox
            color = color_map.get(det.label, (0, 255, 200))

            # Bounding box with corner accents
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
            corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
            # Top-left corner
            cv2.line(out, (x1, y1), (x1 + corner_len, y1), color, 4)
            cv2.line(out, (x1, y1), (x1, y1 + corner_len), color, 4)
            # Top-right corner
            cv2.line(out, (x2, y1), (x2 - corner_len, y1), color, 4)
            cv2.line(out, (x2, y1), (x2, y1 + corner_len), color, 4)
            # Bottom-left corner
            cv2.line(out, (x1, y2), (x1 + corner_len, y2), color, 4)
            cv2.line(out, (x1, y2), (x1, y2 - corner_len), color, 4)
            # Bottom-right corner
            cv2.line(out, (x2, y2), (x2 - corner_len, y2), color, 4)
            cv2.line(out, (x2, y2), (x2, y2 - corner_len), color, 4)

            # Label badge
            label_text = f"{det.label.upper()} {int(det.confidence * 100)}%"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(out, (x1, max(38, y1 - th - 8)), (x1 + tw + 10, y1), color, -1)
            cv2.putText(
                out,
                label_text,
                (x1 + 5, max(38, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

        # Bottom watermark
        cv2.putText(out, "EdgeSentinel AI v1.0", (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 116, 139), 1, cv2.LINE_AA)

        return out


def generate_synthetic_cctv_frame(camera_name: str, frame_counter: int) -> np.ndarray:
    """
    Creates a high-fidelity synthetic CCTV stream for testing & demos
    when no physical RTSP hardware is connected.
    """
    w, h = 640, 360
    # Create dark surveillance scene
    frame = np.zeros((h, w, 3), dtype=np.uint8)

    # Gradient background (parking lot / gate scene style)
    for y in range(h):
        shade = int(25 + 30 * (y / h))
        frame[y, :] = [shade, shade + 3, shade + 6]

    # Floor grid / driveway lines
    cv2.line(frame, (80, h), (260, 160), (45, 55, 72), 2)
    cv2.line(frame, (560, h), (380, 160), (45, 55, 72), 2)
    cv2.line(frame, (260, 160), (380, 160), (55, 65, 81), 1)

    # Perimeter wall / building silhouette
    cv2.rectangle(frame, (0, 80), (220, 200), (30, 41, 59), -1)
    cv2.rectangle(frame, (420, 60), (w, 200), (30, 41, 59), -1)

    # Street lamp glow
    cv2.circle(frame, (320, 80), 40, (50, 70, 90), -1)
    cv2.circle(frame, (320, 80), 10, (180, 220, 255), -1)

    # Simulated Person walking horizontally across frame
    period = 180  # frames per traversal
    progress = (frame_counter % period) / period
    person_x = int(120 + 400 * progress)
    person_y = int(210 + 10 * math.sin(progress * math.pi * 6))

    # Draw walking person silhouette
    cv2.circle(frame, (person_x, person_y - 35), 8, (120, 140, 160), -1)  # Head
    cv2.rectangle(frame, (person_x - 10, person_y - 25), (person_x + 10, person_y + 10), (100, 120, 140), -1)  # Body
    leg_offset = int(6 * math.sin(frame_counter * 0.3))
    cv2.line(frame, (person_x - 5, person_y + 10), (person_x - 8 + leg_offset, person_y + 35), (90, 110, 130), 3)  # Leg L
    cv2.line(frame, (person_x + 5, person_y + 10), (person_x + 8 - leg_offset, person_y + 35), (90, 110, 130), 3)  # Leg R

    # Stationary delivery package near door
    cv2.rectangle(frame, (230, 210), (255, 230), (110, 85, 60), -1)
    cv2.putText(frame, "PKG", (232, 224), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (220, 220, 220), 1)

    # Add light camera sensor grain / noise
    noise = np.random.normal(0, 3, (h, w, 3)).astype(np.int16)
    noisy_frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return noisy_frame


detector = EdgeDetector()


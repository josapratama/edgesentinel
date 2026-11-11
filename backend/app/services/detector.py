import os
import time
import math
import logging
from pathlib import Path
from datetime import datetime
import cv2
import numpy as np

logger = logging.getLogger("edgesentinel.detector")

# COCO 80 classes subset for security
COCO_CLASSES = {
    0: "person",
    1: "bicycle",
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    15: "cat",
    16: "dog",
    24: "backpack",
    26: "handbag",
    28: "suitcase",
    39: "bottle",
}


class DetectionResult:
    def __init__(
        self,
        label: str,
        confidence: float,
        bbox: tuple[int, int, int, int],
        is_loitering: bool = False,
        loitering_seconds: float = 0.0
    ):
        self.label = label
        self.confidence = confidence
        self.bbox = bbox  # (x1, y1, x2, y2)
        self.is_loitering = is_loitering
        self.loitering_seconds = loitering_seconds

    def to_dict(self):
        return {
            "label": self.label,
            "confidence": round(self.confidence, 2),
            "bbox": list(self.bbox),
            "is_loitering": self.is_loitering,
            "loitering_seconds": round(self.loitering_seconds, 1)
        }


class EdgeDetector:
    """
    Hybrid Edge AI Vision Detector & Loitering Tracker.
    Supports YOLOv8 ONNX (CPU-optimized) with fallback to intelligent
    contour + morphology heuristics with false-alarm suppression.
    """

    def __init__(self):
        self.classes = ["person", "car", "motorcycle", "package", "dog"]
        self.prev_frames: dict[str, np.ndarray] = {}
        # Tracking history for loitering detection:
        # camera_id -> list of {"cx": float, "cy": float, "first_seen": float, "last_seen": float, "label": str}
        self.tracker_records: dict[str, list[dict]] = {}

        # Check for YOLOv8n ONNX model
        self.net = None
        self._init_yolo_model()

    def _init_yolo_model(self):
        possible_paths = [
            Path(__file__).resolve().parent.parent.parent / "data" / "models" / "yolov8n.onnx",
            Path("/app/data/models/yolov8n.onnx"),
            Path("data/models/yolov8n.onnx"),
        ]
        for p in possible_paths:
            if p.exists() and p.is_file():
                try:
                    logger.info(f"Loading YOLOv8n ONNX model from {p}...")
                    net = cv2.dnn.readNetFromONNX(str(p))
                    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                    self.net = net
                    logger.info("YOLOv8n ONNX model successfully loaded.")
                    break
                except Exception as e:
                    logger.warning(f"Failed to load ONNX model from {p}: {e}")

    def detect(
        self,
        frame: np.ndarray,
        camera_id: str,
        threshold: float = 0.45,
        roi_polygon: list[list[float]] | None = None,
        exclusion_zones: list[list[list[float]]] | None = None,
        tripwire_direction: str = "both"
    ) -> list[DetectionResult]:
        now = time.time()
        results: list[DetectionResult] = []

        # 1. Try YOLOv8 ONNX inference if model loaded
        if self.net is not None:
            results = self._detect_yolo(frame, threshold)
        else:
            # 2. Advanced Heuristic Detection with False-Alarm Suppression
            results = self._detect_heuristic(frame, camera_id, threshold)

        h, w = frame.shape[:2]

        # 3. Filter out Exclusion Zones (Ignored / Masked areas like trees, streets, clothesline)
        if exclusion_zones:
            valid_results: list[DetectionResult] = []
            for det in results:
                x1, y1, x2, y2 = det.bbox
                cx = (x1 + x2) / 2.0
                cy = (y1 + y2) / 2.0
                is_ignored = False
                for zone in exclusion_zones:
                    if len(zone) >= 3:
                        poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in zone], dtype=np.int32)
                        if cv2.pointPolygonTest(poly_pts, (float(cx), float(cy)), False) >= 0:
                            is_ignored = True
                            break
                    elif len(zone) == 2:
                        zx1 = int(min(zone[0][0], zone[1][0]) * w)
                        zx2 = int(max(zone[0][0], zone[1][0]) * w)
                        zy1 = int(min(zone[0][1], zone[1][1]) * h)
                        zy2 = int(max(zone[0][1], zone[1][1]) * h)
                        if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                            is_ignored = True
                            break
                if not is_ignored:
                    valid_results.append(det)
            results = valid_results

        # 4. Filter by ROI Polygon (Virtual Tripwire) & Direction
        filtered: list[DetectionResult] = []
        tracks = self.tracker_records.get(camera_id, [])

        for det in results:
            x1, y1, x2, y2 = det.bbox
            center_x = (x1 + x2) / 2.0
            center_y = (y1 + y2) / 2.0

            if roi_polygon and len(roi_polygon) >= 3:
                poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in roi_polygon], dtype=np.int32)
                inside = cv2.pointPolygonTest(poly_pts, (float(center_x), float(center_y)), False) >= 0
                if not inside:
                    continue

                # Directional check (Inbound vs Outbound)
                if tripwire_direction in ["inbound", "outbound"]:
                    # Find closest previous track
                    closest_track = None
                    min_dist = float("inf")
                    for t in tracks:
                        dist = math.hypot(center_x - t["cx"], center_y - t["cy"])
                        if dist < min_dist and dist < 120.0:
                            min_dist = dist
                            closest_track = t

                    if closest_track:
                        dy = center_y - closest_track["cy"]
                        # Inbound: moving downwards (+dy) into property
                        if tripwire_direction == "inbound" and dy < -4.0:
                            continue  # Moving outbound, ignore
                        # Outbound: moving upwards (-dy) leaving property
                        elif tripwire_direction == "outbound" and dy > 4.0:
                            continue  # Moving inbound, ignore

            filtered.append(det)

        # 5. Loitering Detection (Person dwell time > 15 seconds)
        filtered = self._update_loitering(camera_id, filtered, now)

        return filtered

    def _detect_heuristic(
        self,
        frame: np.ndarray,
        camera_id: str,
        threshold: float
    ) -> list[DetectionResult]:
        results = []
        h, w = frame.shape[:2]

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), 0)

        prev = self.prev_frames.get(camera_id)
        self.prev_frames[camera_id] = blurred

        if prev is None or prev.shape != blurred.shape:
            return results

        delta = cv2.absdiff(prev, blurred)
        thresh = cv2.threshold(delta, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if area < 1600:  # Minimum object size
                continue

            x, y, cw, ch = cv2.boundingRect(c)
            aspect_ratio = ch / float(cw)
            conf = min(0.95, 0.50 + (area / (w * h)) * 1.5)
            if conf < threshold:
                continue

            # False-Alarm suppression for ceiling light fixtures / fluorescent lamps:
            # - High in the frame (y < 0.28 * h)
            # - Very bright mean luminance (> 215)
            roi_gray = gray[y:y+ch, x:x+cw]
            if roi_gray.size > 0:
                mean_luma = np.mean(roi_gray)
                if y < int(0.28 * h) and (y + ch) < int(0.40 * h) and mean_luma > 210:
                    # Ignore ceiling lamp flicker / IR light bloom
                    continue

            # Classification
            if aspect_ratio > 1.35 and ch > 60:
                # Real person is grounded or spans vertical height
                label = "person"
            elif aspect_ratio < 0.8 and cw > 90:
                label = "car"
            elif 0.8 <= aspect_ratio <= 1.3 and area < 7000:
                label = "package"
            elif aspect_ratio < 1.1:
                label = "motorcycle"
            else:
                label = "person"

            results.append(DetectionResult(label, conf, (x, y, x + cw, y + ch)))

        return results

    def _detect_yolo(self, frame: np.ndarray, threshold: float) -> list[DetectionResult]:
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(frame, 1 / 255.0, (640, 640), swapRB=True, crop=False)
        self.net.setInput(blob)
        outputs = self.net.forward()

        # Parse YOLOv8 outputs: shape (1, 84, 8400)
        outputs = np.array(outputs[0]).transpose()  # (8400, 84)

        boxes = []
        confidences = []
        class_ids = []

        x_factor = w / 640.0
        y_factor = h / 640.0

        for row in outputs:
            classes_scores = row[4:]
            max_score_idx = np.argmax(classes_scores)
            score = classes_scores[max_score_idx]

            if score >= threshold:
                cx, cy, bw, bh = row[0], row[1], row[2], row[3]
                left = int((cx - 0.5 * bw) * x_factor)
                top = int((cy - 0.5 * bh) * y_factor)
                width = int(bw * x_factor)
                height = int(bh * y_factor)

                boxes.append([left, top, width, height])
                confidences.append(float(score))
                class_ids.append(max_score_idx)

        indices = cv2.dnn.NMSBoxes(boxes, confidences, threshold, 0.45)
        results = []
        if len(indices) > 0:
            for i in indices.flatten():
                bx, by, bw, bh = boxes[i]
                cid = class_ids[i]
                label = COCO_CLASSES.get(cid, "object")
                conf = confidences[i]
                x1 = max(0, bx)
                y1 = max(0, by)
                x2 = min(w, bx + bw)
                y2 = min(h, by + bh)
                results.append(DetectionResult(label, conf, (x1, y1, x2, y2)))

        return results

    def _update_loitering(
        self,
        camera_id: str,
        detections: list[DetectionResult],
        now: float
    ) -> list[DetectionResult]:
        """
        Tracks person positions over time to detect suspicious loitering (> 15 seconds).
        """
        records = self.tracker_records.setdefault(camera_id, [])

        # Match each person detection with existing tracks
        for det in detections:
            if det.label != "person":
                continue

            x1, y1, x2, y2 = det.bbox
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0

            matched = None
            for rec in records:
                dist = math.hypot(cx - rec["cx"], cy - rec["cy"])
                if dist < 60:  # Same person threshold in pixels
                    matched = rec
                    break

            if matched:
                matched["cx"] = cx
                matched["cy"] = cy
                matched["last_seen"] = now
                dwell = now - matched["first_seen"]
                if dwell >= 15.0:
                    det.is_loitering = True
                    det.loitering_seconds = dwell
            else:
                records.append({
                    "cx": cx,
                    "cy": cy,
                    "first_seen": now,
                    "last_seen": now,
                })

        # Purge stale tracks (not seen for > 8 seconds)
        self.tracker_records[camera_id] = [r for r in records if (now - r["last_seen"]) < 8.0]

        return detections

    def draw_overlay(
        self,
        frame: np.ndarray,
        detections: list[DetectionResult],
        camera_name: str,
        fps: float = 0.0,
        roi_polygon: list[list[float]] | None = None,
        exclusion_zones: list[list[list[float]]] | None = None
    ) -> np.ndarray:
        out = frame.copy()
        h, w = out.shape[:2]

        # Draw Exclusion Zones if configured (Subtle masked hatch overlay)
        if exclusion_zones:
            for zone in exclusion_zones:
                if len(zone) >= 3:
                    pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in zone], dtype=np.int32)
                    overlay = out.copy()
                    cv2.fillPoly(overlay, [pts], (20, 20, 60))
                    cv2.addWeighted(overlay, 0.40, out, 0.60, 0, out)
                    cv2.polylines(out, [pts], isClosed=True, color=(70, 70, 190), thickness=2, lineType=cv2.LINE_AA)
                    top_pt = pts[0]
                    cv2.putText(out, "AREA DIABAIKAN (MASK)", (int(top_pt[0]) + 4, max(48, int(top_pt[1]) - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (120, 120, 230), 1, cv2.LINE_AA)
                elif len(zone) == 2:
                    zx1 = int(min(zone[0][0], zone[1][0]) * w)
                    zx2 = int(max(zone[0][0], zone[1][0]) * w)
                    zy1 = int(min(zone[0][1], zone[1][1]) * h)
                    zy2 = int(max(zone[0][1], zone[1][1]) * h)
                    overlay = out.copy()
                    cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), (20, 20, 60), -1)
                    cv2.addWeighted(overlay, 0.40, out, 0.60, 0, out)
                    cv2.rectangle(out, (zx1, zy1), (zx2, zy2), (70, 70, 190), 2)
                    cv2.putText(out, "AREA DIABAIKAN (MASK)", (zx1 + 5, max(48, zy1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (120, 120, 230), 1, cv2.LINE_AA)

        # Draw ROI Polygon if configured
        if roi_polygon and len(roi_polygon) >= 3:
            poly_pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in roi_polygon], dtype=np.int32)
            breached = any(det.label in ["person", "car", "motorcycle"] for det in detections)
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
        cv2.circle(out, (20, 18), 6, (0, 0, 240), -1)
        cv2.putText(out, "LIVE", (32, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(out, f"|  {camera_name.upper()}", (75, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(out, f"{now_str}  |  {fps:.1f} FPS", (w - 240, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (148, 163, 184), 1, cv2.LINE_AA)

        # Draw detections
        color_map = {
            "person": (59, 130, 246),
            "car": (16, 185, 129),
            "motorcycle": (245, 158, 11),
            "package": (236, 72, 153),
            "dog": (139, 92, 246),
        }

        for det in detections:
            x1, y1, x2, y2 = det.bbox
            color = (0, 0, 235) if det.is_loitering else color_map.get(det.label, (0, 255, 200))

            # Bounding box with corner accents
            cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
            corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
            cv2.line(out, (x1, y1), (x1 + corner_len, y1), color, 4)
            cv2.line(out, (x1, y1), (x1, y1 + corner_len), color, 4)
            cv2.line(out, (x2, y1), (x2 - corner_len, y1), color, 4)
            cv2.line(out, (x2, y1), (x2, y1 + corner_len), color, 4)
            cv2.line(out, (x1, y2), (x1 + corner_len, y2), color, 4)
            cv2.line(out, (x1, y2), (x1, y2 - corner_len), color, 4)
            cv2.line(out, (x2, y2), (x2 - corner_len, y2), color, 4)
            cv2.line(out, (x2, y2), (x2, y2 - corner_len), color, 4)

            # Label badge (highlight Loitering in red)
            if det.is_loitering:
                label_text = f"🚨 LOITERING {int(det.loitering_seconds)}s ({int(det.confidence * 100)}%)"
            else:
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
        cv2.putText(out, "EdgeSentinel AI v1.2", (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 116, 139), 1, cv2.LINE_AA)

        return out


def generate_synthetic_cctv_frame(camera_name: str, frame_counter: int) -> np.ndarray:
    w, h = 640, 360
    frame = np.zeros((h, w, 3), dtype=np.uint8)

    for y in range(h):
        shade = int(25 + 30 * (y / h))
        frame[y, :] = [shade, shade + 3, shade + 6]

    cv2.line(frame, (80, h), (260, 160), (45, 55, 72), 2)
    cv2.line(frame, (560, h), (380, 160), (45, 55, 72), 2)
    cv2.line(frame, (260, 160), (380, 160), (55, 65, 81), 1)

    cv2.rectangle(frame, (0, 80), (220, 200), (30, 41, 59), -1)
    cv2.rectangle(frame, (420, 60), (w, 200), (30, 41, 59), -1)

    cv2.circle(frame, (320, 80), 40, (50, 70, 90), -1)
    cv2.circle(frame, (320, 80), 10, (180, 220, 255), -1)

    period = 180
    progress = (frame_counter % period) / period
    person_x = int(120 + 400 * progress)
    person_y = int(210 + 10 * math.sin(progress * math.pi * 6))

    cv2.circle(frame, (person_x, person_y - 35), 8, (120, 140, 160), -1)
    cv2.rectangle(frame, (person_x - 10, person_y - 25), (person_x + 10, person_y + 10), (100, 120, 140), -1)
    leg_offset = int(6 * math.sin(frame_counter * 0.3))
    cv2.line(frame, (person_x - 5, person_y + 10), (person_x - 8 + leg_offset, person_y + 35), (90, 110, 130), 3)
    cv2.line(frame, (person_x + 5, person_y + 10), (person_x + 8 - leg_offset, person_y + 35), (90, 110, 130), 3)

    cv2.rectangle(frame, (230, 210), (255, 230), (110, 85, 60), -1)
    cv2.putText(frame, "PKG", (232, 224), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (220, 220, 220), 1)

    noise = np.random.normal(0, 3, (h, w, 3)).astype(np.int16)
    noisy_frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return noisy_frame


detector = EdgeDetector()

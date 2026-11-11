import os
import cv2
import json
import logging
import numpy as np
from pathlib import Path
from app.core.config import SNAPSHOTS_DIR

logger = logging.getLogger("edgesentinel.face")


class FaceRecognitionService:
    def __init__(self):
        self.cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = None
        try:
            if os.path.exists(self.cascade_path):
                self.face_cascade = cv2.CascadeClassifier(self.cascade_path)
                logger.info("OpenCV Face Cascade loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load face cascade: {e}")

    def extract_face(self, image: np.ndarray) -> np.ndarray | None:
        """Finds largest face in image crop and returns 64x64 normalized grayscale face."""
        if self.face_cascade is None or image is None or image.size == 0:
            return None

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=4, minSize=(30, 30))

        if len(faces) == 0:
            return None

        # Pick largest face
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        face_crop = gray[y:y+h, x:x+w]

        # Normalize size & contrast
        resized = cv2.resize(face_crop, (64, 64), interpolation=cv2.INTER_AREA)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        norm = clahe.apply(resized)
        return norm

    def compute_descriptor(self, face_norm: np.ndarray) -> list[float]:
        """Extracts spatial gradient/intensity histogram descriptor (64 floats)."""
        # Block-based mean & variance in 4x4 grid (16 blocks x 4 stats = 64 features)
        features = []
        h, w = face_norm.shape
        bh, bw = h // 4, w // 4
        for r in range(4):
            for c in range(4):
                block = face_norm[r*bh:(r+1)*bh, c*bw:(c+1)*bw]
                features.append(float(np.mean(block) / 255.0))
                features.append(float(np.std(block) / 128.0))
                # Horizontal & vertical gradient magnitudes
                gx = cv2.Sobel(block, cv2.CV_32F, 1, 0, ksize=3)
                gy = cv2.Sobel(block, cv2.CV_32F, 0, 1, ksize=3)
                features.append(float(np.mean(np.abs(gx)) / 255.0))
                features.append(float(np.mean(np.abs(gy)) / 255.0))

        # Normalize descriptor vector to unit norm
        vec = np.array(features, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def compare_faces(self, desc1: list[float], desc2: list[float]) -> float:
        """Computes cosine similarity between 2 face descriptors [0.0 - 1.0]."""
        v1 = np.array(desc1, dtype=np.float32)
        v2 = np.array(desc2, dtype=np.float32)
        dot = float(np.dot(v1, v2))
        return max(0.0, min(1.0, dot))

    def identify_person_face(
        self,
        frame: np.ndarray,
        person_bbox: tuple[int, int, int, int],
        known_faces_list: list[dict]
    ) -> tuple[str | None, bool]:
        """
        Takes full frame and person bbox (x1, y1, x2, y2).
        Returns (familiar_name, is_stranger).
        """
        x1, y1, x2, y2 = person_bbox
        # Head is roughly the upper 40% of the person bounding box
        head_y2 = y1 + int((y2 - y1) * 0.40)
        h, w = frame.shape[:2]
        crop_y1 = max(0, y1)
        crop_y2 = min(h, head_y2)
        crop_x1 = max(0, x1)
        crop_x2 = min(w, x2)

        if (crop_y2 - crop_y1) < 20 or (crop_x2 - crop_x1) < 20:
            return None, False

        head_crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
        face_norm = self.extract_face(head_crop)
        if face_norm is None:
            return None, False

        candidate_desc = self.compute_descriptor(face_norm)

        best_match = None
        best_sim = 0.0

        for kf in known_faces_list:
            known_desc = kf.get("features", [])
            sim = self.compare_faces(candidate_desc, known_desc)
            if sim > best_sim:
                best_sim = sim
                best_match = kf.get("name")

        # Threshold 0.76 for high confidence match
        if best_sim >= 0.76 and best_match:
            logger.info(f"Face recognized: {best_match} (similarity: {best_sim:.2f})")
            return best_match, False

        logger.info(f"Unrecognized face / Stranger detected (best match: {best_sim:.2f})")
        return None, True


face_service = FaceRecognitionService()

"""Face detection and comparison service.

Uses OpenCV Haar cascades or MediaPipe (if installed) for face detection.
Face comparison uses histogram correlation as a baseline.
A real face embedding model (FaceNet, ArcFace) would be used if configured.
"""

import numpy as np
from PIL import Image


def detect_face(img_array: np.ndarray) -> dict:
    try:
        import cv2
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        cascade = cv2.CascadeClassifier(cascade_path)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        face_detected = len(faces) > 0
        face_count = len(faces)

        if face_detected:
            quality = _assess_face_quality(img_array, faces[0])
        else:
            quality = 0

        status = "DETECTED" if face_detected else "NO_FACE"

        return {
            "face_detected": face_detected,
            "face_count": face_count,
            "quality": quality,
            "status": status,
        }
    except ImportError:
        return {
            "face_detected": False,
            "face_count": 0,
            "quality": 0,
            "status": "UNAVAILABLE",
            "error": "OpenCV not installed on backend",
        }


def compare_faces(live_array: np.ndarray, ref_array: np.ndarray) -> float:
    """Compare two face images using histogram correlation.

    Returns similarity score between 0 and 1.
    A real face embedding model would give much better results.
    """
    try:
        import cv2
        live_hsv = cv2.cvtColor(live_array, cv2.COLOR_RGB2HSV)
        ref_hsv = cv2.cvtColor(ref_array, cv2.COLOR_RGB2HSV)

        h_bins, s_bins = 50, 60
        hist_size = [h_bins, s_bins]
        ranges = [0, 180, 0, 256]
        channels = [0, 1]

        live_hist = cv2.calcHist([live_hsv], channels, None, hist_size, ranges)
        ref_hist = cv2.calcHist([ref_hsv], channels, None, hist_size, ranges)

        cv2.normalize(live_hist, live_hist, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(ref_hist, ref_hist, 0, 1, cv2.NORM_MINMAX)

        similarity = cv2.compareHist(live_hist, ref_hist, cv2.HISTCMP_CORREL)
        return max(0.0, min(1.0, float(similarity)))
    except ImportError:
        return 0.0


def _assess_face_quality(img_array: np.ndarray, face_box) -> int:
    """Assess face image quality based on size and sharpness."""
    x, y, w, h = face_box
    face = img_array[y:y+h, x:x+w]
    if face.size == 0:
        return 0
    gray = np.mean(face, axis=2)
    variance = float(np.var(gray))
    size_score = min(100, (w * h) / 100)
    sharpness_score = min(100, variance / 5)
    return int((size_score + sharpness_score) / 2)

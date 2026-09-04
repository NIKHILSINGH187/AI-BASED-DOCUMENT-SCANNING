"""Document forensics service.

Performs Error Level Analysis (ELA), compression anomaly detection,
pixel inconsistency checks, and suspicious region identification.
A CNN forensic model would be used if configured.
"""

import io
import numpy as np
from PIL import Image, ImageChops


def analyze_forensics(image_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(img)

    ela_result = _error_level_analysis(image_bytes)
    compression_anomaly = _detect_compression_anomaly(img_array)
    pixel_inconsistency = _detect_pixel_inconsistency(img_array)
    copy_paste_anomaly = _detect_copy_paste(img_array)
    image_quality = _assess_quality(img_array)
    suspicious_regions = _find_suspicious_regions(img_array, ela_result)

    # Tampering probability: weighted combination of signals
    tampering_signals = 0
    if ela_result["ela_anomaly"]:
        tampering_signals += 30
    if compression_anomaly:
        tampering_signals += 20
    if pixel_inconsistency:
        tampering_signals += 20
    if copy_paste_anomaly:
        tampering_signals += 30

    tampering_probability = min(100, tampering_signals)

    return {
        "image_quality": image_quality,
        "compression_anomaly": compression_anomaly,
        "pixel_inconsistency": pixel_inconsistency,
        "copy_paste_anomaly": copy_paste_anomaly,
        "ela_result": ela_result,
        "tampering_probability": tampering_probability,
        "suspicious_regions": suspicious_regions,
        "cnn_authenticity_score": 0,
        "status": "COMPLETED",
        "details": {
            "model": "ELA + Heuristic (CNN model not configured)",
            "ela_anomaly": ela_result["ela_anomaly"],
            "ela_mean_diff": ela_result["mean_diff"],
        },
    }


def _error_level_analysis(image_bytes: bytes) -> dict:
    """ELA: re-save at known JPEG quality and compare difference."""
    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)
    resaved = Image.open(buffer).convert("RGB")

    diff = ImageChops.difference(original, resaved)
    diff_array = np.array(diff)
    mean_diff = float(np.mean(diff_array))

    # High difference in specific regions suggests tampering
    std_diff = float(np.std(diff_array))
    ela_anomaly = std_diff > 15 or mean_diff > 10

    return {
        "ela_anomaly": ela_anomaly,
        "mean_diff": round(mean_diff, 2),
        "std_diff": round(std_diff, 2),
    }


def _detect_compression_anomaly(img_array: np.ndarray) -> bool:
    """Detect unusual compression patterns by checking block-based variance."""
    if img_array.shape[0] < 16 or img_array.shape[1] < 16:
        return False
    gray = np.mean(img_array, axis=2)
    blocks = []
    for i in range(0, gray.shape[0] - 8, 8):
        for j in range(0, gray.shape[1] - 8, 8):
            block = gray[i:i+8, j:j+8]
            blocks.append(np.std(block))
    if not blocks:
        return False
    block_stds = np.array(blocks)
    # If variance of block stds is very high, some regions may have been re-compressed
    return float(np.std(block_stds)) > 25


def _detect_pixel_inconsistency(img_array: np.ndarray) -> bool:
    """Check for inconsistent noise patterns across image regions."""
    gray = np.mean(img_array, axis=2)
    h, w = gray.shape
    if h < 20 or w < 20:
        return False
    quadrants = [
        gray[:h//2, :w//2],
        gray[:h//2, w//2:],
        gray[h//2:, :w//2],
        gray[h//2:, w//2:],
    ]
    noise_levels = [np.std(q - np.mean(q)) for q in quadrants]
    if max(noise_levels) == 0:
        return False
    ratio = max(noise_levels) / min(noise_levels)
    return ratio > 2.0


def _detect_copy_paste(img_array: np.ndarray) -> bool:
    """Simple copy-paste detection: look for near-identical blocks."""
    gray = np.mean(img_array, axis=2)
    h, w = gray.shape
    if h < 32 or w < 32:
        return False
    block_size = 16
    blocks = []
    for i in range(0, h - block_size, block_size):
        for j in range(0, w - block_size, block_size):
            block = gray[i:i+block_size, j:j+block_size]
            blocks.append((i, j, block))

    for a in range(len(blocks)):
        for b in range(a + 1, len(blocks)):
            if abs(blocks[a][0] - blocks[b][0]) < block_size and abs(blocks[a][1] - blocks[b][1]) < block_size:
                continue
            diff = np.mean(np.abs(blocks[a][2] - blocks[b][2]))
            if diff < 1.5:
                return True
    return False


def _assess_quality(img_array: np.ndarray) -> int:
    """Assess image quality based on sharpness (Laplacian variance)."""
    gray = np.mean(img_array, axis=2)
    laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
    from scipy.signal import convolve2d
    try:
        result = convolve2d(gray, laplacian, mode="same")
        variance = float(np.var(result))
        return min(100, int(variance / 10))
    except ImportError:
        # Fallback if scipy not available
        return 50


def _find_suspicious_regions(img_array: np.ndarray, ela_result: dict) -> list:
    """Identify regions with high ELA difference."""
    if not ela_result.get("ela_anomaly"):
        return []
    return [
        {
            "region": "full_image",
            "reason": "ELA variance above threshold",
            "ela_mean_diff": ela_result.get("mean_diff", 0),
        }
    ]

"""Biometric capture and matching endpoints."""

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
import numpy as np

from app.services.face_service import detect_face, compare_faces

router = APIRouter()


@router.post("/capture")
async def biometric_capture(
    file: UploadFile = File(...),
    case_id: str = Form(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(contents))
        img_array = np.array(img.convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    face_result = detect_face(img_array)

    return {
        "case_id": case_id,
        "face_detected": face_result["face_detected"],
        "face_count": face_result["face_count"],
        "image_width": img.width,
        "image_height": img.height,
        "quality": face_result["quality"],
        "status": face_result["status"],
    }


@router.post("/match")
async def biometric_match(
    live_image: UploadFile = File(...),
    reference_image: UploadFile = File(None),
    case_id: str = Form(...),
):
    live_contents = await live_image.read()
    if len(live_contents) == 0:
        raise HTTPException(status_code=400, detail="Empty live image")

    try:
        live_img = Image.open(io.BytesIO(live_contents))
        live_array = np.array(live_img.convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid live image")

    live_face = detect_face(live_array)

    if reference_image is None or not reference_image.filename:
        return {
            "case_id": case_id,
            "match_status": "INCONCLUSIVE",
            "similarity_score": 0,
            "details": {
                "note": "No reference face available. Live face captured and processed.",
                "live_face_detected": live_face["face_detected"],
                "reference_available": False,
            },
        }

    ref_contents = await reference_image.read()
    try:
        ref_img = Image.open(io.BytesIO(ref_contents))
        ref_array = np.array(ref_img.convert("RGB"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid reference image")

    ref_face = detect_face(ref_array)

    if not live_face["face_detected"] or not ref_face["face_detected"]:
        return {
            "case_id": case_id,
            "match_status": "INCONCLUSIVE",
            "similarity_score": 0,
            "details": {
                "note": "Face not detected in one or both images.",
                "live_face_detected": live_face["face_detected"],
                "reference_face_detected": ref_face["face_detected"],
            },
        }

    similarity = compare_faces(live_array, ref_array)

    match_status = "MATCH" if similarity > 0.6 else "NO MATCH"

    return {
        "case_id": case_id,
        "match_status": match_status,
        "similarity_score": round(similarity, 4),
        "details": {
            "live_face_detected": True,
            "reference_face_detected": True,
            "similarity": round(similarity, 4),
        },
    }

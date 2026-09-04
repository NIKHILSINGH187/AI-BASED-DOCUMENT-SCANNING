"""Document upload, OCR, and forensics endpoints."""

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
import numpy as np

from app.services.ocr_service import run_ocr
from app.services.forensics_service import analyze_forensics

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    case_id: str = Form(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(contents))
        width, height = img.size
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    return {
        "case_id": case_id,
        "document_type": document_type,
        "file_name": file.filename,
        "file_size": len(contents),
        "mime_type": file.content_type,
        "image_width": width,
        "image_height": height,
        "status": "UPLOADED",
    }


@router.post("/ocr")
async def ocr_document(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = run_ocr(contents)
        return result
    except Exception as e:
        return {
            "extracted_name": None,
            "extracted_document_number": None,
            "extracted_dob": None,
            "extracted_gender": None,
            "extracted_address": None,
            "extracted_expiry": None,
            "extracted_document_type": None,
            "ocr_confidence": 0,
            "raw_text": "",
            "status": "FAILED",
            "error": str(e),
        }


@router.post("/forensics")
async def forensics_document(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        result = analyze_forensics(contents)
        return result
    except Exception as e:
        return {
            "image_quality": 0,
            "compression_anomaly": False,
            "pixel_inconsistency": False,
            "copy_paste_anomaly": False,
            "ela_result": None,
            "tampering_probability": 0,
            "suspicious_regions": [],
            "cnn_authenticity_score": 0,
            "status": "FAILED",
            "details": {"error": str(e)},
        }

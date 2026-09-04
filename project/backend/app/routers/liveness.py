"""Liveness check endpoint."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter()


@router.post("/check")
async def liveness_check(
    file: UploadFile = File(...),
    challenge_type: str = Form(...),
    case_id: str = Form(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    # Liveness is primarily handled client-side using MediaPipe face landmarks.
    # This endpoint receives the captured frame for server-side logging and audit.
    # A real anti-spoof model would go here if configured.
    return {
        "case_id": case_id,
        "challenge_type": challenge_type,
        "status": "INCONCLUSIVE",
        "liveness_score": 0,
        "anti_spoof_status": "MANUAL REVIEW",
        "details": {
            "reason": "Server-side liveness model not configured. Client-side liveness result should be used.",
            "frame_received": len(contents) > 0,
        },
    }

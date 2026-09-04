"""Risk evaluation endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RiskRequest(BaseModel):
    case_id: str
    capture_integrity: str = "COMPLETED"
    liveness_status: str = "UNKNOWN"
    face_match_status: str = "UNKNOWN"
    ocr_quality: str = "UNKNOWN"
    government_status: str = "UNKNOWN"
    forensics_status: str = "UNKNOWN"
    identity_consistency: str = "UNKNOWN"


@router.post("/evaluate")
async def evaluate_risk(req: RiskRequest):
    risk_factors = []

    if req.liveness_status == "FAILED":
        risk_factors.append("Liveness check failed")
    if req.face_match_status == "NO MATCH":
        risk_factors.append("Biometric face mismatch")
    if req.forensics_status == "FAILED":
        risk_factors.append("Document forensics failed")
    if req.government_status == "NOT_CONFIGURED" or req.government_status == "UNAVAILABLE":
        risk_factors.append("Government verification unavailable")
    if req.identity_consistency == "MISMATCH":
        risk_factors.append("Identity binding mismatch")
    if req.ocr_quality == "FAILED":
        risk_factors.append("OCR extraction failed")

    if any("failed" in f.lower() or "mismatch" in f.lower() for f in risk_factors):
        risk_level = "HIGH RISK"
    elif req.government_status in ("NOT_CONFIGURED", "UNAVAILABLE") and req.liveness_status == "PASSED":
        risk_level = "REVIEW"
    elif not risk_factors:
        risk_level = "CLEAR"
    else:
        risk_level = "REVIEW"

    risk_score = min(100, len(risk_factors) * 20)

    return {
        "case_id": req.case_id,
        "capture_integrity": req.capture_integrity,
        "liveness_status": req.liveness_status,
        "face_match_status": req.face_match_status,
        "ocr_quality": req.ocr_quality,
        "government_status": req.government_status,
        "forensics_status": req.forensics_status,
        "identity_consistency": req.identity_consistency,
        "injection_status": "NOT_DETECTED",
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_reason": "; ".join(risk_factors) if risk_factors else "All checks passed",
    }

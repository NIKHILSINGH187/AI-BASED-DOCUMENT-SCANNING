"""Identity binding endpoint."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class BindRequest(BaseModel):
    case_id: str
    ocr_data: dict | None = None
    government_data: dict | None = None
    biometric_data: dict | None = None
    liveness_data: dict | None = None


@router.post("/bind")
async def identity_bind(req: BindRequest):
    fields = ["Name", "DOB", "Document Number", "Document Type", "Face"]
    matrix = []

    for field in fields:
        ocr_val = (req.ocr_data or {}).get(field.lower().replace(" ", "_"))
        gov_val = (req.government_data or {}).get(field.lower().replace(" ", "_"))
        bio_val = (req.biometric_data or {}).get(field.lower().replace(" ", "_"))

        if gov_val is not None:
            result = "VERIFIED" if ocr_val == gov_val else "MISMATCH"
        elif ocr_val is not None:
            result = "UNVERIFIED"
        else:
            result = "INCONCLUSIVE"

        matrix.append({
            "field": field,
            "ocr": ocr_val,
            "government": gov_val,
            "biometric": bio_val,
            "result": result,
        })

    has_verified = any(r["result"] == "VERIFIED" for r in matrix)
    has_mismatch = any(r["result"] == "MISMATCH" for r in matrix)

    if has_mismatch:
        identity_status = "MISMATCH"
    elif has_verified:
        identity_status = "VERIFIED"
    else:
        identity_status = "UNVERIFIED"

    return {
        "case_id": req.case_id,
        "binding_matrix": matrix,
        "identity_status": identity_status,
    }

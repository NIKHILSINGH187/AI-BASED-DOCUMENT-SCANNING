"""Cases, evidence, and audit trail endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_cases():
    # In production, this queries Supabase. Returns stub for documentation.
    return {"cases": [], "note": "Connect to Supabase for case data."}


@router.get("/{case_id}")
async def get_case(case_id: str):
    return {"case_id": case_id, "note": "Connect to Supabase for case details."}


@router.get("/evidence/{case_id}")
async def get_evidence(case_id: str):
    return {"case_id": case_id, "evidence": [], "note": "Connect to Supabase for evidence."}


@router.get("/audit/{case_id}")
async def get_audit(case_id: str):
    return {"case_id": case_id, "audit_logs": [], "note": "Connect to Supabase for audit logs."}

"""Government verification endpoint — backend only, credentials never exposed to frontend."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.services.government_service import GovernmentVerificationService

router = APIRouter()


class VerifyRequest(BaseModel):
    document_type: str
    extracted_name: str | None = None
    extracted_document_number: str | None = None
    extracted_dob: str | None = None


@router.post("/verify")
async def government_verify(req: VerifyRequest):
    if not settings.government_configured:
        service = GovernmentVerificationService()
        return service.not_configured(req.document_type)

    service = GovernmentVerificationService(
        base_url=settings.GOVERNMENT_API_BASE_URL,
        api_key=settings.GOVERNMENT_API_KEY,
        client_id=settings.GOVERNMENT_CLIENT_ID,
        client_secret=settings.GOVERNMENT_CLIENT_SECRET,
    )
    return await service.verify(req.document_type, req.extracted_name, req.extracted_document_number, req.extracted_dob)

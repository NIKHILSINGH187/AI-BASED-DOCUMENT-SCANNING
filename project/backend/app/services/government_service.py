"""Government Verification Service — backend only.

Uses authorized provider adapters (AadhaarVerificationAdapter, PANVerificationAdapter).
Private credentials stay on the backend and are never exposed to the frontend.

Environment variables (backend-only, NOT VITE_):
  GOVERNMENT_API_BASE_URL
  GOVERNMENT_API_KEY
  GOVERNMENT_CLIENT_ID
  GOVERNMENT_CLIENT_SECRET
"""

import httpx


class GovernmentVerificationService:
    def __init__(
        self,
        base_url: str = "",
        api_key: str = "",
        client_id: str = "",
        client_secret: str = "",
    ):
        self.base_url = base_url
        self.api_key = api_key
        self.client_id = client_id
        self.client_secret = client_secret

    def not_configured(self, document_type: str) -> dict:
        methods = {
            "Aadhaar": "OTP / Demographic / Biometric / e-KYC",
            "PAN": "Name + DOB + PAN verification",
        }
        method = methods.get(document_type, "Document verification")

        return {
            "document_type": document_type,
            "verification_method": method,
            "status": "NOT_CONFIGURED",
            "verified_name": None,
            "verified_document_number": None,
            "verified_dob": None,
            "details": {
                "configured": False,
                "message": f"Government verification not configured. {document_type}VerificationAdapter requires authorized API credentials on the backend.",
                "adapter": f"{document_type}VerificationAdapter",
                "required_backend_env_vars": [
                    "GOVERNMENT_API_BASE_URL",
                    "GOVERNMENT_API_KEY",
                    "GOVERNMENT_CLIENT_ID",
                    "GOVERNMENT_CLIENT_SECRET",
                ],
            },
        }

    async def verify(
        self,
        document_type: str,
        name: str | None,
        document_number: str | None,
        dob: str | None,
    ) -> dict:
        adapter = self._get_adapter(document_type)
        if adapter is None:
            return {
                "document_type": document_type,
                "verification_method": "N/A",
                "status": "UNAVAILABLE",
                "verified_name": None,
                "verified_document_number": None,
                "verified_dob": None,
                "details": {
                    "configured": True,
                    "message": f"No adapter available for document type: {document_type}",
                },
            }

        try:
            return await adapter.verify(name, document_number, dob)
        except Exception as e:
            return {
                "document_type": document_type,
                "verification_method": "API",
                "status": "UNAVAILABLE",
                "verified_name": None,
                "verified_document_number": None,
                "verified_dob": None,
                "details": {
                    "configured": True,
                    "message": f"Government API request failed: {str(e)}",
                    "endpoint": self.base_url,
                },
            }

    def _get_adapter(self, document_type: str):
        if document_type == "Aadhaar":
            return AadhaarVerificationAdapter(
                self.base_url, self.api_key, self.client_id, self.client_secret
            )
        elif document_type == "PAN":
            return PANVerificationAdapter(
                self.base_url, self.api_key, self.client_id, self.client_secret
            )
        return None


class BaseAdapter:
    def __init__(self, base_url: str, api_key: str, client_id: str, client_secret: str):
        self.base_url = base_url
        self.api_key = api_key
        self.client_id = client_id
        self.client_secret = client_secret

    async def _make_request(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "X-Client-Id": self.client_id,
            "X-Client-Secret": self.client_secret,
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()


class AadhaarVerificationAdapter(BaseAdapter):
    async def verify(self, name: str | None, document_number: str | None, dob: str | None) -> dict:
        payload = {
            "aadhaar_number": document_number,
            "name": name,
            "dob": dob,
            "verification_mode": "demographic",
        }
        result = await self._make_request("/aadhaar/verify", payload)
        return {
            "document_type": "Aadhaar",
            "verification_method": "OTP / Demographic / Biometric / e-KYC",
            "status": "VERIFIED" if result.get("verified") else "NO MATCH",
            "verified_name": result.get("name"),
            "verified_document_number": result.get("aadhaar_number"),
            "verified_dob": result.get("dob"),
            "details": {
                "configured": True,
                "adapter": "AadhaarVerificationAdapter",
                "api_response": result,
            },
        }


class PANVerificationAdapter(BaseAdapter):
    async def verify(self, name: str | None, document_number: str | None, dob: str | None) -> dict:
        payload = {
            "pan_number": document_number,
            "name": name,
            "dob": dob,
        }
        result = await self._make_request("/pan/verify", payload)
        return {
            "document_type": "PAN",
            "verification_method": "Name + DOB + PAN verification",
            "status": "VERIFIED" if result.get("verified") else "NO MATCH",
            "verified_name": result.get("name"),
            "verified_document_number": result.get("pan_number"),
            "verified_dob": result.get("dob"),
            "details": {
                "configured": True,
                "adapter": "PANVerificationAdapter",
                "api_response": result,
            },
        }

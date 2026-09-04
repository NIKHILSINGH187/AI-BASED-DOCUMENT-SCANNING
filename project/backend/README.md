# IDShield AI Backend

FastAPI backend for the AI-Based Fake Identity & Document Screening System.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Environment Variables (backend-only, never exposed to frontend)

```
GOVERNMENT_API_BASE_URL=
GOVERNMENT_API_KEY=
GOVERNMENT_CLIENT_ID=
GOVERNMENT_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/document/upload | Upload document image |
| POST | /api/document/ocr | OCR extraction from document |
| POST | /api/document/forensics | Document forensic analysis (ELA, compression, pixel) |
| POST | /api/biometric/capture | Process captured face image |
| POST | /api/biometric/match | Compare live face with reference |
| POST | /api/liveness/check | Server-side liveness logging |
| POST | /api/government/verify | Government verification via authorized adapters |
| POST | /api/identity/bind | Identity binding across sources |
| POST | /api/risk/evaluate | Risk assessment engine |
| GET | /api/cases | List cases |
| GET | /api/cases/{case_id} | Get case details |
| GET | /api/evidence/{case_id} | Get evidence for case |
| GET | /api/audit/{case_id} | Get audit trail |
| GET | /api/health | Health check |

## Government Verification

Government credentials are **backend-only**. They are never exposed to the frontend.
If credentials are missing, the API returns `NOT_CONFIGURED` — never `VERIFIED`.

Adapters:
- `AadhaarVerificationAdapter` — UIDAI demographic/e-KYC verification
- `PANVerificationAdapter` — Income Tax PAN verification

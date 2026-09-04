# IDShield AI

**AI-Based Fake Identity & Document Screening System**

IDShield AI is a full-stack identity verification platform that combines document analysis, biometric liveness detection, forensic tampering checks, and government database cross-referencing into a single screening workflow. Every verification runs through a multi-layer pipeline and produces a risk-scored, audit-traced case record.

---

## Features

### Verification Pipeline
Each verification case passes through ten sequential stages:

1. **Document Intake** — Upload a photo or scan of a government-issued ID
2. **Camera Initialization** — Browser camera permission and stream setup
3. **Face Detection** — Real-time face landmark detection via MediaPipe
4. **Liveness Processing** — Anti-spoofing challenge (virtual camera / replay detection)
5. **OCR Processing** — Extract name, document number, DOB, gender, address, expiry via Tesseract.js
6. **Forensics Processing** — Compression anomaly, pixel inconsistency, copy-paste detection, ELA, tampering probability
7. **Biometric Matching** — Live face capture compared against reference image
8. **Government Verification** — Cross-reference extracted fields against government records (Aadhaar, PAN, etc.)
9. **Identity Binding** — Cross-source matrix reconciling OCR, government, and biometric data
10. **Risk Assessment** — Weighted scoring across all layers producing a final risk level

### Supported Document Types
- Aadhaar (UIDAI)
- PAN (Income Tax Department)
- Voter ID (Election Commission EPIC)
- Passport (Indian Passport)
- Driving Licence (State Transport)
- Other Government ID

### Dashboard & Analytics
- KPI cards: total verifications, government-verified, biometric passed, flagged, manual review, unverified
- Verification volume trend chart
- Risk distribution pie chart
- Document type breakdown
- Recent cases table with quick navigation

### Case Management
- Full case list with filtering
- Detailed case view showing every pipeline result, evidence artifacts, and audit trail
- Evidence vault: document image, face capture, OCR text, forensic report, government response, liveness result

### Authentication & Security
- Email/password authentication via Supabase Auth
- Row Level Security (RLS) on every database table — users can only access their own cases
- Per-case consent records for biometric processing
- Full audit log per case

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Face Detection | MediaPipe Tasks Vision |
| OCR | Tesseract.js |
| Backend / Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Edge Functions | Supabase Edge Functions (Deno) |
| ML Services (optional) | Python FastAPI backend |

---

## Project Structure

```
├── src/
│   ├── components/        # UI components (CameraCapture, LivenessCheck, DocumentUpload, etc.)
│   ├── pages/             # Route pages (Dashboard, NewVerification, Cases, CaseDetails, Reports, etc.)
│   ├── lib/               # Business logic (OCR, forensics, risk engine, identity binding, gov, API, auth)
│   └── types.ts           # Shared TypeScript interfaces
├── supabase/
│   ├── functions/         # Edge functions (government-verify)
│   ├── migrations/        # Database schema and RLS policies
│   └── config.toml        # Supabase project configuration
├── backend/               # Optional Python FastAPI services (face, forensics, OCR, government)
└── package.json
```

---

## Database Schema

The system uses 13 interconnected tables, all owner-scoped with RLS:

| Table | Purpose |
|-------|---------|
| `verification_cases` | Top-level case per verification attempt |
| `documents` | Uploaded document images and metadata |
| `face_captures` | Live webcam frame captures |
| `liveness_results` | Liveness challenge outcomes and anti-spoof status |
| `biometric_results` | Face match / embedding comparison results |
| `ocr_results` | OCR-extracted identity fields |
| `forensic_results` | Document forensic analysis (ELA, tampering, compression) |
| `government_verifications` | Government adapter responses |
| `identity_bindings` | Cross-source identity binding matrix |
| `risk_assessments` | Risk engine final decisions and scores |
| `evidence` | Evidence artifacts per case |
| `audit_logs` | Full audit trail per case |
| `consents` | User consent records |

---

## Government Verification

Government verification is handled by a Supabase Edge Function (`government-verify`). It accepts the document type and OCR-extracted fields, then attempts to verify against an authorized government API.

**Current state:** The edge function is deployed but returns `NOT_CONFIGURED` because no government API credentials are set. To enable live verification, the following secrets must be configured on the Supabase project:

- `GOVERNMENT_API_BASE_URL`
- `GOVERNMENT_API_KEY`
- `GOVERNMENT_CLIENT_ID`
- `GOVERNMENT_CLIENT_SECRET`

Until credentials are provided, the pipeline gracefully marks government verification as unavailable and continues with the remaining layers.

---

## Risk Engine

The risk engine evaluates all pipeline results and assigns one of four risk levels:

| Level | Meaning |
|-------|---------|
| **CLEAR** | All layers passed — identity verified |
| **REVIEW** | One or more layers inconclusive — manual review recommended |
| **HIGH RISK** | Forensic anomalies, liveness failure, or identity mismatch detected |
| **UNVERIFIED** | Pipeline did not complete sufficient layers for a decision |

The final risk score is a weighted aggregate across capture integrity, liveness, face match, OCR quality, government status, forensics, and identity consistency.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the migration applied

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app runs on the Vite dev server. Supabase environment variables are pre-configured.

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

---

## Optional Python Backend

A FastAPI backend is included under `backend/` for advanced ML services (face recognition, forensic analysis, OCR, government adapters). It is optional — the frontend runs the full pipeline client-side using Tesseract.js and MediaPipe. To use the Python services:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## Environment Variables

The following are pre-configured in the hosted environment. For local development, they live in `.env`:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `GOVERNMENT_API_BASE_URL` | Government API base URL (optional) |
| `GOVERNMENT_API_KEY` | Government API key (optional) |
| `GOVERNMENT_CLIENT_ID` | Government OAuth client ID (optional) |
| `GOVERNMENT_CLIENT_SECRET` | Government OAuth client secret (optional) |

---

## License

This project is proprietary. All rights reserved.

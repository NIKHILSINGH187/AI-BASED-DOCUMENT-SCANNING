
<div align="center">

# 🛡️ IDShield AI

**AI-Based Fake Identity & Document Screening System**

A full-stack identity verification platform that runs a government ID and a live selfie through a multi-stage pipeline — OCR, document forensics, face liveness, biometric matching, and government cross-referencing — and produces a risk-scored, fully audited case record.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Auth-3ECF8E?logo=supabase&logoColor=white)
![FastAPI](https://img.shields.io/badge/Backend_(optional)-FastAPI-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

</div>

---

## 📋 Table of Contents

- [How a Verification Works](#-how-a-verification-works)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Government Verification](#-government-verification)
- [Getting Started](#-getting-started)
- [License](#-license)

---

## 🔎 How a Verification Works

Every case moves through the same ten-stage pipeline:

| # | Stage | What Happens |
|---|-------|--------------|
| 1 | **Document Intake** | User uploads a photo/scan of a government-issued ID |
| 2 | **Camera Initialization** | Browser requests camera permission and starts the video stream |
| 3 | **Face Detection** | MediaPipe locates facial landmarks in real time |
| 4 | **Liveness Check** | Anti-spoofing challenge flags virtual cameras and replay attacks |
| 5 | **OCR Extraction** | Tesseract.js pulls name, document number, DOB, gender, address, expiry |
| 6 | **Forensics** | Checks for compression anomalies, pixel inconsistency, copy-paste edits, and ELA-based tampering |
| 7 | **Biometric Matching** | Live selfie is compared against the photo on the document |
| 8 | **Government Verification** | Extracted fields are cross-checked against a government API adapter (Aadhaar, PAN, etc.) |
| 9 | **Identity Binding** | Reconciles OCR, government, and biometric results into one identity matrix |
| 10 | **Risk Assessment** | Weighted scoring across every stage produces the final risk level |

**Risk levels:**

| Level | Meaning |
|---|---|
| 🟢 `CLEAR` | All layers passed — identity verified |
| 🟡 `REVIEW` | One or more layers inconclusive — manual review recommended |
| 🔴 `HIGH RISK` | Forensic anomalies, liveness failure, or identity mismatch detected |
| ⚪ `UNVERIFIED` | Pipeline did not complete sufficient layers for a decision |

**Supported documents:** Aadhaar (UIDAI) · PAN · Voter ID (EPIC) · Passport · Driving Licence · Other Government ID

---

## ✨ Features

- **Dashboard** — KPI cards, verification volume trend, risk distribution, document-type breakdown, recent cases
- **Case management** — filterable case list; per-case detail view with every pipeline result and evidence artifact
- **Evidence vault** — document image, face capture, OCR text, forensic report, government response, and liveness result, stored per case
- **Auth & security** — Supabase email/password auth, Row Level Security on every table, per-case biometric consent records, full audit log

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Face Detection | MediaPipe Tasks Vision, face-api.js |
| OCR | Tesseract.js |
| Backend / DB | Supabase (PostgreSQL, Auth, Edge Functions) |
| Optional ML Backend | Python + FastAPI |

> The pipeline runs entirely client-side by default — OCR and face detection happen in-browser. The Python backend is an optional, swappable layer for heavier server-side ML.

---

## 📁 Project Structure

```
project/
├── src/
│   ├── components/     # CameraCapture, LivenessCheck, DocumentUpload, RiskGauge, etc.
│   ├── pages/          # Dashboard, NewVerification, Cases, CaseDetails, Reports, Settings, Profile, Login, Register
│   ├── lib/            # ocr.ts, forensics.ts, faceDetection.ts, faceMatch.ts, riskEngine.ts,
│   │                   # identityBinding.ts, gov.ts, auth.tsx, api.ts, supabase.ts, types.ts
│   └── App.tsx          # Routes + protected/public route guards
├── supabase/
│   ├── functions/government-verify/   # Edge function for government API cross-checks
│   ├── migrations/                    # Database schema + RLS policies
│   └── config.toml
├── backend/             # Optional Python FastAPI services (face, forensics, OCR, government)
└── package.json
```

---

## 🗄️ Database Schema

13 tables, all owner-scoped with Row Level Security:

`verification_cases` · `documents` · `face_captures` · `liveness_results` · `biometric_results` · `ocr_results` · `forensic_results` · `government_verifications` · `identity_bindings` · `risk_assessments` · `evidence` · `audit_logs` · `consents`

---

## 🏛️ Government Verification

The `government-verify` Supabase Edge Function accepts a document type plus the OCR-extracted fields and attempts to verify them against an authorized government API.

**Current state:** deployed but returns `NOT_CONFIGURED` until the required API credentials are supplied on the backend. Until then, the pipeline marks this stage as unavailable and continues through the remaining layers rather than failing outright.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with the migration in `supabase/migrations/` applied
- Supabase project credentials and (optionally) government verification API credentials, configured as environment variables — not committed to source control

### Install & Run

```bash
npm install
npm run dev        # start the Vite dev server
```

### Other Scripts

| Command | Purpose |
|---|---|
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build |

### Optional Python Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 📄 License

This project is proprietary. All rights reserved.


"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import document, biometric, liveness, government, identity, risk, cases

app = FastAPI(
    title="IDShield AI Backend",
    description="AI-Based Fake Identity & Document Screening System — SIH 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(document.router, prefix="/api/document", tags=["document"])
app.include_router(biometric.router, prefix="/api/biometric", tags=["biometric"])
app.include_router(liveness.router, prefix="/api/liveness", tags=["liveness"])
app.include_router(government.router, prefix="/api/government", tags=["government"])
app.include_router(identity.router, prefix="/api/identity", tags=["identity"])
app.include_router(risk.router, prefix="/api/risk", tags=["risk"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "IDShield AI Backend"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.incidents import router as incidents_router

app = FastAPI(
    title="HealthCore — Incident Report Analysis API",
    description="API for analyzing patient incident report CSVs. "
    "Compliant with HIPAA and UK GDPR: patient identifiers are never exposed.",
    version="0.1.0",
)

# CORS — permitir peticiones del frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents_router)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "healthcore-api"}

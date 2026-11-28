"""
HealthCore — Main Application
===============================
FastAPI application entry point.

Registers routers, middleware, and global exception handlers.
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import SQLModel

from app.auth.router import router as auth_router
from app.db.supa_conn import engine
from app.incidents.router import router as incidents_router
from app.inventory.router import router as inventory_router
from app.profiles.router import router as profiles_router
from app.suppliers.router import router as suppliers_router
from app.users.router import router as users_router

logger = logging.getLogger(__name__)

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


# ═══════════════════════════════════════════════════════════
#  Timing Middleware — mide latencia de cada petición
#  Útil para identificar candidatos a caching
# ═══════════════════════════════════════════════════════════


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    """Log request method, path, status code, and duration in ms."""
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000  # ms

    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} | {duration:.1f}ms"
    )
    return response


# ═══════════════════════════════════════════════════════════
#  Global Exception Handlers
# ═══════════════════════════════════════════════════════════


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """
    Handle Pydantic/FastAPI validation errors.

    Returns ``400`` with field-level error detail, consistent with
    the ``ValidationErrorDetail`` format used by the incidents module.
    """
    messages = {
        "missing": "This field is required.",
        "string_too_short": "The value is too short.",
        "string_too_long": "The value is too long.",
        "greater_than": "The value is too small.",
        "greater_than_equal": "The value is too small.",
    }
    errors = []
    for error in exc.errors():
        # Build the field path (e.g. "body.title" or "body")
        loc_parts = [str(loc) for loc in error.get("loc", [])]
        field = ".".join(loc_parts) if loc_parts else "unknown"
        errors.append({
            "field": field,
            "message": messages.get(error.get("type"), "Invalid value."),
        })

    return JSONResponse(
        status_code=400,
        content={"detail": errors},
    )


@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """
    Catch-all for unhandled exceptions.

    Never returns stack traces or internal details.
    Returns ``500`` with a generic message and logs the error server-side.
    """
    logger.error("Unhandled server error")

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please try again later."
        },
    )


# ═══════════════════════════════════════════════════════════
#  Router Registration
# ═══════════════════════════════════════════════════════════

app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(profiles_router, prefix="/profiles")
app.include_router(incidents_router)
app.include_router(suppliers_router)
app.include_router(inventory_router)


# ═══════════════════════════════════════════════════════════
#  Startup — Initialize Supabase Schema
# ═══════════════════════════════════════════════════════════


@app.on_event("startup")
def on_startup():
    """
    Crea las tablas de inventario en Supabase si no existen.

    ⚠️ ``create_all`` es seguro en desarrollo porque solo crea
    tablas que aún no existen. En producción se usarían migraciones
    (Alembic) en lugar de este mecanismo.
    """
    from app.inventory.models import MedicalSupply, SupplyConsumption, SupplyDelivery  # noqa: F401

    SQLModel.metadata.create_all(engine)


# ═══════════════════════════════════════════════════════════
#  Health Check
# ═══════════════════════════════════════════════════════════


class HealthResponse(BaseModel):
    """Response model for the health check endpoint."""

    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", service="healthcore-api")

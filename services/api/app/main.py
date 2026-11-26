"""
HealthCore — Main Application
===============================
FastAPI application entry point.

Registers routers, middleware, and global exception handlers.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.incidents.router import router as incidents_router
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


# ═══════════════════════════════════════════════════════════
#  Health Check
# ═══════════════════════════════════════════════════════════


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "healthcore-api"}

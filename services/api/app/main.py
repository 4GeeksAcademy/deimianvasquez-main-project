"""
HealthCore — Main Application
===============================
FastAPI application entry point.

Registers routers, middleware, and global exception handlers.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.auth.router import router as auth_router
from app.incidents.router import router as incidents_router
from app.profiles.router import router as profiles_router
from app.suppliers.router import router as suppliers_router
from app.users.router import router as users_router

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
    errors = []
    for error in exc.errors():
        # Build the field path (e.g. "body.title" or "body")
        loc_parts = [str(loc) for loc in error.get("loc", [])]
        field = ".".join(loc_parts) if loc_parts else "unknown"
        errors.append({
            "field": field,
            "message": error.get("msg", "Validation error"),
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
    # Log the error for debugging (visible in server logs)
    print(f"[500] Unhandled error at {request.method} {request.url.path}: {exc}")

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

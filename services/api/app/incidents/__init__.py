"""HealthCore — Incidents Module

Layered architecture:
  - schemas.py:    Pydantic models (request/response)
  - models.py:     Database models (placeholder)
  - repository.py: Data access layer (in-memory)
  - service.py:    Business logic layer
  - router.py:     FastAPI endpoints
"""

from app.incidents.router import router

__all__ = ["router"]
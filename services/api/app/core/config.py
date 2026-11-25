"""
HealthCore — Core Configuration
=================================
Reads settings from environment variables (via .env or system env).

Never hardcode secrets. The SECRET_KEY must be set in .env for local dev
and in the deployment environment for staging/production.
"""

import os
import warnings
from pathlib import Path

from dotenv import load_dotenv

# ── Cargar .env ───────────────────────────────────────────────────
# Busca el .env en services/api/.env (junto a pyproject.toml)
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)
else:
    warnings.warn(f".env file not found at {ENV_PATH}. Using system environment variables.")

# ── Rutas ─────────────────────────────────────────────────────────
# Ruta base del proyecto (directorio donde está pyproject.toml)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

# ── JWT ────────────────────────────────────────────────────────────
SECRET_KEY: str = os.getenv("SECRET_KEY", "changeme-insecure-dev-key-replace-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# ── Algoritmo de firma ────────────────────────────────────────────
JWT_ALGORITHM: str = "HS256"

# ── Cookie ─────────────────────────────────────────────────────────
COOKIE_NAME: str = "access_token"


def validate_config() -> None:
    """
    Validate critical config at startup.

    Raises ValueError with a clear message if a required setting
    is missing or uses the insecure default in production.
    """
    if SECRET_KEY == "changeme-insecure-dev-key-replace-in-production":
        warnings.warn(
            "SECRET_KEY is still the insecure default. "
            "Set a real SECRET_KEY in .env or environment variables."
        )

    if ACCESS_TOKEN_EXPIRE_MINUTES < 1:
        raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be >= 1")
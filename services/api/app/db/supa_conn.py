"""
Conexión a Supabase (PostgreSQL vía pooler) para HealthCore.

Usa SQLModel + psycopg2-binary para conectarse a la base de datos
PostgreSQL de Supabase a través del connection pooler.

Convive con TinyDB: tinydb_conn.py sigue siendo la base de datos
principal para el desarrollo del directorio de proveedores.
"""

import os
import warnings
from pathlib import Path

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

# ── Cargar .env ───────────────────────────────────────────────────
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)

# ── URL de conexión ───────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    warnings.warn(
        "DATABASE_URL no está definida en .env. "
        "La conexión a Supabase no estará disponible."
    )

# Forzar el uso de psycopg2 como driver (SQLAlchemy prefiere psycopg v3
# por defecto, pero nosotros instalamos psycopg2-binary).
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# ── Engine y session ──────────────────────────────────────────────
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def get_session():
    """
    Generador de sesión SQLModel para usar con FastAPI Depends.

    Usa ``sqlmodel.Session`` en lugar de ``sqlalchemy.orm.Session``
    para que los routers puedan llamar a ``session.exec()``.

    Uso:
        @router.get("/items")
        def get_items(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
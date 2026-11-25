"""
Repositorio TinyDB para el Directorio de Proveedores de HealthCore.

Capa de acceso a datos. Todas las operaciones de lectura/escritura
sobre la tabla "suppliers" pasan por aquí.
"""

from datetime import datetime, timezone
from typing import Optional

from tinydb.table import Document

from app.db.tinydb_conn import get_db

SUPPLIERS_TABLE = "suppliers"


def get_table():
    """Retorna la tabla 'suppliers' de TinyDB."""
    return get_db().table(SUPPLIERS_TABLE)


def insert_supplier(data: dict) -> Document:
    """
    Inserta un nuevo proveedor y retorna el documento completo con su ID.

    Asigna automáticamente el timestamp `updated_at` con la hora actual.
    """
    table = get_table()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    doc_id = table.insert(data)
    return table.get(doc_id=doc_id)


def find_all(
    country: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """
    Retorna proveedores paginados, opcionalmente filtrados por país y/o categoría.

    Si no se pasan filtros, retorna todos.
    Si se pasan ambos filtros, se aplican en conjunto (AND).

    Args:
        country: Filtrar por país (USA/UK).
        category: Filtrar por categoría.
        skip: Cuántos registros saltar (para paginación).
        limit: Máximo de registros a retornar.

    Returns:
        dict con {"items": list[Document], "total": int}
    """
    table = get_table()
    docs = table.all()

    if country:
        docs = [d for d in docs if d.get("country") == country]

    if category:
        docs = [d for d in docs if category in d.get("categories", [])]

    total = len(docs)
    paginated = docs[skip : skip + limit]

    return {"items": paginated, "total": total}


def find_by_id(supplier_id: int) -> Optional[Document]:
    """
    Busca un proveedor por su ID.

    Retorna el documento o None si no existe.
    """
    return get_table().get(doc_id=supplier_id)


def update_rate(supplier_id: int, new_rate: float) -> Optional[Document]:
    """
    Actualiza la tarifa mensual de un proveedor.

    Registra automáticamente el timestamp del cambio en `updated_at`.
    Retorna el documento actualizado o None si el ID no existe.
    """
    table = get_table()
    if not table.contains(doc_id=supplier_id):
        return None

    table.update(
        {
            "monthly_rate": new_rate,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        doc_ids=[supplier_id],
    )
    return table.get(doc_id=supplier_id)


def update_status(supplier_id: int, new_status: str) -> Optional[Document]:
    """
    Actualiza el estado de un proveedor (active/suspended).

    Retorna el documento actualizado o None si el ID no existe.
    """
    table = get_table()
    if not table.contains(doc_id=supplier_id):
        return None

    now = datetime.now(timezone.utc).isoformat()
    table.update(
        {
            "status": new_status,
            "updated_at": now,
        },
        doc_ids=[supplier_id],
    )
    return table.get(doc_id=supplier_id)


def delete_supplier(supplier_id: int) -> bool:
    """
    Elimina un proveedor del directorio por su ID.

    Retorna True si se eliminó, False si el ID no existía.
    """
    table = get_table()
    if not table.contains(doc_id=supplier_id):
        return False

    table.remove(doc_ids=[supplier_id])
    return True
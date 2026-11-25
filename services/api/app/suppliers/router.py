"""
Router de la API para el Directorio de Proveedores de HealthCore.

Define los 6 endpoints del CRUD de proveedores.
Todos los endpoints requieren un token JWT válido.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.suppliers.models import (
    SupplierCreate,
    SupplierRateUpdate,
    SupplierResponse,
    SupplierStatusUpdate,
    VALID_STATUSES,
)
from app.suppliers.repository import (
    find_all,
    find_by_id,
    insert_supplier,
    update_rate,
    update_status,
    delete_supplier,
)
from app.users.schemas import UserCreate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


# ── Modelo de respuesta paginada ──────────────────────────────────
class PaginatedSuppliers(BaseModel):
    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int


# ── Endpoints ──────────────────────────────────────────────────────

@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Registra un proveedor nuevo.

    Valida la entrada con Pydantic antes de insertar en TinyDB.
    Devuelve el proveedor creado con su ID y updated_at.
    """
    data = payload.model_dump()
    doc = insert_supplier(data)
    return SupplierResponse(id=doc.doc_id, **doc)


@router.get("", response_model=PaginatedSuppliers)
def list_suppliers(
    country: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Lista proveedores con paginación y filtros opcionales.

    Parámetros:
    - `country`: filtrar por país (USA o UK)
    - `category`: filtrar por categoría de producto
    - `skip`: cuántos registros saltar (default: 0)
    - `limit`: máximo de registros por página (default: 20)
    """
    result = find_all(country=country, category=category, skip=skip, limit=limit)
    items = [SupplierResponse(id=d.doc_id, **d) for d in result["items"]]
    return PaginatedSuppliers(items=items, total=result["total"], skip=skip, limit=limit)


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Devuelve el detalle de un proveedor por su ID.

    Retorna 404 si el proveedor no existe.
    """
    doc = find_by_id(supplier_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return SupplierResponse(id=doc.doc_id, **doc)


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(
    supplier_id: int,
    payload: SupplierRateUpdate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Actualiza la tarifa mensual de un proveedor.

    Registra automáticamente el timestamp del cambio en updated_at.
    Retorna 404 si el proveedor no existe.
    """
    doc = update_rate(supplier_id, payload.monthly_rate)
    if doc is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return SupplierResponse(id=doc.doc_id, **doc)


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
    supplier_id: int,
    payload: SupplierStatusUpdate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Activa o suspende un proveedor.

    Solo acepta los valores: active, suspended.
    Retorna 404 si el proveedor no existe.
    """
    if payload.status.value not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Estado inválido: {payload.status}. Permitidos: {VALID_STATUSES}",
        )

    doc = update_status(supplier_id, payload.status.value)
    if doc is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return SupplierResponse(id=doc.doc_id, **doc)


@router.delete("/{supplier_id}", status_code=204)
def remove_supplier(
    supplier_id: int,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Elimina un proveedor del directorio.

    Retorna 404 si el ID no existe.
    """
    deleted = delete_supplier(supplier_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return None
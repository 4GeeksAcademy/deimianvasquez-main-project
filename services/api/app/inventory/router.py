"""
HealthCore — Inventory Router
==============================
Endpoints para la gestión de inventario de suministros médicos.

Todas las rutas están bajo el prefijo ``/inventory`` y requieren
autenticación. Los datos de inventario viven en Supabase (SQLModel);
los usuarios se autentican contra TinyDB.
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, func, select

from app.auth.deps import get_current_user
from app.core.cache import get_cached, invalidate, set_cache
from app.db.supa_conn import get_session
from app.inventory.models import MedicalSupply, SupplyConsumption, SupplyDelivery
from app.inventory.schemas import (
    ConsumptionType,
    ErrorResponse,
    MedicalSupplyCreate,
    MedicalSupplyListResponse,
    MedicalSupplyResponse,
    OrderListResponse,
    OrderItem,
    SupplyConsumptionCreate,
    SupplyConsumptionResponse,
    SupplyDeliveryCreate,
    SupplyDeliveryResponse,
)
from app.users.schemas import UserInDB

router = APIRouter(prefix="/inventory", tags=["inventory"])

# ── Cache config ──
_INVENTORY_CACHE_PREFIX = "inventory:"
_PRODUCTS_CACHE_KEY = "inventory:products"
_PRODUCTS_CACHE_TTL = 30  # seconds — stock changes more frequently than incidents


# ── Helpers ────────────────────────────────────────────────────────


def _calculate_stock(session: Session, supply_id: int) -> int:
    """
    Calcula el stock actual de un suministro.

    ``current_stock = SUM(SupplyDelivery.quantity) - SUM(SupplyConsumption.quantity)``
    """
    total_delivered = session.execute(
        select(func.coalesce(func.sum(SupplyDelivery.quantity), 0)).where(
            SupplyDelivery.supply_id == supply_id
        )
    ).scalar()

    total_consumed = session.execute(
        select(func.coalesce(func.sum(SupplyConsumption.quantity), 0)).where(
            SupplyConsumption.supply_id == supply_id
        )
    ).scalar()

    return int(total_delivered - total_consumed)


def _build_stock_map(session: Session) -> dict[int, int]:
    """
    Construye un mapeo ``supply_id → current_stock`` con solo 2 consultas.

    Reemplaza N consultas individuales de ``_calculate_stock`` cuando se
    necesita el stock de todos los productos (ej. list_products).
    """
    # 1) Entregas agregadas por suministro
    deliveries = session.exec(
        select(SupplyDelivery.supply_id, func.sum(SupplyDelivery.quantity).label("total"))
        .group_by(SupplyDelivery.supply_id)
    ).all()
    delivery_map: dict[int, int] = {r.supply_id: int(r.total) for r in deliveries}

    # 2) Consumos agregados por suministro
    consumptions = session.exec(
        select(SupplyConsumption.supply_id, func.sum(SupplyConsumption.quantity).label("total"))
        .group_by(SupplyConsumption.supply_id)
    ).all()
    consumption_map: dict[int, int] = {r.supply_id: int(r.total) for r in consumptions}

    # 3) Combinar — IDs que aparecen en al menos una tabla
    all_ids = set(delivery_map.keys()) | set(consumption_map.keys())
    return {
        sid: delivery_map.get(sid, 0) - consumption_map.get(sid, 0)
        for sid in all_ids
    }


def _supply_to_response(
    supply: MedicalSupply,
    session: Session,
    current_stock: int | None = None,
) -> MedicalSupplyResponse:
    """
    Convierte un MedicalSupply ORM a schema de respuesta con stock calculado.

    Si se provee ``current_stock`` se usa directamente; si no, se calcula
    con ``_calculate_stock`` (una consulta individual).
    """
    if current_stock is None:
        current_stock = _calculate_stock(session, supply.id)
    return MedicalSupplyResponse(
        id=supply.id,
        name=supply.name,
        sku=supply.sku,
        category=supply.category,
        unit=supply.unit,
        country=supply.country,
        current_stock=current_stock,
    )


# ── GET /inventory/products ────────────────────────────────────────


@router.get(
    "/products",
    response_model=MedicalSupplyListResponse,
    responses={401: {"model": ErrorResponse}},
)
def list_products(
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Number of products to skip"),
    limit: int = Query(20, ge=1, le=200, description="Max products per page"),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Lista todos los suministros médicos con su stock actual calculado.

    ``current_stock`` se deriva de las entregas menos los consumos.
    El resultado se cachea durante ``_PRODUCTS_CACHE_TTL`` segundos.
    La caché se invalida al crear productos, registrar entregas o consumos.

    Soporta paginación vía ``skip`` y ``limit``.
    """
    # Check cache (almacena la lista COMPLETA para poder paginar desde caché)
    cached = get_cached(_PRODUCTS_CACHE_KEY)
    if cached is not None:
        all_items = cached["items"]
        total = cached["total"]
        page = all_items[skip : skip + limit]
        return MedicalSupplyListResponse(items=page, total=total)

    # Fetch ALL products from DB
    supplies = session.exec(select(MedicalSupply)).all()
    stock_map = _build_stock_map(session)
    items = [_supply_to_response(s, session, stock_map.get(s.id, 0)) for s in supplies]
    total = len(items)

    # Cache the FULL list (no slice) para que cualquier página sirva desde caché
    full_cache = MedicalSupplyListResponse(items=items, total=total)
    set_cache(_PRODUCTS_CACHE_KEY, full_cache.model_dump(), ttl_seconds=_PRODUCTS_CACHE_TTL)

    # Return only the requested page
    page = items[skip : skip + limit]
    return MedicalSupplyListResponse(items=page, total=total)


# ── POST /inventory/products ───────────────────────────────────────


@router.post(
    "/products",
    response_model=MedicalSupplyResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}},
)
def create_product(
    body: MedicalSupplyCreate,
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Crea un nuevo suministro médico en el catálogo.

    El suministro comienza con stock cero. Solo se acumula stock
    a través de entregas registradas (``POST /inventory/orders/inbound``).
    """
    supply = MedicalSupply(
        name=body.name,
        sku=body.sku,
        category=body.category.value,
        unit=body.unit,
        country=body.country,
    )
    session.add(supply)
    session.commit()
    session.refresh(supply)

    # Invalidate products cache — catalogue has changed
    invalidate(_INVENTORY_CACHE_PREFIX)

    return _supply_to_response(supply, session)


# ── GET /inventory/products/{id} ───────────────────────────────────


@router.get(
    "/products/{supply_id}",
    response_model=MedicalSupplyResponse,
    responses={
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
def get_product(
    supply_id: int,
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Obtiene un suministro médico por ID con su stock actual calculado.
    """
    supply = session.get(MedicalSupply, supply_id)
    if supply is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supply with id {supply_id} not found.",
        )
    return _supply_to_response(supply, session)


# ── POST /inventory/orders/inbound ─────────────────────────────────


@router.post(
    "/orders/inbound",
    response_model=SupplyDeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
def create_inbound_order(
    body: SupplyDeliveryCreate,
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Registra una entrega de proveedor (incrementa el stock).

    Requiere autenticación. El ``user_uuid`` se obtiene del usuario
    autenticado en TinyDB.
    """
    # Verificar que el suministro existe
    supply = session.get(MedicalSupply, body.supply_id)
    if supply is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supply with id {body.supply_id} not found.",
        )

    delivery = SupplyDelivery(
        supply_id=body.supply_id,
        quantity=body.quantity,
        vendor_name=body.vendor_name,
        clinic_id=body.clinic_id,
        user_uuid=str(current_user.id),
    )
    session.add(delivery)
    session.commit()
    session.refresh(delivery)

    # Invalidate products cache — stock levels have changed
    invalidate(_INVENTORY_CACHE_PREFIX)

    return SupplyDeliveryResponse.model_validate(delivery)


# ── POST /inventory/orders/outbound ────────────────────────────────


@router.post(
    "/orders/outbound",
    response_model=SupplyConsumptionResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
def create_outbound_order(
    body: SupplyConsumptionCreate,
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Registra un consumo clínico o merma (reduce el stock).

    Valida que:
    - El suministro exista.
    - ``consumption_type`` sea ``"clinical_use"`` o ``"expiry_waste"``.
    - Haya stock suficiente antes de registrar.
    """
    # Verificar que el suministro existe
    supply = session.get(MedicalSupply, body.supply_id)
    if supply is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supply with id {body.supply_id} not found.",
        )

    # Validar stock suficiente
    available = _calculate_stock(session, body.supply_id)
    if body.quantity > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock for supply '{supply.name}'. "
                f"Available: {available}, requested: {body.quantity}."
            ),
        )

    consumption = SupplyConsumption(
        supply_id=body.supply_id,
        quantity=body.quantity,
        consumption_type=body.consumption_type.value,
        clinic_id=body.clinic_id,
        user_uuid=str(current_user.id),
    )
    session.add(consumption)
    session.commit()
    session.refresh(consumption)

    # Invalidate products cache — stock levels have changed
    invalidate(_INVENTORY_CACHE_PREFIX)

    return SupplyConsumptionResponse.model_validate(consumption)


# ── GET /inventory/orders ──────────────────────────────────────────


@router.get(
    "/orders",
    response_model=OrderListResponse,
    responses={401: {"model": ErrorResponse}},
)
def list_orders(
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Lista todas las entregas y consumos con datos del suministro.

    Combina entregas (``delivery``) y consumos (``consumption``)
    ordenados por fecha de creación descendente.
    """
    # Obtener entregas con nombre del suministro
    deliveries = session.exec(
        select(
            SupplyDelivery,
            MedicalSupply.name,
            MedicalSupply.sku,
        ).join(MedicalSupply, SupplyDelivery.supply_id == MedicalSupply.id)
    ).all()

    # Obtener consumos con nombre del suministro
    consumptions = session.exec(
        select(
            SupplyConsumption,
            MedicalSupply.name,
            MedicalSupply.sku,
        ).join(MedicalSupply, SupplyConsumption.supply_id == MedicalSupply.id)
    ).all()

    items: list[OrderItem] = []

    for delivery, supply_name, supply_sku in deliveries:
        items.append(
            OrderItem(
                id=delivery.id,
                type="delivery",
                supply_id=delivery.supply_id,
                supply_name=supply_name,
                supply_sku=supply_sku,
                quantity=delivery.quantity,
                vendor_or_type=delivery.vendor_name,
                clinic_id=delivery.clinic_id,
                created_at=delivery.created_at,
                user_uuid=delivery.user_uuid,
            )
        )

    for consumption, supply_name, supply_sku in consumptions:
        items.append(
            OrderItem(
                id=consumption.id,
                type="consumption",
                supply_id=consumption.supply_id,
                supply_name=supply_name,
                supply_sku=supply_sku,
                quantity=consumption.quantity,
                vendor_or_type=consumption.consumption_type,
                clinic_id=consumption.clinic_id,
                created_at=consumption.created_at,
                user_uuid=consumption.user_uuid,
            )
        )

    # Ordenar por created_at descendente
    items.sort(key=lambda x: x.created_at, reverse=True)

    return OrderListResponse(items=items, total=len(items))
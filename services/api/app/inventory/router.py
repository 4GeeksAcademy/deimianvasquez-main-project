"""
HealthCore — Inventory Router
==============================
Endpoints para la gestión de inventario de suministros médicos.

Todas las rutas están bajo el prefijo ``/inventory`` y requieren
autenticación. Los datos de inventario viven en Supabase (SQLModel);
los usuarios se autentican contra TinyDB.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, func, select

from app.auth.deps import get_current_user
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


def _supply_to_response(supply: MedicalSupply, session: Session) -> MedicalSupplyResponse:
    """Convierte un MedicalSupply ORM a schema de respuesta con stock calculado."""
    return MedicalSupplyResponse(
        id=supply.id,
        name=supply.name,
        sku=supply.sku,
        category=supply.category,
        unit=supply.unit,
        country=supply.country,
        current_stock=_calculate_stock(session, supply.id),
    )


# ── GET /inventory/products ────────────────────────────────────────


@router.get(
    "/products",
    response_model=MedicalSupplyListResponse,
    responses={401: {"model": ErrorResponse}},
)
def list_products(
    session: Session = Depends(get_session),
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Lista todos los suministros médicos con su stock actual calculado.

    ``current_stock`` se deriva de las entregas menos los consumos.
    """
    supplies = session.exec(select(MedicalSupply)).all()
    items = [_supply_to_response(s, session) for s in supplies]
    return MedicalSupplyListResponse(items=items, total=len(items))


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
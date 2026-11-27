"""
HealthCore — Inventory Schemas (Pydantic)
==========================================
Schemas de request y response para la API de inventario.

Separados de los modelos ORM (models.py). Ningún endpoint devuelve
un objeto SQLModel directamente.

El campo ``current_stock`` es calculado, nunca almacenado.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ── Enums ──────────────────────────────────────────────────────────

class SupplyCategory(str, Enum):
    """Categorías válidas de suministros médicos."""

    PPE = "ppe"
    WOUND_CARE = "wound_care"
    DIAGNOSTICS = "diagnostics"
    MEDICATIONS = "medications"
    CONSUMABLES = "consumables"


class ConsumptionType(str, Enum):
    """Tipos de consumo válidos."""

    CLINICAL_USE = "clinical_use"
    EXPIRY_WASTE = "expiry_waste"


# ── MedicalSupply ──────────────────────────────────────────────────

class MedicalSupplyCreate(BaseModel):
    """Schema para crear un nuevo suministro médico."""

    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=50)
    category: SupplyCategory
    unit: str = Field(..., min_length=1, max_length=20)
    country: str = Field(..., min_length=2, max_length=2)

    @field_validator("country")
    @classmethod
    def validate_country(cls, v: str) -> str:
        v = v.upper()
        if v not in ("US", "UK"):
            raise ValueError("country must be 'US' or 'UK'")
        return v


class MedicalSupplyResponse(BaseModel):
    """Schema de respuesta para un suministro médico (incluye stock calculado)."""

    id: int
    name: str
    sku: str
    category: str
    unit: str
    country: str
    current_stock: int = 0

    model_config = {"from_attributes": True}


class MedicalSupplyListResponse(BaseModel):
    """Lista de suministros con stock calculado."""

    items: list[MedicalSupplyResponse]
    total: int


# ── SupplyDelivery ─────────────────────────────────────────────────

class SupplyDeliveryCreate(BaseModel):
    """Schema para registrar una entrega de proveedor."""

    supply_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    vendor_name: str = Field(..., min_length=1, max_length=200)
    clinic_id: int = Field(..., ge=1, le=12)


class SupplyDeliveryResponse(BaseModel):
    """Schema de respuesta para una entrega de proveedor."""

    id: int
    supply_id: int
    quantity: int
    vendor_name: str
    clinic_id: int
    created_at: datetime
    user_uuid: str

    model_config = {"from_attributes": True}


# ── SupplyConsumption ──────────────────────────────────────────────

class SupplyConsumptionCreate(BaseModel):
    """Schema para registrar un consumo clínico o merma."""

    supply_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    consumption_type: ConsumptionType
    clinic_id: int = Field(..., ge=1, le=12)


class SupplyConsumptionResponse(BaseModel):
    """Schema de respuesta para un consumo clínico."""

    id: int
    supply_id: int
    quantity: int
    consumption_type: str
    clinic_id: int
    created_at: datetime
    user_uuid: str

    model_config = {"from_attributes": True}


# ── Combined Order ─────────────────────────────────────────────────

class OrderItem(BaseModel):
    """Una orden individual (entrega o consumo) con datos del suministro."""

    id: int
    type: str  # "delivery" o "consumption"
    supply_id: int
    supply_name: str
    supply_sku: str
    quantity: int
    vendor_or_type: str  # vendor_name si es delivery, consumption_type si es consumption
    clinic_id: int
    created_at: datetime
    user_uuid: str


class OrderListResponse(BaseModel):
    """Lista combinada de entregas y consumos."""

    items: list[OrderItem]
    total: int


# ── Error ──────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Mensaje de error estándar."""

    detail: str
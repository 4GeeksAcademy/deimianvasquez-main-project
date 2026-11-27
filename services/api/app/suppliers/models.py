"""
Modelos Pydantic para el Directorio de Proveedores de HealthCore.

Define la estructura, validaciones y tipos de datos que la API
acepta y devuelve. Todo lo que entra por los endpoints pasa por
estos modelos antes de tocar TinyDB.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator
from tinydb.table import Document


class SupplierStatus(str, Enum):
    """Estados permitidos para un proveedor."""

    ACTIVE = "active"
    SUSPENDED = "suspended"


class SupplierCategory(str, Enum):
    """Categorías válidas de productos/servicios."""

    MEDICAL_SUPPLIES = "medical_supplies"
    LABORATORY_SERVICES = "laboratory_services"
    PHARMACEUTICAL = "pharmaceutical"
    CLINICAL_SOFTWARE = "clinical_software"
    IT_INFRASTRUCTURE = "it_infrastructure"
    HR_AND_PAYROLL_SOFTWARE = "hr_and_payroll_software"
    CLEANING_AND_FACILITIES = "cleaning_and_facilities"
    PATIENT_COMMUNICATION = "patient_communication"
    BILLING_AND_CODING_SOFTWARE = "billing_and_coding_software"
    TRAINING_PLATFORMS = "training_platforms"


# Lista de categorías válidas como strings para validación
VALID_CATEGORIES = [c.value for c in SupplierCategory]
VALID_STATUSES = [s.value for s in SupplierStatus]


class SupplierCreate(BaseModel):
    """
    Modelo de entrada para crear un proveedor.

    El cliente envía estos campos. `updated_at` lo genera el sistema.
    """

    name: str = Field(..., min_length=1, description="Nombre comercial del proveedor")
    country: str = Field(
        ..., pattern=r"^(USA|UK)$", description="País del contrato: USA o UK"
    )
    categories: list[str] = Field(
        ..., min_length=1, description="Lista de categorías (mínimo 1)"
    )
    monthly_rate: float = Field(
        ..., gt=0, description="Coste mensual vigente (mayor a 0)"
    )
    currency: str = Field(
        ..., pattern=r"^(USD|GBP)$", description="Moneda del contrato: USD o GBP"
    )
    status: SupplierStatus = Field(
        default=SupplierStatus.ACTIVE, description="Estado del proveedor"
    )
    compliance_agreement: Optional[str] = Field(
        default=None,
        pattern=r"^(BAA|DPA|both)$",
        description="Acuerdo de cumplimiento: BAA, DPA, both o null",
    )
    contract_renewal_date: Optional[str] = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Fecha de renovación (YYYY-MM-DD)",
    )
    contact_email: Optional[str] = Field(
        default=None, description="Email del account manager"
    )
    notes: Optional[str] = Field(default=None, description="Observaciones internas")

    @field_validator("categories")
    @classmethod
    def validate_categories(cls, v: list[str]) -> list[str]:
        """Valida que todas las categorías estén en la lista permitida."""
        invalid = [cat for cat in v if cat not in VALID_CATEGORIES]
        if invalid:
            raise ValueError(
                f"Categorías inválidas: {invalid}. "
                f"Válidas: {VALID_CATEGORIES}"
            )
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency_country(cls, v: str, info) -> str:
        """
        Valida consistencia moneda-país:
        USA → USD, UK → GBP
        """
        country = info.data.get("country")
        if country == "USA" and v != "USD":
            raise ValueError("Los proveedores de USA deben usar USD")
        if country == "UK" and v != "GBP":
            raise ValueError("Los proveedores de UK deben usar GBP")
        return v


class SupplierResponse(BaseModel):
    """
    Modelo de respuesta para un proveedor.

    Incluye el `id` asignado por TinyDB y `updated_at` generado por el sistema.
    """

    id: int = Field(..., description="ID asignado por TinyDB")
    name: str
    country: str
    categories: list[str]
    monthly_rate: float
    currency: str
    status: SupplierStatus
    compliance_agreement: Optional[str] = None
    contract_renewal_date: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    updated_at: Optional[datetime] = Field(
        default=None, description="Timestamp de última actualización"
    )


class SupplierRateUpdate(BaseModel):
    """Modelo para actualizar la tarifa mensual."""

    monthly_rate: float = Field(..., gt=0, description="Nueva tarifa mensual (mayor a 0)")


class SupplierStatusUpdate(BaseModel):
    """Modelo para actualizar el estado del proveedor."""

    status: SupplierStatus = Field(..., description="Nuevo estado: active o suspended")


# ── Helpers ────────────────────────────────────────────────────────


def doc_to_response(doc: Document) -> SupplierResponse:
    """
    Convert a TinyDB supplier document to a safe SupplierResponse.

    Mapea campos explícitamente para evitar exponer campos internos
    que pudieran estar almacenados en la base de datos.
    """
    return SupplierResponse(
        id=doc.doc_id,
        name=doc.get("name", ""),
        country=doc.get("country", ""),
        categories=doc.get("categories", []),
        monthly_rate=doc.get("monthly_rate", 0.0),
        currency=doc.get("currency", ""),
        status=doc.get("status", SupplierStatus.ACTIVE.value),
        compliance_agreement=doc.get("compliance_agreement"),
        contract_renewal_date=doc.get("contract_renewal_date"),
        contact_email=doc.get("contact_email"),
        notes=doc.get("notes"),
        updated_at=doc.get("updated_at"),
    )
"""
HealthCore — Inventory Models (SQLModel)
=========================================
Modelos ORM para la gestión de inventario de suministros médicos.

Estos modelos se almacenan en Supabase (PostgreSQL) y coexisten
con los datos de usuarios que permanecen en TinyDB.

Entidades:
- MedicalSupply: catálogo de suministros médicos
- SupplyDelivery: entregas de proveedores (incrementan stock)
- SupplyConsumption: consumos clínicos o merma (reducen stock)
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class MedicalSupply(SQLModel, table=True):
    """Suministro médico disponible en el catálogo de HealthCore."""

    __tablename__ = "medical_supplies"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    sku: str = Field(unique=True, index=True)
    category: str = Field(index=True)  # ppe, wound_care, diagnostics, medications, consumables
    unit: str  # box, unit, pack, vial
    country: str = Field(index=True)  # US o UK


class SupplyDelivery(SQLModel, table=True):
    """Entrega de suministros recibida de un proveedor en una clínica."""

    __tablename__ = "supply_deliveries"

    id: Optional[int] = Field(default=None, primary_key=True)
    supply_id: int = Field(foreign_key="medical_supplies.id", index=True)
    quantity: int
    vendor_name: str
    clinic_id: int  # 1-12, sin FK
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str  # UUID del usuario de TinyDB que registró la entrega


class SupplyConsumption(SQLModel, table=True):
    """Consumo clínico o merma por caducidad de un suministro."""

    __tablename__ = "supply_consumptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    supply_id: int = Field(foreign_key="medical_supplies.id", index=True)
    quantity: int
    consumption_type: str  # clinical_use o expiry_waste
    clinic_id: int  # 1-12, sin FK
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_uuid: str  # UUID del usuario de TinyDB que registró el consumo
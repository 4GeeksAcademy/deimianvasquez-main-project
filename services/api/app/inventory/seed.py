"""
Seeder de datos de inventario para HealthCore.

Siembra los registros mínimos requeridos en Supabase:
- 6 MedicalSupplies
- 4 SupplyDeliveries
- 3 SupplyConsumptions

Se ejecuta con: uv run python -m app.inventory.seed
No duplica registros (verifica por SKU).
"""

from datetime import datetime, timezone

from sqlmodel import Session, SQLModel, select

from app.db.supa_conn import engine
from app.inventory.models import MedicalSupply, SupplyConsumption, SupplyDelivery

# ── Datos semilla ──────────────────────────────────────────────────

MEDICAL_SUPPLIES = [
    {"name": "Guantes de nitrilo (caja de 100)", "sku": "HCR-PPE-001",
     "category": "ppe", "unit": "box", "country": "US"},
    {"name": "Mascarilla quirúrgica (pack de 50)", "sku": "HCR-PPE-002",
     "category": "ppe", "unit": "pack", "country": "UK"},
    {"name": "Apósito adhesivo para heridas", "sku": "HCR-WND-001",
     "category": "wound_care", "unit": "box", "country": "US"},
    {"name": "Test rápido de estreptococo", "sku": "HCR-DIAG-001",
     "category": "diagnostics", "unit": "unit", "country": "US"},
    {"name": "Tiras reactivas glucemia (50)", "sku": "HCR-DIAG-002",
     "category": "diagnostics", "unit": "box", "country": "UK"},
    {"name": "Solución salina 0,9% 500ml", "sku": "HCR-MED-001",
     "category": "medications", "unit": "vial", "country": "US"},
]

SUPPLY_DELIVERIES = [
    {"sku": "HCR-PPE-001", "quantity": 100, "vendor_name": "MedLine Industries",
     "clinic_id": 1, "user_uuid": "1"},
    {"sku": "HCR-PPE-001", "quantity": 50, "vendor_name": "MedLine Industries",
     "clinic_id": 3, "user_uuid": "1"},
    {"sku": "HCR-DIAG-001", "quantity": 30, "vendor_name": "Bound Tree Medical",
     "clinic_id": 5, "user_uuid": "2"},
    {"sku": "HCR-MED-001", "quantity": 200, "vendor_name": "Cardinal Health UK",
     "clinic_id": 10, "user_uuid": "3"},
]

SUPPLY_CONSUMPTIONS = [
    {"sku": "HCR-PPE-001", "quantity": 20, "consumption_type": "clinical_use",
     "clinic_id": 1, "user_uuid": "2"},
    {"sku": "HCR-PPE-001", "quantity": 5, "consumption_type": "expiry_waste",
     "clinic_id": 3, "user_uuid": "2"},
    {"sku": "HCR-MED-001", "quantity": 30, "consumption_type": "clinical_use",
     "clinic_id": 10, "user_uuid": "3"},
]


# ── Seed logic ─────────────────────────────────────────────────────


def seed():
    """Ejecuta el sembrado de datos."""
    # Crear tablas si no existen
    SQLModel.metadata.create_all(engine)
    print("  ✅ Tablas aseguradas en Supabase\n")
    with Session(engine) as session:
        # 1. MedicalSupplies
        sku_map = {}  # sku -> id
        for data in MEDICAL_SUPPLIES:
            existing = session.exec(
                select(MedicalSupply).where(MedicalSupply.sku == data["sku"])
            ).first()
            if existing:
                print(f"  ⏭️  {data['sku']} — ya existe (id={existing.id})")
                sku_map[data["sku"]] = existing.id
                continue

            supply = MedicalSupply(**data)
            session.add(supply)
            session.flush()  # obtiene el id sin commit
            sku_map[data["sku"]] = supply.id
            print(f"  ✅ {data['sku']} — creado (id={supply.id})")

        # 2. SupplyDeliveries
        for data in SUPPLY_DELIVERIES:
            supply_id = sku_map.get(data["sku"])
            if supply_id is None:
                print(f"  ❌ {data['sku']} — no encontrado, saltando entrega")
                continue

            delivery = SupplyDelivery(
                supply_id=supply_id,
                quantity=data["quantity"],
                vendor_name=data["vendor_name"],
                clinic_id=data["clinic_id"],
                user_uuid=data["user_uuid"],
            )
            session.add(delivery)
            print(f"  📦 Entrega: {data['quantity']} x {data['sku']} ({data['vendor_name']})")

        # 3. SupplyConsumptions
        for data in SUPPLY_CONSUMPTIONS:
            supply_id = sku_map.get(data["sku"])
            if supply_id is None:
                print(f"  ❌ {data['sku']} — no encontrado, saltando consumo")
                continue

            consumption = SupplyConsumption(
                supply_id=supply_id,
                quantity=data["quantity"],
                consumption_type=data["consumption_type"],
                clinic_id=data["clinic_id"],
                user_uuid=data["user_uuid"],
            )
            session.add(consumption)
            print(f"  🔻 Consumo: {data['quantity']} x {data['sku']} ({data['consumption_type']})")

        session.commit()
        print("\n✅ Seed completado.")


if __name__ == "__main__":
    print("🌱 Sembrando datos de inventario en Supabase...\n")
    seed()
"""
HealthCore — Bulk Data Seeder
===============================
Genera datos de prueba realistas a gran escala para validar
el impacto del caching y el rendimiento general del sistema.

Crea:
  - 500 incidentes en TinyDB
  - 30 suministros + 200 entregas + 200 consumos en Supabase
  - 50 proveedores en TinyDB

Uso:
    uv run python -m app.bulk_seed
    uv run python -m app.bulk_seed --incidents 1000 --products 50 --orders 500
"""

import argparse
import hashlib
import random
import sys
from datetime import datetime, timedelta, timezone

# ── TinyDB ─────────────────────────────────────────────────────────
from app.db.tinydb_conn import get_db

# ── Supabase / SQLModel ────────────────────────────────────────────
from sqlmodel import Session, SQLModel, select
from app.db.supa_conn import engine
from app.inventory.models import MedicalSupply, SupplyConsumption, SupplyDelivery
from app.inventory.schemas import ConsumptionType, SupplyCategory

# ── Shared constants ───────────────────────────────────────────────
from healthcore.constants import (
    BRANCHES,
    CLINIC_ID_TO_BRANCH,
    CSV_CATEGORY_MAP,
    CSV_STATUS_MAP,
    VALID_CLINICS,
)


# ═══════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════

def _weighted_choice(options: list[str], weights: list[float]) -> str:
    """Pick a random element respecting weights."""
    return random.choices(options, weights=weights, k=1)[0]


def _random_date(start_year: int = 2024, end_year: int = 2026) -> str:
    """ISO datetime string within the range."""
    start = datetime(start_year, 1, 1, tzinfo=timezone.utc)
    end = datetime(end_year, 11, 28, tzinfo=timezone.utc)
    delta = end - start
    offset = random.randint(0, int(delta.total_seconds()))
    return (start + timedelta(seconds=offset)).isoformat()


# ═══════════════════════════════════════════════════════════════════
#  INCIDENTS (TinyDB)
# ═══════════════════════════════════════════════════════════════════

_INCIDENT_TEMPLATES = [
    # (title_prefix, category)
    ("Patient wait time exceeded", "patient_experience"),
    ("Billing discrepancy reported", "billing_error"),
    ("Equipment malfunction", "clinical_equipment"),
    ("Lab results delayed", "patient_experience"),
    ("System login failure", "it_system"),
    ("Data entry error on patient record", "compliance_breach"),
    ("Staff scheduling conflict", "staff_issue"),
    ("HVAC failure in waiting area", "facility_issue"),
    ("Referral form missing information", "referral_issue"),
    ("Patient complaint about noise levels", "patient_experience"),
    ("Network outage affecting EMR access", "it_system"),
    ("Insurance claim rejected — coding error", "billing_error"),
    ("Broken examination table", "facility_issue"),
    ("Sharps container overflow", "compliance_breach"),
    ("Missed appointment notification", "patient_experience"),
    ("Password reset request", "it_system"),
    ("Staff training overdue", "staff_issue"),
    ("Referral received without clinical notes", "referral_issue"),
    ("Printer offline in pharmacy", "it_system"),
    ("Temperature log not signed", "compliance_breach"),
]

_INCIDENT_STATUS_WEIGHTS = {"open": 0.25, "in_progress": 0.15, "resolved": 0.45, "discarded": 0.15}
_INCIDENT_CATEGORY_WEIGHTS = {
    "patient_experience": 0.18, "billing_error": 0.14,
    "clinical_equipment": 0.10, "it_system": 0.16,
    "compliance_breach": 0.08, "staff_issue": 0.10,
    "facility_issue": 0.08, "referral_issue": 0.06,
    "other": 0.10,
}
_INCIDENT_ORIGIN_WEIGHTS = {"customer": 0.35, "branch": 0.40, "internal": 0.25}
_BRANCH_KEYS = list(BRANCHES.keys())
_BRANCH_WEIGHTS = [0.12, 0.10, 0.08, 0.08, 0.06, 0.07, 0.05, 0.06, 0.05, 0.08, 0.04, 0.09, 0.07, 0.05]


def _generate_incidents(count: int) -> list[dict]:
    """Generate *count* incident dicts ready for TinyDB insertion."""
    now = datetime.now(timezone.utc)
    docs: list[dict] = []

    for _ in range(count):
        template = random.choice(_INCIDENT_TEMPLATES)
        category = template[1]
        # Override category ~20% of the time to get better distribution
        if random.random() < 0.2:
            category = _weighted_choice(
                list(_INCIDENT_CATEGORY_WEIGHTS.keys()),
                list(_INCIDENT_CATEGORY_WEIGHTS.values()),
            )

        status = _weighted_choice(
            list(_INCIDENT_STATUS_WEIGHTS.keys()),
            list(_INCIDENT_STATUS_WEIGHTS.values()),
        )
        origin = _weighted_choice(
            list(_INCIDENT_ORIGIN_WEIGHTS.keys()),
            list(_INCIDENT_ORIGIN_WEIGHTS.values()),
        )
        branch = _weighted_choice(_BRANCH_KEYS, _BRANCH_WEIGHTS)

        # Create varied descriptions with clinic context
        clinic_id = random.choice(list(VALID_CLINICS.keys()))
        description = (
            f"{template[0]} at clinic {clinic_id}. "
            f"Reported by {'staff' if origin == 'internal' else 'patient' if origin == 'customer' else 'branch manager'}. "
            f"Initial assessment completed."
        )
        title = template[0][:120]

        created_at = _random_date()
        updated_at = created_at  # will be updated on status changes

        # Stable hash for idempotency
        raw = "|".join([clinic_id, VALID_CLINICS[clinic_id], category, description, "", status])
        source_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

        docs.append({
            "incident_id": hashlib.md5(source_hash.encode("utf-8")).hexdigest()[:16],
            "title": title,
            "description": description,
            "category": category,
            "status": status,
            "origin": origin,
            "branch": branch,
            "created_at": created_at,
            "updated_at": updated_at,
            "source_hash": source_hash,
        })

    return docs


def seed_incidents(count: int = 500, force: bool = False) -> int:
    """
    Seed incidents into TinyDB.
    Returns number of new inserts.
    """
    table = get_db().table("incidents")
    existing_hashes: set[str] = {d.get("source_hash", "") for d in table.all() if d.get("source_hash")}

    if force:
        print("  ⚠️  Force mode: removing all existing incidents...")
        table.truncate()
        existing_hashes.clear()

    docs = _generate_incidents(count)
    inserted = 0
    skipped = 0

    for doc in docs:
        if doc["source_hash"] in existing_hashes:
            skipped += 1
            continue
        table.insert(doc)
        existing_hashes.add(doc["source_hash"])
        inserted += 1

    print(f"  📋 Incidents: {inserted} inserted, {skipped} skipped (duplicates)")
    return inserted


# ═══════════════════════════════════════════════════════════════════
#  INVENTORY — Medical Supplies, Deliveries & Consumptions (Supabase)
# ═══════════════════════════════════════════════════════════════════

_PRODUCT_TEMPLATES: list[dict] = [
    # (name, sku_prefix, category, unit, country)
    {"name": "Guante nitrilo sin polvo talla M", "sku": "HCR-PPE-", "category": "ppe", "unit": "box", "country": "US"},
    {"name": "Guante nitrilo sin polvo talla L", "sku": "HCR-PPE-", "category": "ppe", "unit": "box", "country": "US"},
    {"name": "Guante nitrilo sin polvo talla S", "sku": "HCR-PPE-", "category": "ppe", "unit": "box", "country": "UK"},
    {"name": "Mascarilla quirúrgica tipo IIR", "sku": "HCR-PPE-", "category": "ppe", "unit": "box", "country": "UK"},
    {"name": "Mascarilla FFP3", "sku": "HCR-PPE-", "category": "ppe", "unit": "box", "country": "US"},
    {"name": "Bata quirúrgica desechable", "sku": "HCR-PPE-", "category": "ppe", "unit": "unit", "country": "US"},
    {"name": "Gafas protección anti-salpicaduras", "sku": "HCR-PPE-", "category": "ppe", "unit": "unit", "country": "UK"},
    {"name": "Gel hidroalcohólico 500ml", "sku": "HCR-PPE-", "category": "ppe", "unit": "bottle", "country": "US"},
    {"name": "Apósito adhesivo estéril 10x10cm", "sku": "HCR-WND-", "category": "wound_care", "unit": "box", "country": "US"},
    {"name": "Venda elástica 10cm x 4m", "sku": "HCR-WND-", "category": "wound_care", "unit": "unit", "country": "UK"},
    {"name": "Gasas estériles 10x10cm pack 25", "sku": "HCR-WND-", "category": "wound_care", "unit": "pack", "country": "US"},
    {"name": "Esparadrapo de tela 5cm x 5m", "sku": "HCR-WND-", "category": "wound_care", "unit": "unit", "country": "UK"},
    {"name": "Sutura quirúrgica seda 3/0", "sku": "HCR-WND-", "category": "wound_care", "unit": "unit", "country": "US"},
    {"name": "Test rápido influenza A/B", "sku": "HCR-DIAG-", "category": "diagnostics", "unit": "unit", "country": "US"},
    {"name": "Test antígeno COVID-19", "sku": "HCR-DIAG-", "category": "diagnostics", "unit": "unit", "country": "UK"},
    {"name": "Tiras reactivas orina 10 parámetros", "sku": "HCR-DIAG-", "category": "diagnostics", "unit": "box", "country": "US"},
    {"name": "Jeringa 5ml con aguja (100 unid.)", "sku": "HCR-DIAG-", "category": "diagnostics", "unit": "box", "country": "UK"},
    {"name": "Tubos extracción vacío EDTA 5ml", "sku": "HCR-DIAG-", "category": "diagnostics", "unit": "box", "country": "US"},
    {"name": "Paracetamol 500mg (500 comp.)", "sku": "HCR-MED-", "category": "medications", "unit": "bottle", "country": "US"},
    {"name": "Ibuprofeno 400mg (500 comp.)", "sku": "HCR-MED-", "category": "medications", "unit": "bottle", "country": "UK"},
    {"name": "Amoxicilina 500mg (30 cáps.)", "sku": "HCR-MED-", "category": "medications", "unit": "box", "country": "US"},
    {"name": "Solución salina 0,9% 100ml", "sku": "HCR-MED-", "category": "medications", "unit": "vial", "country": "UK"},
    {"name": "Solución salina 0,9% 500ml", "sku": "HCR-MED-", "category": "medications", "unit": "vial", "country": "US"},
    {"name": "Lidocaína 2% 20ml", "sku": "HCR-MED-", "category": "medications", "unit": "vial", "country": "US"},
    {"name": "Compresa fría instantánea", "sku": "HCR-CON-", "category": "consumables", "unit": "unit", "country": "UK"},
    {"name": "Bolsa de papel para residuos (100 unid.)", "sku": "HCR-CON-", "category": "consumables", "unit": "pack", "country": "US"},
    {"name": "Contenedor cortopunzantes 5L", "sku": "HCR-CON-", "category": "consumables", "unit": "unit", "country": "UK"},
    {"name": "Termómetro digital axilar", "sku": "HCR-CON-", "category": "consumables", "unit": "unit", "country": "US"},
    {"name": "Tensiómetro digital automático", "sku": "HCR-CON-", "category": "consumables", "unit": "unit", "country": "UK"},
    {"name": "Depresor lingual madera (100 unid.)", "sku": "HCR-CON-", "category": "consumables", "unit": "pack", "country": "US"},
]

_VENDOR_NAMES = [
    "MedLine Industries", "Bound Tree Medical", "Cardinal Health UK",
    "Henry Schein", "Molnlycke Healthcare", "Smith+Nephew",
    "BD Medical", "Teleflex Medical", "B. Braun Melsungen",
    "Johnson & Johnson Med", "ConvaTec Group", "Kendall Healthcare",
    "Dynarex Corporation", "Covidien", "Halyard Health",
    "Arjo UK", "MediGroup UK", "Vernacare",
    "Parker Healthcare", "Trionic UK",
]


def _generate_sku(category: str, index: int) -> str:
    """Generate a deterministic SKU."""
    prefix_map = {e.value: e.value.upper()[:3] for e in SupplyCategory}
    prefix = prefix_map.get(category, "GEN")
    return f"HCR-{prefix}-{index:03d}"


def seed_inventory(
    product_count: int = 30,
    delivery_count: int = 200,
    consumption_count: int = 200,
    force: bool = False,
) -> dict:
    """
    Seed inventory data into Supabase.
    Returns dict with counts of created records.
    """
    # Ensure tables exist
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # ── 1. Products ──────────────────────────────────────────
        existing_skus = set(
            session.exec(select(MedicalSupply.sku)).all()
        )

        if force:
            print("  ⚠️  Force mode: clearing existing inventory data...")
            for table_model in (SupplyConsumption, SupplyDelivery, MedicalSupply):
                session.execute(table_model.__table__.delete())  # type: ignore[arg-type]
            session.commit()
            existing_skus.clear()

        # Use templates, extending with generated ones if needed
        template_pool = list(_PRODUCT_TEMPLATES)
        while len(template_pool) < product_count:
            t = random.choice(_PRODUCT_TEMPLATES)
            template_pool.append({**t, "name": t["name"] + f" (var. {len(template_pool)})"})

        created_products = 0
        sku_to_id: dict[str, int] = {}

        for idx, tpl in enumerate(template_pool[:product_count]):
            sku = _generate_sku(tpl["category"], idx + 1)
            if sku in existing_skus:
                # Fetch existing id
                existing = session.exec(
                    select(MedicalSupply).where(MedicalSupply.sku == sku)
                ).first()
                if existing:
                    sku_to_id[sku] = existing.id
                continue

            supply = MedicalSupply(
                name=tpl["name"],
                sku=sku,
                category=tpl["category"],
                unit=tpl["unit"],
                country=tpl["country"],
            )
            session.add(supply)
            session.flush()
            sku_to_id[sku] = supply.id
            created_products += 1

        print(f"  📦 Products: {created_products} created, {len(sku_to_id)} total available")

        if not sku_to_id:
            print("  ⚠️  No products available — cannot create orders.")
            return {"products": 0, "deliveries": 0, "consumptions": 0}

        # ── 2. Deliveries ────────────────────────────────────────
        supply_ids = list(sku_to_id.values())
        created_deliveries = 0

        for _ in range(delivery_count):
            sid = random.choice(supply_ids)
            delivery = SupplyDelivery(
                supply_id=sid,
                quantity=random.randint(5, 500),
                vendor_name=random.choice(_VENDOR_NAMES),
                clinic_id=random.randint(1, 12),
                user_uuid=str(random.randint(1, 5)),
            )
            session.add(delivery)
            created_deliveries += 1

        print(f"  📥 Deliveries: {created_deliveries} created")

        # ── 3. Consumptions ──────────────────────────────────────
        created_consumptions = 0
        consumption_types = [ct.value for ct in ConsumptionType]

        for _ in range(consumption_count):
            sid = random.choice(supply_ids)
            consumption = SupplyConsumption(
                supply_id=sid,
                quantity=random.randint(1, 100),
                consumption_type=random.choice(consumption_types),
                clinic_id=random.randint(1, 12),
                user_uuid=str(random.randint(1, 5)),
            )
            session.add(consumption)
            created_consumptions += 1

        print(f"  🔻 Consumptions: {created_consumptions} created")

        session.commit()
        print(f"  ✅ Inventory committed to Supabase")

    return {
        "products": created_products,
        "deliveries": created_deliveries,
        "consumptions": created_consumptions,
    }


# ═══════════════════════════════════════════════════════════════════
#  SUPPLIERS (TinyDB)
# ═══════════════════════════════════════════════════════════════════

_SUPPLIER_NAME_PREFIXES = [
    "HealthCore", "MedSupply", "Global Health", "Prime Medical",
    "United Care", "Premium Health", "CoreMed", "Vital Supplies",
    "ProHealth", "MediTrust", "CareFirst", "HealthPlus",
    "MedEquip", "PharmaCare", "BioMed", "LifeLine Medical",
    "Wellness Supply", "MediDirect", "HealthGuard", "Surgical Partners",
]

_SUPPLIER_LAST_NAMES = [
    "Ltd", "Inc", "Group", "LLC", "Corp", "Partners", "PLC", "Co",
]

_COUNTRIES = ["USA", "UK"]
_COMPLIANCE = ["BAA", "DPA", None]
_CATEGORIES = [
    "medical_supplies", "laboratory_services", "pharmaceutical",
    "clinical_software", "it_infrastructure", "hr_and_payroll_software",
    "cleaning_and_facilities", "patient_communication",
    "billing_and_coding_software", "training_platforms",
]
_CURRENCIES = {"USA": "USD", "UK": "GBP"}


def _generate_email(name: str) -> str:
    """Generate a plausible contact email."""
    slug = name.lower().replace(" ", "").replace("-", "")[:20]
    domains = [f"{slug}@healthcore.com", f"contracts@{slug}.com", f"info@{slug}.co.uk"]
    return random.choice(domains)


def seed_suppliers(count: int = 50, force: bool = False) -> int:
    """Seed suppliers into TinyDB. Returns number of new inserts."""
    table = get_db().table("suppliers")
    existing_names: set[str] = {d.get("name", "") for d in table.all()}

    if force:
        print("  ⚠️  Force mode: removing all existing suppliers...")
        table.truncate()
        existing_names.clear()

    inserted = 0
    skipped = 0
    now = datetime.now(timezone.utc).isoformat()

    for i in range(count):
        country = random.choice(_COUNTRIES)
        prefix = random.choice(_SUPPLIER_NAME_PREFIXES)
        suffix = random.choice(_SUPPLIER_LAST_NAMES)
        name = f"{prefix} {suffix} — {country}"

        if name in existing_names:
            skipped += 1
            continue

        categories = random.sample(_CATEGORIES, k=random.randint(1, 3))
        compliance = random.choice(_COMPLIANCE)

        supplier = {
            "name": name,
            "country": country,
            "categories": categories,
            "monthly_rate": round(random.uniform(300, 9500), 2),
            "currency": _CURRENCIES[country],
            "status": random.choice(["active", "active", "active", "suspended"]),
            "compliance_agreement": compliance,
            "contract_renewal_date": _random_date(2025, 2027)[:10] if random.random() < 0.6 else None,
            "contact_email": _generate_email(prefix),
            "notes": f"Auto-generated supplier #{i+1} for bulk seeding." if random.random() < 0.3 else None,
            "updated_at": now,
        }

        # Clean None values for TinyDB
        supplier = {k: v for k, v in supplier.items() if v is not None}

        table.insert(supplier)
        existing_names.add(name)
        inserted += 1

    print(f"  🏢  Suppliers: {inserted} inserted, {skipped} skipped (duplicates)")
    return inserted


# ═══════════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="HealthCore — Bulk data seeder for performance testing"
    )
    parser.add_argument("--incidents", type=int, default=500, help="Number of incidents to generate (default: 500)")
    parser.add_argument("--products", type=int, default=30, help="Number of medical supplies (default: 30)")
    parser.add_argument("--orders", type=int, default=400, help="Total deliveries + consumptions (default: 400)")
    parser.add_argument("--suppliers", type=int, default=50, help="Number of suppliers (default: 50)")
    parser.add_argument("--force", action="store_true", help="Clear existing data before seeding")
    args = parser.parse_args()

    deliveries = args.orders // 2
    consumptions = args.orders - deliveries

    print("=" * 60)
    print("  HEALTHCORE — BULK DATA SEEDER")
    print("=" * 60)
    print()
    print(f"  Configuration:")
    print(f"    ├─ Incidents .................... {args.incidents}")
    print(f"    ├─ Products .................... {args.products}")
    print(f"    ├─ Deliveries .................. {deliveries}")
    print(f"    ├─ Consumptions ................ {consumptions}")
    print(f"    ├─ Suppliers ................... {args.suppliers}")
    print(f"    └─ Force mode .................. {'YES' if args.force else 'NO'}")
    print()

    # ── 1. Incidents ──────────────────────────────────────────────
    print("[1/3] Seeding incidents...")
    inc_count = seed_incidents(count=args.incidents, force=args.force)

    # ── 2. Inventory ──────────────────────────────────────────────
    print()
    print("[2/3] Seeding inventory...")
    inv_counts = seed_inventory(
        product_count=args.products,
        delivery_count=deliveries,
        consumption_count=consumptions,
        force=args.force,
    )

    # ── 3. Suppliers ──────────────────────────────────────────────
    print()
    print("[3/3] Seeding suppliers...")
    sup_count = seed_suppliers(count=args.suppliers, force=args.force)

    # ── Summary ───────────────────────────────────────────────────
    print()
    print("-" * 40)
    print("  BULK SEED SUMMARY")
    print("-" * 40)
    print(f"  Incidents ................. {inc_count}")
    print(f"  Products ................. {inv_counts.get('products', 0)}")
    print(f"  Deliveries ............... {inv_counts.get('deliveries', 0)}")
    print(f"  Consumptions ............. {inv_counts.get('consumptions', 0)}")
    print(f"  Suppliers ................ {sup_count}")
    print()
    print("  ✅ Bulk seed completed.")
    print("  💡 Run the API and check /api/incidents/summary")
    print("     and /inventory/products to see caching in action.")


if __name__ == "__main__":
    main()
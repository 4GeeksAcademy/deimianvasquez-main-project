/**
 * HealthCore — Inventory Types
 * =============================
 * Interfaces de TypeScript que reflejan los schemas de respuesta
 * de la API /inventory (definidos en services/api/app/inventory/schemas.py).
 *
 * Convención: los campos opcionales (`?`) indican valores que pueden
 * ser null según la API. Los tipos literales reflectan exactamente
 * los valores que devuelve el backend.
 */

/* ── Medical Supply ─────────────────────────────────────────────── */

/** Suministro médico con stock calculado (GET /inventory/products) */
export interface MedicalSupply {
  id: number;
  name: string;
  sku: string;
  category: SupplyCategory;
  unit: string;
  country: "US" | "UK";
  current_stock: number;
}

export type SupplyCategory =
  | "ppe"
  | "wound_care"
  | "diagnostics"
  | "medications"
  | "consumables";

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  ppe: "EPP",
  wound_care: "Cuidado de heridas",
  diagnostics: "Diagnósticos",
  medications: "Medicamentos",
  consumables: "Consumibles",
};

/* ── Delivery (inbound) ─────────────────────────────────────────── */

/** Entrega de proveedor registrada (POST /inventory/orders/inbound) */
export interface SupplyDelivery {
  id: number;
  supply_id: number;
  quantity: number;
  vendor_name: string;
  clinic_id: number;
  created_at: string; // ISO 8601
  user_uuid: string;
}

/* ── Consumption (outbound) ─────────────────────────────────────── */

/** Consumo clínico o merma registrado (POST /inventory/orders/outbound) */
export interface SupplyConsumption {
  id: number;
  supply_id: number;
  quantity: number;
  consumption_type: ConsumptionType;
  clinic_id: number;
  created_at: string; // ISO 8601
  user_uuid: string;
}

export type ConsumptionType = "clinical_use" | "expiry_waste";

export const CONSUMPTION_TYPE_LABELS: Record<ConsumptionType, string> = {
  clinical_use: "Uso clínico",
  expiry_waste: "Merma / Caducidad",
};

/* ── Combined Order (history) ───────────────────────────────────── */

/** Una entrada en el historial combinado (GET /inventory/orders) */
export interface OrderItem {
  id: number;
  type: "delivery" | "consumption";
  supply_id: number;
  supply_name: string;
  supply_sku: string;
  quantity: number;
  vendor_or_type: string; // vendor_name si delivery, consumption_type si consumption
  clinic_id: number;
  created_at: string;
  user_uuid: string;
}

/* ── API response shapes ────────────────────────────────────────── */

export interface ProductsResponse {
  items: MedicalSupply[];
  total: number;
}

export interface OrdersResponse {
  items: OrderItem[];
  total: number;
}

/* ── Form payloads (sin tipos específicos del backend) ──────────── */

export interface InboundFormData {
  supply_id: number;
  quantity: number;
  vendor_name: string;
  clinic_id: number;
}

export interface OutboundFormData {
  supply_id: number;
  quantity: number;
  consumption_type: ConsumptionType;
  clinic_id: number;
}
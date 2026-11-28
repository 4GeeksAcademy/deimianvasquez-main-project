/**
 * HealthCore — Inventory API Client
 * ===================================
 * Módulo de integración con los endpoints /inventory.
 * Centraliza todas las llamadas a la API. Ningún componente
 * debe llamar a fetch() directo.
 */

import { fetchWithAuth, API_BASE } from "@/services/api";
import type {
  MedicalSupply,
  SupplyDelivery,
  SupplyConsumption,
  OrderItem,
} from "@/app/inventory/types";

/* ── Helpers ──────────────────────────────────────────────────── */

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "Error del servidor";
    try {
      const body = await res.json();
      detail = body.detail || `Error ${res.status}`;
    } catch {
      detail = `Error ${res.status}: no se pudo interpretar la respuesta`;
    }
    throw new Error(detail);
  }
  return res.json();
}

/* ── Products ─────────────────────────────────────────────────── */

export interface ProductsResponse {
  items: MedicalSupply[];
  total: number;
}

/**
 * GET /inventory/products
 * Lista los suministros médicos con paginación vía skip/limit.
 */
export async function fetchProducts(
  skip?: number,
  limit?: number,
): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (skip !== undefined) params.set("skip", String(skip));
  if (limit !== undefined) params.set("limit", String(limit));
  const qs = params.toString();
  const url = `${API_BASE}/inventory/products${qs ? `?${qs}` : ""}`;
  const res = await fetchWithAuth(url);
  return handleResponse<ProductsResponse>(res);
}

/**
 * GET /inventory/products/{supply_id}
 * Obtiene un suministro por ID con su stock calculado.
 */
export async function fetchProduct(supplyId: number): Promise<MedicalSupply> {
  const res = await fetchWithAuth(`${API_BASE}/inventory/products/${supplyId}`);
  return handleResponse<MedicalSupply>(res);
}

/**
 * POST /inventory/products
 * Crea un nuevo suministro médico.
 */
export async function createProduct(data: {
  name: string;
  sku: string;
  category: string;
  unit: string;
  country: string;
}): Promise<MedicalSupply> {
  const res = await fetchWithAuth(`${API_BASE}/inventory/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<MedicalSupply>(res);
}

/* ── Orders ───────────────────────────────────────────────────── */

/**
 * POST /inventory/orders/inbound
 * Registra una orden de entrada (entrega de proveedor).
 */
export async function createInboundOrder(data: {
  supply_id: number;
  quantity: number;
  vendor_name: string;
  clinic_id: number;
}): Promise<SupplyDelivery> {
  const res = await fetchWithAuth(`${API_BASE}/inventory/orders/inbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SupplyDelivery>(res);
}

/**
 * POST /inventory/orders/outbound
 * Registra una orden de salida (consumo o merma).
 */
export async function createOutboundOrder(data: {
  supply_id: number;
  quantity: number;
  consumption_type: string;
  clinic_id: number;
}): Promise<SupplyConsumption> {
  const res = await fetchWithAuth(`${API_BASE}/inventory/orders/outbound`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<SupplyConsumption>(res);
}

/**
 * GET /inventory/orders
 * Obtiene el historial completo de órdenes (entradas y salidas).
 */
export interface OrdersResponse {
  items: OrderItem[];
  total: number;
}

export async function fetchOrders(): Promise<OrdersResponse> {
  const res = await fetchWithAuth(`${API_BASE}/inventory/orders`);
  return handleResponse<OrdersResponse>(res);
}
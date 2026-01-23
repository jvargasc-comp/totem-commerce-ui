import { apiGet, apiPost } from "./http";
import type { Receipt } from "../types/receipt";

export type FulfillmentType = "PICKUP" | "DELIVERY";

export type DeliveryAddress = {
  line1: string;
  reference?: string;
  city: string;
  zone?: string;
  postalCode?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export type DeliveryInfo = {
  storeId: string;
  date: string;     // YYYY-MM-DD
  windowId: string;
  address: DeliveryAddress;
};

export type CreateOrderItem = { productId: string; qty: number };

export type CreateOrderPayload = {
  customerName: string;
  customerPhone: string;
  items: CreateOrderItem[];

  fulfillmentType?: FulfillmentType; // default PICKUP en backend
  delivery?: DeliveryInfo;

  // (Opcional) Legacy si ya lo usabas en backend:
  deliveryWindowId?: string;
  address?: {
    line1: string;
    reference?: string;
    city: string;
    zone?: string;
    lat?: number;
    lng?: number;
  };
};

export type CreateOrderResponse = { id: string };

export function createOrder(payload: CreateOrderPayload) {
  return apiPost<CreateOrderResponse>("/orders", payload);
}

export function getOrderStatus(orderId: string) {
  return apiGet<{ orderId: string; status: string }>(`/orders/${orderId}/status`);
}

export function getReceipt(orderId: string) {
  return apiGet<Receipt>(`/orders/${orderId}/receipt`);
}

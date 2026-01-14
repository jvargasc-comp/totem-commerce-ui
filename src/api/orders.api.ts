import { apiGet, apiPost } from './http';
import type { Receipt } from '../types/receipt';

export type CreateOrderPayload = {
  customerName: string;
  customerPhone: string;
  items: { productId: string; qty: number }[];
  // opcionales
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

export type CreateOrderResponse = { id: string }; // ajusta si tu backend devuelve más

export function createOrder(payload: CreateOrderPayload) {
  return apiPost<CreateOrderResponse>('/orders', payload);
}

export function getOrderStatus(orderId: string) {
  return apiGet<{ orderId: string; status: string }>(`/orders/${orderId}/status`);
}

export type ReceiptResponse = Receipt;


export function getReceipt(orderId: string) {
  return apiGet<Receipt>(`/orders/${orderId}/receipt`);
}


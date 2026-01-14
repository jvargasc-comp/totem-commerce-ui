import type { Product } from '../types/catalog';

type CartState = { items: CartItem[] };
export type CartItem = { product: Product; qty: number };

const state: { items: CartItem[] } = { items: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCart() {
  return state;
}

export function addToCart(product: Product) {
  const found = state.items.find((i) => i.product.id === product.id);
  if (found) found.qty += 1;
  else state.items.push({ product, qty: 1 });
  emit();
}

export function setQty(productId: string, qty: number) {
  state.items = state.items
    .map((i) => (i.product.id === productId ? { ...i, qty } : i))
    .filter((i) => i.qty > 0);
  emit();
}

export function clearCart() {
  state.items = [];
  emit();
}

export function cartTotals() {
  const subtotalCents = state.items.reduce((s, i) => s + i.product.priceCents * i.qty, 0);
  return { subtotalCents };
}

export function getCartSnapshot(): CartState {
  return state;
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
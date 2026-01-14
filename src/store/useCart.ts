import { useSyncExternalStore } from 'react';
import { subscribe, getCart } from './cart.store';

export function useCart() {
  // useSyncExternalStore es lo correcto para stores simples
  return useSyncExternalStore(subscribe, getCart, getCart);
}

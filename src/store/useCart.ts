import { useEffect, useState } from "react";
import type { CartState } from "./cart.store";
import { getCartSnapshot, subscribeCart } from "./cart.store";

function cloneCart(snap: CartState): CartState {
  return { items: snap.items.map((i) => ({ ...i })) };
}

export function useCart(): CartState {
  const [cart, setCart] = useState<CartState>(() => cloneCart(getCartSnapshot()));

  useEffect(() => {
    return subscribeCart(() => {
      setCart(cloneCart(getCartSnapshot()));
    });
  }, []);

  return cart;
}

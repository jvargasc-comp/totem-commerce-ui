import { useState } from "react";
import CatalogScreen from "./screens/CatalogScreen";
import CheckoutScreen from "./screens/CheckoutScreen";
import PaymentScreen from "./screens/PaymentScreen";
import ReceiptScreen from "./screens/ReceiptScreen";
import CartScreen from "./screens/CartScreen";

import { useCart } from "./store/useCart";
import { cartTotals, clearCart } from "./store/cart.store";
import { useIdleTimer } from "./hooks/useIdleTimer";

type Screen = "catalog" | "cart" | "checkout" | "payment" | "receipt";

export default function App() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [orderId, setOrderId] = useState<string>("");

  // Mantengo tus llamadas actuales (aunque aquí no se usen directamente,
  // las dejo porque es probable que disparen recalculo/subscripción del store)
  const cart = useCart();
  const totals = cartTotals();

  // Evita reset por idle durante el pago (para no cortar flujo crítico)
  const disableIdle = screen === "payment";

  const resetSessionToHome = () => {
    clearCart();
    setOrderId("");
    setScreen("catalog");
  };

  useIdleTimer({
    timeoutMs: 5 * 60 * 1000, // 5 minutos (igual que antes)
    enabled: !disableIdle,
    onIdle: resetSessionToHome,
  });

  if (screen === "catalog") {
    return <CatalogScreen onGoCart={() => setScreen("cart")} />;
  }

  if (screen === "checkout") {
    return (
      <CheckoutScreen
        onBack={() => setScreen("cart")}
        onOrderCreated={(id) => {
          setOrderId(id);
          setScreen("payment");
        }}
      />
    );
  }

  if (screen === "payment") {
    return (
      <PaymentScreen
        orderId={orderId}
        onPaid={() => setScreen("receipt")}
        onCancel={() => {
          // opcional: podrías llamar a /orders/:id/cancel
          resetSessionToHome();
        }}
      />
    );
  }

  if (screen === "receipt") {
    return (
      <ReceiptScreen
        orderId={orderId}
        onNew={() => {
          resetSessionToHome();
        }}
      />
    );
  }

  // CART (screen === "cart")
  return (
    <CartScreen
      onHome={() => setScreen("catalog")}
      onCheckout={() => setScreen("checkout")}
    />
  );
}

import { useEffect, useState } from 'react';
import CatalogScreen from './screens/CatalogScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import PaymentScreen from './screens/PaymentScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import { useCart } from './store/useCart';
import { cartTotals, setQty, clearCart } from './store/cart.store';
import { KioskButton } from "./components/kiosk/KioskButton";
import { KioskCartBar } from "./components/kiosk/KioskCartBar";
import { KioskFooterSpacer } from "./components/kiosk/KioskFooterSpacer";

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

type Screen = 'catalog' | 'cart' | 'checkout' | 'payment' | 'receipt';

export default function App() {
  const [screen, setScreen] = useState<Screen>('catalog');
  const [orderId, setOrderId] = useState<string>('');
  const cart = useCart();
  const totals = cartTotals();

  useEffect(() => {
    const IDLE_MS = 5 * 60 * 1000; // 5 minutos
    let timer: number;

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        clearCart();
        setOrderId('');
        setScreen('catalog');
      }, IDLE_MS);
    };

    const events = ['click', 'touchstart', 'mousemove', 'keydown'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    resetTimer(); // inicia el contador al cargar

    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, []);

  if (screen === 'catalog') {
    return <CatalogScreen onGoCart={() => setScreen('cart')} />;
  }

  if (screen === 'checkout') {
    return (
      <CheckoutScreen
        onBack={() => setScreen('cart')}
        onOrderCreated={(id) => {
          setOrderId(id);
          setScreen('payment');
        }}
      />
    );
  }

  if (screen === 'payment') {
    return (
      <PaymentScreen
        orderId={orderId}
        onPaid={() => setScreen('receipt')}
        onCancel={() => {
          // opcional: podrías llamar a /orders/:id/cancel
          clearCart();
          setScreen('catalog');
        }}
      />
    );
  }

  if (screen === 'receipt') {
    return (
      <ReceiptScreen
        orderId={orderId}
        onNew={() => {
          clearCart();
          setOrderId('');
          setScreen('catalog');
        }}
      />
    );
  }

  // CART
 return (
  <div className="kioskScreen kioskNoSelect kioskContentWithFooter" style={{ padding: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 260 }}>
        <KioskButton
          label="Seguir comprando"
          variant="secondary"
          size="xl"
          onClick={() => setScreen("catalog")}
        />
      </div>

      <h2 style={{ margin: 0, flex: 1, fontSize: 28, letterSpacing: ".2px" }}>Carrito</h2>

      <div style={{ width: 220 }}>
        <KioskButton
          label="Vaciar"
          variant="ghost"
          size="xl"
          onClick={clearCart}
          disabled={cart.items.length === 0}
        />
      </div>
    </div>

    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      {cart.items.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            border: "1px solid rgba(233,238,246,.12)",
            background: "var(--surface)",
            color: "var(--muted)",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Tu carrito está vacío.
        </div>
      ) : (
        cart.items.map((i) => (
          <div
            key={i.product.id}
            style={{
              border: "1px solid rgba(233,238,246,.12)",
              background: "var(--surface)",
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20 }}>{i.product.name}</div>
            <div style={{ opacity: 0.75, marginTop: 4 }}>{money(i.product.priceCents)}</div>

            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 160px", gap: 10, alignItems: "center", marginTop: 12 }}>
              <KioskButton label="–" variant="secondary" size="xl" onClick={() => setQty(i.product.id, i.qty - 1)} />
              <div
                style={{
                  minHeight: 64,
                  borderRadius: 18,
                  border: "1px solid rgba(233,238,246,.12)",
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {i.qty}
              </div>
              <KioskButton label="+" variant="secondary" size="xl" onClick={() => setQty(i.product.id, i.qty + 1)} />
              <div style={{ textAlign: "right", fontSize: 22, fontWeight: 900 }}>
                {money(i.product.priceCents * i.qty)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>

    <KioskFooterSpacer />
    
    <KioskCartBar
      itemsCount={cart.items.reduce((a, it) => a + it.qty, 0)}
      total={totals.subtotalCents / 100}
      onViewCart={() => {}}
      onCheckout={() => setScreen("checkout")}
      checkoutDisabled={cart.items.length === 0}
    />
  </div>
);

}

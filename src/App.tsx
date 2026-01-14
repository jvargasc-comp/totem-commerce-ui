import { useEffect, useState } from 'react';
import CatalogScreen from './screens/CatalogScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import PaymentScreen from './screens/PaymentScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import { useCart } from './store/useCart';
import { cartTotals, setQty, clearCart } from './store/cart.store';


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
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Carrito</h2>
        <button onClick={() => setScreen('catalog')} style={{ padding: '10px 14px', fontSize: 16 }}>
          Seguir comprando
        </button>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {cart.items.map((i) => (
          <div
            key={i.product.id}
            style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>{i.product.name}</div>
            <div style={{ opacity: 0.7 }}>{money(i.product.priceCents)}</div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <button onClick={() => setQty(i.product.id, i.qty - 1)} style={{ padding: '8px 12px' }}>
                -
              </button>
              <div style={{ minWidth: 40, textAlign: 'center', fontSize: 18 }}>{i.qty}</div>
              <button onClick={() => setQty(i.product.id, i.qty + 1)} style={{ padding: '8px 12px' }}>
                +
              </button>
              <div style={{ marginLeft: 'auto', fontSize: 18 }}>
                {money(i.product.priceCents * i.qty)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 20 }}>
        Subtotal: <b>{money(totals.subtotalCents)}</b>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={clearCart} style={{ padding: '12px 16px', fontSize: 16 }}>
          Vaciar
        </button>
        <button
          disabled={cart.items.length === 0}
          style={{ padding: '12px 16px', fontSize: 16, marginLeft: 'auto' }}
          onClick={() => setScreen('checkout')}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

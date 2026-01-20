import { useEffect, useState } from 'react';
import CatalogScreen from './screens/CatalogScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import PaymentScreen from './screens/PaymentScreen';
import ReceiptScreen from './screens/ReceiptScreen';
import { useCart } from './store/useCart';
import { cartTotals, clearCart } from './store/cart.store';
import CartScreen from "./screens/CartScreen";

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
  <CartScreen
    onHome={() => setScreen("catalog")}
    onCheckout={() => setScreen("checkout")}
  />
  );

}

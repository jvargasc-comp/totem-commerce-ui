import { useEffect, useRef, useState } from 'react';
import { getReceipt } from '../api/orders.api';
import { clearCart } from '../store/cart.store';
import type { Receipt } from '../types/receipt';

type Props = {
  orderId: string;
  onNew: () => void;
};

const AUTO_BACK_SECONDS = 10;

export default function ReceiptScreen({ orderId, onNew }: Props) {
  const [data, setData] = useState<Receipt | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Inicializamos con el valor por defecto (no usamos Date.now en render)
  const [secondsLeft, setSecondsLeft] = useState<number>(AUTO_BACK_SECONDS);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    clearCart();

    getReceipt(orderId)
      .then(setData)
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : 'Error cargando recibo'),
      );

    // Limpia interval anterior
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Contador local dentro del effect (no es state)
    let remaining = AUTO_BACK_SECONDS;

    // Creamos una "suscripción" (interval) y SOLO hacemos setState dentro del callback
    intervalRef.current = window.setInterval(() => {
      // 1) publica el valor actual hacia React
      setSecondsLeft(remaining);

      // 2) decide si termina
      if (remaining <= 0) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onNew();
        return;
      }

      // 3) decrementa para el siguiente tick
      remaining -= 1;
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [orderId, onNew]);

  if (err) {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui', color: 'crimson' }}>
        {err}
        <div style={{ marginTop: 12 }}>
          <button onClick={onNew} style={{ padding: '12px 16px', fontSize: 16 }}>
            Nueva compra
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui' }}>
        Cargando recibo...
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 640 }}>
      <h2 style={{ marginTop: 0 }}>¡Gracias!</h2>

      <div>
        Orden: <b>{data.orderId}</b>
      </div>
      <div>
        Estado: <b>{data.status}</b>
      </div>

      <div style={{ marginTop: 16, fontSize: 18, opacity: 0.85 }}>
        Nueva compra en <b>{secondsLeft}</b> s
      </div>

      <div style={{ marginTop: 16 }}>
        {data.items.map((it) => (
          <div key={it.productId} style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              {it.name} x{it.qty}
            </div>
            <div>{(it.lineCents / 100).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 18 }}>
        Total: <b>{(data.totalCents / 100).toFixed(2)}</b>
      </div>

      <div style={{ marginTop: 12 }}>
        QR: <code>{data.qrString}</code>
      </div>

      <button
        onClick={onNew}
        style={{ marginTop: 16, padding: '12px 16px', fontSize: 18 }}
      >
        Nueva compra ahora
      </button>
    </div>
  );
}

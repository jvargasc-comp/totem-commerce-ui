import { useEffect, useState } from 'react';
import { createPaymentIntent, confirmPayment } from '../api/payments.api';
import { getOrderStatus } from '../api/orders.api';

type Props = {
  orderId: string;
  onPaid: () => void;
  onCancel: () => void;
};

export default function PaymentScreen({ orderId, onPaid, onCancel }: Props) {
  const [msg, setMsg] = useState('Iniciando pago...');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    async function run() {
      try {
        setErr(null);
        // 1) Intent
        const intent = await createPaymentIntent(orderId);
        const paymentId = intent.payment.id;

        if (!alive) return;
        setMsg('Confirmando pago (simulado)...');

        // 2) Confirm (simulado)
        await confirmPayment(paymentId);

        if (!alive) return;
        setMsg('Esperando confirmación...');

        // 3) Poll status hasta CONFIRMED
        const poll = async () => {
          const s = await getOrderStatus(orderId);
          if (!alive) return;
          if (s.status === 'CONFIRMED') {
            onPaid();
            return;
          }
          timer = window.setTimeout(poll, 1200);
        };

        poll();
      } catch (e: unknown) {
        if (!alive) return;
        setErr((e as Error)?.message ?? 'Error procesando pago');
      }
    }

    run();

    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, onPaid]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h2 style={{ marginTop: 0 }}>Pago</h2>
      <div style={{ fontSize: 18, marginTop: 12 }}>{msg}</div>
      {err && <div style={{ marginTop: 12, color: 'crimson' }}>{err}</div>}

      <div style={{ marginTop: 16 }}>
        <button onClick={onCancel} style={{ padding: '12px 16px', fontSize: 16 }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

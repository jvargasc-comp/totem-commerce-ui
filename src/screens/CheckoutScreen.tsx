import { useEffect, useMemo, useState } from 'react';
import { getDeliveryWindows, type DeliveryWindow } from '../api/delivery.api';
import { createOrder } from '../api/orders.api';
import { useCart } from '../store/useCart';
import { cartTotals } from '../store/cart.store';

type Props = {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
};

type OrderResponse = {
  id?: string;
  orderId?: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

export default function CheckoutScreen({ onBack, onOrderCreated }: Props) {
  const cart = useCart();
  const totals = cartTotals();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [windowId, setWindowId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (name.trim().length < 2) return false;
    if (phone.trim().length < 7) return false;
    return true;
  }, [cart.items.length, name, phone]);

  useEffect(() => {
    // ventanas de entrega (si el backend las tiene)
    getDeliveryWindows()
      .then((w) => setWindows(w))
      .catch(() => setWindows([])); // si falla, igual dejamos comprar sin delivery
  }, []);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        items: cart.items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        ...(windowId ? { deliveryWindowId: windowId } : {}),
      };

      const res = await createOrder(payload);
      // si tu backend responde { orderId: ... } cambia aquí
      const orderId = (res as OrderResponse).id ?? (res as OrderResponse).orderId;
      if (!orderId) throw new Error('Respuesta inválida de /orders');

      onOrderCreated(orderId);
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? 'Error creando la orden');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Checkout</h2>
        <button onClick={onBack} style={{ padding: '10px 14px', fontSize: 16 }}>
          Volver
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <div>Nombre</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Jorge Vargas"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <div>Teléfono</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 0991234567"
            style={{ padding: 10, fontSize: 16 }}
          />
        </label>

        {windows.length > 0 && (
          <label style={{ display: 'grid', gap: 6 }}>
            <div>Ventana de entrega (opcional)</div>
            <select
              value={windowId}
              onChange={(e) => setWindowId(e.target.value)}
              style={{ padding: 10, fontSize: 16 }}
            >
              <option value="">Sin entrega / retiro</option>
              {windows.map((w) => (
                <option key={w.id} value={w.id}>
                  {new Date(w.date).toLocaleDateString('es-EC')} {w.startTime}-{w.endTime}
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={{ marginTop: 8, fontSize: 18 }}>
          Total (aprox): <b>{money(totals.subtotalCents)}</b>
        </div>

        {err && <div style={{ color: 'crimson' }}>{err}</div>}

        <button
          disabled={!canSubmit || loading}
          onClick={submit}
          style={{ padding: '12px 16px', fontSize: 18 }}
        >
          {loading ? 'Creando orden...' : 'Continuar a pago'}
        </button>
      </div>

      <div style={{ marginTop: 18, opacity: 0.7 }}>
        * En el MVP no pedimos dirección aquí (si luego quieres delivery completo, lo agregamos).
      </div>
    </div>
  );
}

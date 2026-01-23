import { useEffect, useMemo, useRef, useState } from 'react';
import { getDeliveryWindows, type DeliveryWindow } from '../api/delivery.api';
import { createOrder, type CreateOrderPayload, type FulfillmentType, type DeliveryAddress } from '../api/orders.api';
import { useCart } from '../store/useCart';
import { cartTotals } from '../store/cart.store';
import { KioskPage } from '../components/kiosk/KioskPage';
import { KioskButton } from '../components/kiosk/KioskButton';
import { KioskStepBar } from '../components/kiosk/KioskStepBar';

type Props = {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
};

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '');
}

function formatEcMobile(digits: string) {
  const d = digitsOnly(digits).slice(0, 10);
  const p1 = d.slice(0, 4);
  const p2 = d.slice(4, 7);
  const p3 = d.slice(7, 10);
  return [p1, p2, p3].filter(Boolean).join(' ');
}

function isValidEcMobile(digits: string) {
  const d = digitsOnly(digits);
  return d.length === 10 && d.startsWith('09');
}

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatWindow(w: DeliveryWindow) {
  const d = new Date(w.date).toLocaleDateString('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  return `${d} ${w.startTime}-${w.endTime}`;
}

function KioskNumericKeypad(props: { onDigit: (d: string) => void; onBackspace: () => void; onClear: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {keys.map((k) => {
        const isAction = k === 'clear' || k === 'back';
        const label = k === 'clear' ? 'Limpiar' : k === 'back' ? '⌫ Borrar' : k;

        return (
          <button
            key={k}
            type='button'
            className='kioskTouch kioskNoSelect'
            onClick={() => {
              if (k === 'clear') return props.onClear();
              if (k === 'back') return props.onBackspace();
              props.onDigit(k);
            }}
            style={{
              minHeight: 72,
              borderRadius: 18,
              border: '1px solid rgba(233,238,246,.14)',
              background: isAction ? 'rgba(233,238,246,.06)' : 'var(--surface)',
              color: 'var(--text)',
              fontSize: 22,
              fontWeight: 900,
              boxShadow: '0 8px 20px rgba(0,0,0,.14)',
              touchAction: 'manipulation',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type AddressState = {
  line1: string;
  reference: string;
  city: string;
  zone: string;
  postalCode: string;
  notes: string;
};

export default function CheckoutScreen({ onBack, onOrderCreated }: Props) {
  const cart = useCart();
  const totals = cartTotals();

  // TODO: idealmente viene de selección de sucursal/farmacia
  const storeId = 'store-001';

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('PICKUP');

  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');

  const [address, setAddress] = useState<AddressState>({
    line1: '',
    reference: '',
    city: 'Quito',
    zone: '',
    postalCode: '',
    notes: '',
  });

  const [deliveryDate, setDeliveryDate] = useState<string>(todayISO());
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [windowId, setWindowId] = useState<string>('');

  const [loadingWindows, setLoadingWindows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const itemsCount = useMemo(() => cart.items.reduce((a, it) => a + it.qty, 0), [cart.items]);
  const phoneDisplay = useMemo(() => formatEcMobile(phoneDigits), [phoneDigits]);

  // Debounce + evitar repetición por StrictMode
  const fetchTimer = useRef<number | null>(null);
  const lastFetchKey = useRef<string>('');

  useEffect(() => {
    setErr(null);

    if (fulfillment !== 'DELIVERY') {
      setWindows([]);
      setWindowId('');
      lastFetchKey.current = '';
      if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
      fetchTimer.current = null;
      return;
    }

    if (!storeId || !deliveryDate) return;

    // ✅ OJO: NO enviar city/zone/postalCode porque tu backend los está rechazando
    const key = JSON.stringify({ storeId, date: deliveryDate });
    if (lastFetchKey.current === key) return;

    // debounce 250ms (para evitar spam cuando cambias la fecha o toggles)
    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(() => {
      lastFetchKey.current = key;
      setLoadingWindows(true);

      getDeliveryWindows({ storeId, date: deliveryDate })
        .then((w) => {
          const list = Array.isArray(w) ? w : [];
          setWindows(list);

          // si la ventana seleccionada ya no existe, reset
          if (windowId && !list.some((x) => x.id === windowId)) {
            setWindowId('');
          }
        })
        .catch((e: unknown) => {
          setWindows([]);
          setWindowId('');
          setErr(e instanceof Error ? e.message : 'No se pudieron cargar ventanas de entrega');
        })
        .finally(() => setLoadingWindows(false));
    }, 250);

    return () => {
      if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillment, storeId, deliveryDate]);

  const canSubmit = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (name.trim().length < 2) return false;
    if (!isValidEcMobile(phoneDigits)) return false;

    if (fulfillment === 'DELIVERY') {
      if (address.line1.trim().length < 5) return false;
      if (address.city.trim().length < 2) return false;
      if (address.zone.trim().length < 2) return false;
      if (!windowId) return false;
      if (windows.length === 0) return false;
      if (!windows.some((w) => w.id === windowId)) return false;
    }

    return true;
  }, [cart.items.length, name, phoneDigits, fulfillment, address, windowId, windows]);

  const appendDigit = (d: string) => setPhoneDigits((prev) => (prev + d).slice(0, 10));
  const backspace = () => setPhoneDigits((prev) => prev.slice(0, -1));
  const clearPhone = () => setPhoneDigits('');

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      if (cart.items.some((i) => !i.product?.id)) {
        setErr('Producto inválido en el carrito. Vuelve a seleccionar.');
        return;
      }

      const payloadBase: CreateOrderPayload = {
        customerName: name.trim(),
        customerPhone: digitsOnly(phoneDigits),
        items: cart.items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        fulfillmentType: fulfillment,
      };

      let payload: CreateOrderPayload = payloadBase;

      if (fulfillment === 'DELIVERY') {
        const deliveryAddress: DeliveryAddress = {
          line1: address.line1.trim(),
          reference: address.reference.trim() || undefined,
          city: address.city.trim(),
          zone: address.zone.trim(),
          postalCode: address.postalCode.trim() || undefined,
          notes: address.notes.trim() || undefined,
        };

        payload = {
          ...payloadBase,
          delivery: {
            storeId,
            date: deliveryDate,
            windowId,
            address: deliveryAddress,
          },
        };
      }

      const res = await createOrder(payload);
      if (!res?.id) throw new Error('Respuesta inválida al crear la orden');

      onOrderCreated(res.id);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error creando la orden');
    } finally {
      setLoading(false);
    }
  }

  const missing = useMemo(() => {
    const m: string[] = [];
    if (name.trim().length < 2) m.push('Nombre');
    if (!isValidEcMobile(phoneDigits)) m.push('Teléfono (09XXXXXXXX)');
    if (fulfillment === 'DELIVERY') {
      if (address.line1.trim().length < 5) m.push('Dirección (calle y número)');
      if (address.city.trim().length < 2) m.push('Ciudad');
      if (address.zone.trim().length < 2) m.push('Zona/Barrio');
      if (!windowId) m.push('Ventana de entrega');
    }
    return m;
  }, [name, phoneDigits, fulfillment, address, windowId]);

  return (
    <KioskPage title='Verificar compra' onHome={onBack} variant='portrait'>
      <KioskStepBar current='checkout' />

      <div style={{ maxWidth: 'var(--content-max, 820px)', margin: '0 auto' }}>
        {/* Resumen */}
        <div
          style={{
            border: '1px solid rgba(233,238,246,.12)',
            background: 'var(--surface)',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,.16)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900, flex: 1 }}>Resumen</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>{itemsCount} ítems</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Total (aprox.)</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{money(totals.subtotalCents)}</div>
          </div>
        </div>

        {/* Datos cliente */}
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Datos para la factura</div>

          <label style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 16, opacity: 0.85 }}>Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ej: Jorge Vargas'
              autoComplete='name'
              style={{
                padding: 16,
                fontSize: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(233,238,246,.14)',
                background: 'var(--surface)',
                color: 'var(--text)',
                minHeight: 64,
              }}
            />
          </label>

          {/* Teléfono + keypad */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 16, opacity: 0.85 }}>Teléfono</div>

            <div
              className='kioskNoSelect'
              style={{
                padding: 16,
                fontSize: 22,
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: isValidEcMobile(phoneDigits) ? 'rgba(47,125,255,.65)' : 'rgba(233,238,246,.14)',
                background: 'var(--surface)',
                color: 'var(--text)',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ opacity: phoneDisplay ? 1 : 0.7 }}>{phoneDisplay || '09__ ___ ___'}</span>
              <span style={{ fontSize: 16, opacity: 0.8 }}>{isValidEcMobile(phoneDigits) ? 'Listo ✓' : '10 dígitos'}</span>
            </div>

            <KioskNumericKeypad onDigit={appendDigit} onBackspace={backspace} onClear={clearPhone} />
          </div>

          {/* Fulfillment */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95, marginBottom: 10 }}>Entrega</div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type='button'
                onClick={() => setFulfillment('PICKUP')}
                className='kioskTouch kioskNoSelect'
                style={{
                  minHeight: 72,
                  padding: '0 18px',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: fulfillment === 'PICKUP' ? 'rgba(47,125,255,.65)' : 'rgba(233,238,246,.14)',
                  background: fulfillment === 'PICKUP' ? 'var(--primary)' : 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 18,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Retiro en farmacia</span>
                <span style={{ opacity: 0.9 }}>Gratis</span>
              </button>

              <button
                type='button'
                onClick={() => setFulfillment('DELIVERY')}
                className='kioskTouch kioskNoSelect'
                style={{
                  minHeight: 72,
                  padding: '0 18px',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: fulfillment === 'DELIVERY' ? 'rgba(47,125,255,.65)' : 'rgba(233,238,246,.14)',
                  background: fulfillment === 'DELIVERY' ? 'var(--primary)' : 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 18,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Envío a domicilio</span>
                <span style={{ opacity: 0.9 }}>Según zona</span>
              </button>
            </div>
          </div>

          {/* Delivery block */}
          {fulfillment === 'DELIVERY' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Dirección de envío</div>

              <label style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 16, opacity: 0.85 }}>Calle y número</div>
                <input
                  value={address.line1}
                  onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                  placeholder='Ej: Av. 6 de Diciembre N34-120'
                  style={{
                    padding: 16,
                    fontSize: 20,
                    borderRadius: 16,
                    border: '1px solid rgba(233,238,246,.14)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    minHeight: 64,
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 16, opacity: 0.85 }}>Referencia (opcional)</div>
                <input
                  value={address.reference}
                  onChange={(e) => setAddress((a) => ({ ...a, reference: e.target.value }))}
                  placeholder='Ej: Edificio Azul, depto 402'
                  style={{
                    padding: 16,
                    fontSize: 20,
                    borderRadius: 16,
                    border: '1px solid rgba(233,238,246,.14)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    minHeight: 64,
                  }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 16, opacity: 0.85 }}>Ciudad</div>
                  <input
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    style={{
                      padding: 16,
                      fontSize: 20,
                      borderRadius: 16,
                      border: '1px solid rgba(233,238,246,.14)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      minHeight: 64,
                    }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 16, opacity: 0.85 }}>Zona / Barrio</div>
                  <input
                    value={address.zone}
                    onChange={(e) => setAddress((a) => ({ ...a, zone: e.target.value }))}
                    placeholder='Ej: La Carolina'
                    style={{
                      padding: 16,
                      fontSize: 20,
                      borderRadius: 16,
                      border: '1px solid rgba(233,238,246,.14)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      minHeight: 64,
                    }}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 16, opacity: 0.85 }}>Fecha de entrega</div>
                <input
                  type='date'
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    padding: 16,
                    fontSize: 20,
                    borderRadius: 16,
                    border: '1px solid rgba(233,238,246,.14)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    minHeight: 64,
                  }}
                />
              </label>

              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 10 }}>Ventana de entrega</div>

                {loadingWindows && (
                  <div style={{ padding: 12, borderRadius: 14, background: 'rgba(233,238,246,.06)' }}>Cargando ventanas…</div>
                )}

                {!loadingWindows && windows.length === 0 && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: '1px solid rgba(255,193,7,.25)',
                      background: 'rgba(255,193,7,.12)',
                      color: 'white',
                      fontWeight: 800,
                    }}
                  >
                    No hay ventanas disponibles (prueba otra fecha).
                  </div>
                )}

                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  {windows.map((w) => {
                    const active = windowId === w.id;
                    return (
                      <button
                        key={w.id}
                        type='button'
                        onClick={() => setWindowId(w.id)}
                        className='kioskTouch kioskNoSelect'
                        style={{
                          minHeight: 72,
                          padding: '0 18px',
                          borderRadius: 18,
                          border: active ? '1px solid rgba(47,125,255,.65)' : '1px solid rgba(233,238,246,.14)',
                          background: active ? 'var(--primary)' : 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: 18,
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{formatWindow(w)}</span>
                        <span style={{ opacity: 0.9 }}>Entrega</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(255,59,48,.28)',
                background: 'rgba(255,59,48,.16)',
                color: 'white',
                fontWeight: 800,
              }}
            >
              {err}
            </div>
          )}

          {missing.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: '1px solid rgba(255,193,7,.25)',
                background: 'rgba(255,193,7,.12)',
                color: 'white',
                fontWeight: 800,
              }}
            >
              Completa: {missing.join(' • ')}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            <KioskButton
              label={loading ? 'Creando orden...' : 'Continuar a pago'}
              variant='primary'
              size='xl'
              onClick={submit}
              disabled={!canSubmit || loading}
            />

            <KioskButton label='Volver' variant='secondary' size='xl' onClick={onBack} disabled={loading} />
          </div>
        </div>
      </div>
    </KioskPage>
  );
}

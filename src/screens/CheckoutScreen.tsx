import { useEffect, useMemo, useRef, useState } from 'react';
import { getDeliveryWindows, type DeliveryWindow } from '../api/delivery.api';
import {
  createOrder,
  type CreateOrderPayload,
  type FulfillmentType,
  type DeliveryAddress,
} from '../api/orders.api';
import { useCart } from '../store/useCart';
import { cartTotals } from '../store/cart.store';
import { KioskPage } from '../components/kiosk/KioskPage';
import { KioskButton } from '../components/kiosk/KioskButton';
import { KioskStepBar } from '../components/kiosk/KioskStepBar';
import OnScreenKeyboardModal from '../components/OnScreenKeyboardModal';
import CityPickerModal from '../components/CityPickerModal';

type Props = {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
};

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
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

function KioskNumericKeypad(props: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
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

type KbdField = 'name' | 'line1' | 'reference' | 'city_text' | 'zone';

function fieldMeta(field: KbdField) {
  switch (field) {
    case 'name':
      return { title: 'Nombre', placeholder: 'Ej: Jorge Vargas', maxLength: 50 };
    case 'line1':
      return { title: 'Calle y número', placeholder: 'Ej: Av. 6 de Diciembre N34-120', maxLength: 120 };
    case 'reference':
      return { title: 'Referencia (opcional)', placeholder: 'Ej: Edificio Azul, depto 402', maxLength: 80 };
    case 'city_text':
      return { title: 'Ciudad', placeholder: 'Escribe tu ciudad…', maxLength: 40 };
    case 'zone':
      return { title: 'Zona / Barrio', placeholder: 'Ej: La Carolina', maxLength: 40 };
  }
}

function TextFieldButton(props: {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 16, opacity: 0.85 }}>{props.label}</div>

      <button
        type='button'
        onClick={props.onClick}
        className='kioskTouch kioskNoSelect'
        style={{
          width: '100%',
          minHeight: 64,
          padding: 16,
          fontSize: 20,
          borderRadius: 16,
          border: '1px solid rgba(233,238,246,.14)',
          background: 'var(--surface)',
          color: 'var(--text)',
          textAlign: 'left',
          touchAction: 'manipulation',
        }}
      >
        {props.value?.trim()?.length ? props.value : <span style={{ opacity: 0.6 }}>{props.placeholder}</span>}
      </button>
    </div>
  );
}

function normalizeCity(s: string) {
  return (s || '').trim().toLowerCase();
}

function getDhlShippingCents(city: string) {
  const c = normalizeCity(city);
  if (!c) return 0;
  if (c === 'guayaquil' || c === 'quito') return 500;
  return 1000; // resto
}

// ✅ coherencia con Catalog: si no viene isDeliverable, asumimos true
function isDeliverableProduct(product: { isDeliverable?: boolean }) {
  const v = product?.isDeliverable;
  return typeof v === 'boolean' ? v : true;
}

export default function CheckoutScreen({ onBack, onOrderCreated }: Props) {
  const cart = useCart();
  const totals = cartTotals();

  const storeId = 'store-001';
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('PICKUP');

  // ✅ detecta si el carrito tiene productos NO deliverables
  const nonDeliverableItems = useMemo(() => {
    return cart.items
      .filter((it) => !isDeliverableProduct(it.product))
      .map((it) => it.product?.name)
      .filter(Boolean) as string[];
  }, [cart.items]);

  const deliveryAllowed = nonDeliverableItems.length === 0;

  // Si el usuario tenía DELIVERY seleccionado pero ya no es posible, fuerza PICKUP
  useEffect(() => {
    if (fulfillment === 'DELIVERY' && !deliveryAllowed) {
      setFulfillment('PICKUP');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAllowed]);

  // Datos cliente
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');

  // Dirección
  const [address, setAddress] = useState<AddressState>({
    line1: '',
    reference: '',
    city: 'Guayaquil',
    zone: '',
    postalCode: '',
    notes: '',
  });

  // Teclado on-screen (para todos los textos)
  const [kbdOpen, setKbdOpen] = useState(false);
  const [kbdField, setKbdField] = useState<KbdField>('name');

  const openKeyboard = (field: KbdField) => {
    setKbdField(field);
    setKbdOpen(true);
  };

  const meta = fieldMeta(kbdField);

  const kbdValue = useMemo(() => {
    switch (kbdField) {
      case 'name':
        return name;
      case 'line1':
        return address.line1;
      case 'reference':
        return address.reference;
      case 'city_text':
        return address.city;
      case 'zone':
        return address.zone;
    }
  }, [kbdField, name, address]);

  // Modal de ciudad (combo)
  const ECUADOR_CITIES = useMemo(
    () => [
      'Guayaquil',
      'Quito',
      'Cuenca',
      'Portoviejo',
      'Manta',
      'Machala',
      'Ambato',
      'Loja',
      'Esmeraldas',
      'Santo Domingo',
    ],
    []
  );
  const [cityModalOpen, setCityModalOpen] = useState(false);

  // Ventanas de entrega
  const [deliveryDate, setDeliveryDate] = useState<string>(todayISO());
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [windowId, setWindowId] = useState<string>('');

  const [loadingWindows, setLoadingWindows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const itemsCount = useMemo(
    () => cart.items.reduce((a, it) => a + it.qty, 0),
    [cart.items]
  );
  const phoneDisplay = useMemo(() => formatEcMobile(phoneDigits), [phoneDigits]);

  const shippingCents = useMemo(() => {
    if (fulfillment !== 'DELIVERY') return 0;
    return getDhlShippingCents(address.city);
  }, [fulfillment, address.city]);

  const totalWithShippingCents = useMemo(
    () => totals.subtotalCents + shippingCents,
    [totals.subtotalCents, shippingCents]
  );

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

    const key = JSON.stringify({ storeId, date: deliveryDate });
    if (lastFetchKey.current === key) return;

    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(() => {
      lastFetchKey.current = key;
      setLoadingWindows(true);

      getDeliveryWindows({ storeId, date: deliveryDate })
        .then((w) => {
          const list = Array.isArray(w) ? w : [];
          setWindows(list);
          if (windowId && !list.some((x) => x.id === windowId)) setWindowId('');
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
      if (!deliveryAllowed) return false;
      if (address.line1.trim().length < 5) return false;
      if (address.city.trim().length < 2) return false;
      if (address.zone.trim().length < 2) return false;
      if (!windowId) return false;
      if (windows.length === 0) return false;
      if (!windows.some((w) => w.id === windowId)) return false;
    }

    return true;
  }, [cart.items.length, name, phoneDigits, fulfillment, address, windowId, windows, deliveryAllowed]);

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
        if (!deliveryAllowed) {
          setErr('Tu carrito incluye productos que no aplican para entrega a domicilio. Elige Retiro.');
          return;
        }

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
          shippingCents,
          shippingProvider: 'DHL_SIMULATED',
        };
      }

      const res = await createOrder(payload);
      if (!res?.id) throw new Error('Respuesta inválida al crear la orden');
      onOrderCreated(res.id);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Error creando la orden';
      setErr(typeof msg === 'string' ? msg : 'Error creando la orden');
    } finally {
      setLoading(false);
    }
  }

  const missing = useMemo(() => {
    const m: string[] = [];
    if (name.trim().length < 2) m.push('Nombre');
    if (!isValidEcMobile(phoneDigits)) m.push('Teléfono (09XXXXXXXX)');
    if (fulfillment === 'DELIVERY') {
      if (!deliveryAllowed) m.push('Carrito solo retiro');
      if (address.line1.trim().length < 5) m.push('Dirección (calle y número)');
      if (address.city.trim().length < 2) m.push('Ciudad');
      if (address.zone.trim().length < 2) m.push('Zona/Barrio');
      if (!windowId) m.push('Ventana de entrega');
    }
    return m;
  }, [name, phoneDigits, fulfillment, address, windowId, deliveryAllowed]);

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
            <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Subtotal (aprox.)</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(totals.subtotalCents)}</div>
          </div>

          {fulfillment === 'DELIVERY' && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Envío DHL (simulado)</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{money(shippingCents)}</div>
            </div>
          )}

          {/* ✅ Total final siempre visible */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Total final</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{money(totalWithShippingCents)}</div>
          </div>
        </div>

        {/* Aviso carrito solo retiro */}
        {!deliveryAllowed && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: '1px solid rgba(255,193,7,.25)',
              background: 'rgba(255,193,7,.12)',
              color: 'white',
              fontWeight: 900,
              display: 'grid',
              gap: 6,
            }}
          >
            <div>Tu carrito incluye productos que no aplican para entrega a domicilio.</div>
            <div style={{ fontWeight: 800, opacity: 0.9, fontSize: 14 }}>
              Solo retiro: {nonDeliverableItems.slice(0, 3).join(' · ')}
              {nonDeliverableItems.length > 3 ? ' · ...' : ''}
            </div>
          </div>
        )}

        {/* Datos cliente */}
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>
            Datos para la factura
          </div>

          <TextFieldButton
            label='Nombre'
            value={name}
            placeholder='Toca para ingresar nombre…'
            onClick={() => openKeyboard('name')}
          />

          {/* Teléfono */}
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
                borderColor: isValidEcMobile(phoneDigits)
                  ? 'rgba(47,125,255,.65)'
                  : 'rgba(233,238,246,.14)',
                background: 'var(--surface)',
                color: 'var(--text)',
                minHeight: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ opacity: phoneDisplay ? 1 : 0.7 }}>
                {phoneDisplay || '09__ ___ ___'}
              </span>
              <span style={{ fontSize: 16, opacity: 0.8 }}>
                {isValidEcMobile(phoneDigits) ? 'Listo ✓' : '10 dígitos'}
              </span>
            </div>

            <KioskNumericKeypad
              onDigit={appendDigit}
              onBackspace={backspace}
              onClear={clearPhone}
            />
          </div>

          {/* Fulfillment */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95, marginBottom: 10 }}>
              Entrega
            </div>

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
                  borderColor:
                    fulfillment === 'PICKUP'
                      ? 'rgba(47,125,255,.65)'
                      : 'rgba(233,238,246,.14)',
                  background:
                    fulfillment === 'PICKUP' ? 'var(--primary)' : 'var(--surface)',
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
                onClick={() => {
                  if (deliveryAllowed) setFulfillment('DELIVERY');
                }}
                disabled={!deliveryAllowed}
                className='kioskTouch kioskNoSelect'
                style={{
                  minHeight: 72,
                  padding: '0 18px',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor:
                    fulfillment === 'DELIVERY'
                      ? 'rgba(47,125,255,.65)'
                      : 'rgba(233,238,246,.14)',
                  background:
                    fulfillment === 'DELIVERY' ? 'var(--primary)' : 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 18,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: deliveryAllowed ? 1 : 0.55,
                  cursor: deliveryAllowed ? 'pointer' : 'not-allowed',
                }}
              >
                <span>Envío a domicilio</span>
                <span style={{ opacity: 0.9 }}>
                  {deliveryAllowed ? 'DHL' : 'No disponible'}
                </span>
              </button>

              {/* ✅ micro-explicación pegada al botón (touch kiosk friendly) */}
              {!deliveryAllowed && (
                <div
                  style={{
                    marginTop: 2,
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid rgba(255,193,7,.22)',
                    background: 'rgba(255,193,7,.10)',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  No disponible: tu carrito incluye productos “Solo retiro”.
                </div>
              )}
            </div>
          </div>

          {/* Delivery block */}
          {fulfillment === 'DELIVERY' && (
            <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>
                Dirección de envío
              </div>

              <TextFieldButton
                label='Calle y número'
                value={address.line1}
                placeholder='Toca para ingresar calle y número…'
                onClick={() => openKeyboard('line1')}
              />

              <TextFieldButton
                label='Referencia (opcional)'
                value={address.reference}
                placeholder='Toca para ingresar referencia…'
                onClick={() => openKeyboard('reference')}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Ciudad combo/modal */}
                <TextFieldButton
                  label='Ciudad'
                  value={address.city}
                  placeholder='Toca para seleccionar ciudad…'
                  onClick={() => setCityModalOpen(true)}
                />

                <TextFieldButton
                  label='Zona / Barrio'
                  value={address.zone}
                  placeholder='Toca para ingresar zona…'
                  onClick={() => openKeyboard('zone')}
                />
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
                <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 10 }}>
                  Ventana de entrega
                </div>

                {loadingWindows && (
                  <div style={{ padding: 12, borderRadius: 14, background: 'rgba(233,238,246,.06)' }}>
                    Cargando ventanas…
                  </div>
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
                          border: active
                            ? '1px solid rgba(47,125,255,.65)'
                            : '1px solid rgba(233,238,246,.14)',
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

            <KioskButton
              label='Volver'
              variant='secondary'
              size='xl'
              onClick={onBack}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Modal de teclado */}
      <OnScreenKeyboardModal
        open={kbdOpen}
        title={meta.title}
        placeholder={meta.placeholder}
        initialValue={kbdValue}
        maxLength={meta.maxLength}
        onCancel={() => setKbdOpen(false)}
        onConfirm={(val) => {
          const v = val.trim();
          switch (kbdField) {
            case 'name':
              setName(v);
              break;
            case 'line1':
              setAddress((a) => ({ ...a, line1: v }));
              break;
            case 'reference':
              setAddress((a) => ({ ...a, reference: v }));
              break;
            case 'city_text':
              setAddress((a) => ({ ...a, city: v }));
              break;
            case 'zone':
              setAddress((a) => ({ ...a, zone: v }));
              break;
          }
          setKbdOpen(false);
        }}
      />

      {/* Modal de ciudades */}
      <CityPickerModal
        open={cityModalOpen}
        title='Ciudad (Ecuador)'
        cities={ECUADOR_CITIES}
        selected={address.city}
        onClose={() => setCityModalOpen(false)}
        onSelect={(city) => {
          setAddress((a) => ({ ...a, city }));
          setCityModalOpen(false);
        }}
        onOtherCity={() => {
          setCityModalOpen(false);
          openKeyboard('city_text');
        }}
      />
    </KioskPage>
  );
}

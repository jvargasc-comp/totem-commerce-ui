import { useEffect, useMemo, useState } from 'react';
import { KioskPage } from '../components/kiosk/KioskPage';
import { KioskButton } from '../components/kiosk/KioskButton';
import { KioskStepBar } from '../components/kiosk/KioskStepBar';
import { getReceipt } from '../api/orders.api';
import type { Receipt } from '../types/receipt';

type Props = {
  orderId: string;
  onNew: () => void; // en tu App.tsx resetea carrito y vuelve a catálogo
};

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatISODate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'short' });
}

export default function ReceiptScreen({ orderId, onNew }: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await getReceipt(orderId);
      setReceipt(r);
    } catch (e: unknown) {
      setReceipt(null);
      setErr(e instanceof Error ? e.message : 'No se pudo cargar el recibo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const itemsCount = useMemo(() => (receipt ? receipt.items.reduce((a, it) => a + it.qty, 0) : 0), [receipt]);

  return (
    <KioskPage title='Recibo' onHome={onNew} variant='portrait'>
      <KioskStepBar current='receipt' />

      <div style={{ maxWidth: 'var(--content-max, 820px)', margin: '0 auto' }}>
        {/* Encabezado */}
        <div
          style={{
            border: '1px solid rgba(233,238,246,.12)',
            background: 'var(--surface)',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,.16)',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 900, flex: 1 }}>¡Compra registrada!</div>

            {receipt?.status ? (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'rgba(47,125,255,.35)',
                  background: 'rgba(47,125,255,.14)',
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                {receipt.status}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ opacity: 0.85, fontSize: 16 }}>Orden</div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.2px' }}>#{orderId}</div>
            {receipt?.createdAt ? <div style={{ opacity: 0.75, fontSize: 15 }}>{formatDateTime(receipt.createdAt)}</div> : null}
          </div>

          {loading && (
            <div style={{ padding: 12, borderRadius: 14, background: 'rgba(233,238,246,.06)' }}>
              Cargando recibo…
            </div>
          )}

          {!loading && err && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: 'rgba(255,59,48,.28)',
                background: 'rgba(255,59,48,.16)',
                color: 'white',
                fontWeight: 800,
                display: 'grid',
                gap: 10,
              }}
            >
              <div>{err}</div>
              <KioskButton label='Reintentar' variant='secondary' size='lg' onClick={load} />
            </div>
          )}
        </div>

        {/* Contenido */}
        {!loading && receipt && (
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            {/* Resumen + totales */}
            <div
              style={{
                border: '1px solid rgba(233,238,246,.12)',
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,.14)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95, flex: 1 }}>Resumen</div>
                <div style={{ fontSize: 15, opacity: 0.8 }}>{itemsCount} ítems</div>
              </div>

              <div style={{ display: 'grid', gap: 8, fontSize: 16 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, opacity: 0.85 }}>Subtotal</div>
                  <div style={{ fontWeight: 900 }}>{money(receipt.subtotalCents)}</div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, opacity: 0.85 }}>Envío</div>
                  <div style={{ fontWeight: 900 }}>{money(receipt.deliveryCents)}</div>
                </div>

                <div style={{ height: 1, background: 'rgba(233,238,246,.10)', margin: '4px 0' }} />

                <div style={{ display: 'flex', gap: 10, fontSize: 18 }}>
                  <div style={{ flex: 1, opacity: 0.95, fontWeight: 900 }}>Total</div>
                  <div style={{ fontWeight: 900 }}>{money(receipt.totalCents)}</div>
                </div>
              </div>
            </div>

            {/* Cliente + entrega */}
            <div
              style={{
                border: '1px solid rgba(233,238,246,.12)',
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,.14)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Datos del cliente</div>

              <div style={{ display: 'grid', gap: 6, fontSize: 16 }}>
                <div>
                  <span style={{ opacity: 0.8 }}>Nombre:</span> <b>{receipt.customerName}</b>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Teléfono:</span> <b>{receipt.customerPhone}</b>
                </div>
              </div>

              {receipt.address ? (
                <div style={{ marginTop: 6, display: 'grid', gap: 6, fontSize: 16 }}>
                  <div style={{ fontWeight: 900, opacity: 0.95 }}>Dirección de envío</div>
                  <div style={{ opacity: 0.9 }}>
                    {receipt.address.line1}
                    {receipt.address.reference ? ` · ${receipt.address.reference}` : ''}
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    {[receipt.address.city, receipt.address.zone].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ) : null}

              {receipt.delivery ? (
                <div style={{ marginTop: 6, display: 'grid', gap: 6, fontSize: 16 }}>
                  <div style={{ fontWeight: 900, opacity: 0.95 }}>Ventana de entrega</div>
                  <div style={{ opacity: 0.9 }}>
                    {formatISODate(receipt.delivery.date)} {receipt.delivery.startTime}-{receipt.delivery.endTime}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Items */}
            <div
              style={{
                border: '1px solid rgba(233,238,246,.12)',
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,.14)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95, flex: 1 }}>Productos</div>
                <div style={{ fontSize: 15, opacity: 0.8 }}>{receipt.items.length} líneas</div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {receipt.items.map((it) => (
                  <div
                    key={`${it.productId}-${it.name}`}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      borderColor: 'rgba(233,238,246,.10)',
                      background: 'rgba(233,238,246,.04)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{it.name}</div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 15, opacity: 0.85 }}>
                      <div style={{ flex: 1 }}>
                        {it.qty} × {money(it.unitCents)}
                      </div>
                      <div style={{ fontWeight: 900 }}>{money(it.lineCents)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pago + QR */}
            <div
              style={{
                border: '1px solid rgba(233,238,246,.12)',
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,.14)',
                display: 'grid',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Pago</div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: 'rgba(233,238,246,.10)',
                  background: 'rgba(233,238,246,.04)',
                  fontSize: 15,
                  opacity: 0.9,
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div>
                  <span style={{ opacity: 0.8 }}>Proveedor:</span>{' '}
                  <b>{receipt.payment?.provider ?? 'SIMULATED'}</b>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Estado:</span>{' '}
                  <b>{receipt.payment?.status ?? 'INITIATED'}</b>
                </div>
                <div>
                  <span style={{ opacity: 0.8 }}>Monto:</span>{' '}
                  <b>
                    {money(receipt.payment?.amountCents ?? receipt.totalCents)}{' '}
                    {receipt.payment?.currency ?? 'USD'}
                  </b>
                </div>
                {receipt.payment?.externalRef ? (
                  <div style={{ opacity: 0.85 }}>
                    Ref: <b>{receipt.payment.externalRef}</b>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>
                QR: <span style={{ fontFamily: 'monospace' }}>{receipt.qrString}</span>
              </div>
            </div>

            {/* Acciones */}
            <div style={{ marginTop: 6, display: 'grid', gap: 12 }}>
              <KioskButton label='Nuevo pedido' variant='primary' size='xl' onClick={onNew} />
              <KioskButton label='Volver al inicio' variant='secondary' size='xl' onClick={onNew} />
            </div>
          </div>
        )}
      </div>
    </KioskPage>
  );
}

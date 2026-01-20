import React, { useEffect, useMemo, useState } from "react";
import { getDeliveryWindows, type DeliveryWindow } from "../api/delivery.api";
import { createOrder } from "../api/orders.api";
import { useCart } from "../store/useCart";
import { cartTotals } from "../store/cart.store";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskStepBar } from "../components/kiosk/KioskStepBar";

type Props = {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
};

type OrderResponse = {
  id?: string;
  orderId?: string;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

function formatWindow(w: DeliveryWindow) {
  const d = new Date(w.date).toLocaleDateString("es-EC");
  return `${d} ${w.startTime}-${w.endTime}`;
}

export default function CheckoutScreen({ onBack, onOrderCreated }: Props) {
  const cart = useCart();
  const totals = cartTotals();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [windowId, setWindowId] = useState<string>(""); // "" = retiro / sin entrega
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const itemsCount = useMemo(() => cart.items.reduce((a, it) => a + it.qty, 0), [cart]);

  const canSubmit = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (name.trim().length < 2) return false;
    if (phone.trim().length < 7) return false;
    return true;
  }, [cart.items.length, name, phone]);

  useEffect(() => {
    getDeliveryWindows()
      .then((w) => setWindows(Array.isArray(w) ? w : []))
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
      const orderId = (res as OrderResponse).id ?? (res as OrderResponse).orderId;
      if (!orderId) throw new Error("Respuesta inválida de /orders");

      onOrderCreated(orderId);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error creando la orden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KioskPage title="Verificar compra" onHome={onBack} variant="portrait">
      <KioskStepBar current="checkout" />
      <div style={{ maxWidth: "var(--content-max, 820px)", margin: "0 auto" }}>
        {/* Resumen superior */}
        <div
          style={{
            border: "1px solid rgba(233,238,246,.12)",
            background: "var(--surface)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900, flex: 1 }}>Resumen</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>{itemsCount} ítems</div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Total (aprox.)</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{money(totals.subtotalCents)}</div>
          </div>

          {cart.items.length === 0 && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,59,48,.28)",
                background: "rgba(255,59,48,.16)",
                color: "white",
                fontWeight: 800,
              }}
            >
              Tu carrito está vacío. Vuelve y agrega productos.
            </div>
          )}
        </div>

        {/* Datos del cliente */}
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Datos para la factura</div>

          <label style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 16, opacity: 0.85 }}>Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Jorge Vargas"
              autoComplete="name"
              style={{
                padding: 16,
                fontSize: 20,
                borderRadius: 16,
                border: "1px solid rgba(233,238,246,.14)",
                background: "var(--surface)",
                color: "var(--text)",
                minHeight: 64,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 16, opacity: 0.85 }}>Teléfono</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 0991234567"
              inputMode="tel"
              enterKeyHint="done"
              autoComplete="tel"
              style={{
                padding: 16,
                fontSize: 20,
                borderRadius: 16,
                border: "1px solid rgba(233,238,246,.14)",
                background: "var(--surface)",
                color: "var(--text)",
                minHeight: 64,
              }}
            />
          </label>

          {/* Ventanas de entrega: pills grandes (opcional) */}
          {windows.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 10 }}>
                Entrega (opcional) — si no eliges, es retiro en farmacia
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                }}
              >
                {/* Retiro */}
                <button
                  type="button"
                  onClick={() => setWindowId("")}
                  className="kioskTouch kioskNoSelect"
                  style={{
                    minHeight: 72,
                    padding: "0 18px",
                    borderRadius: 18,
                    border: windowId === "" ? "1px solid rgba(47,125,255,.65)" : "1px solid rgba(233,238,246,.14)",
                    background: windowId === "" ? "var(--primary)" : "var(--surface)",
                    color: "var(--text)",
                    fontSize: 18,
                    fontWeight: 900,
                    letterSpacing: ".2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: windowId === "" ? "0 10px 26px rgba(47,125,255,.20)" : "none",
                  }}
                >
                  <span>Retiro en farmacia</span>
                  <span style={{ opacity: 0.9 }}>Gratis</span>
                </button>

                {windows.map((w) => {
                  const active = windowId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWindowId(w.id)}
                      className="kioskTouch kioskNoSelect"
                      style={{
                        minHeight: 72,
                        padding: "0 18px",
                        borderRadius: 18,
                        border: active ? "1px solid rgba(47,125,255,.65)" : "1px solid rgba(233,238,246,.14)",
                        background: active ? "var(--primary)" : "var(--surface)",
                        color: "var(--text)",
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: ".2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        boxShadow: active ? "0 10px 26px rgba(47,125,255,.20)" : "none",
                      }}
                    >
                      <span>{formatWindow(w)}</span>
                      <span style={{ opacity: 0.9 }}>Entrega</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,59,48,.28)",
                background: "rgba(255,59,48,.16)",
                color: "white",
                fontWeight: 800,
              }}
            >
              {err}
            </div>
          )}

          {/* Acciones */}
          <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
            <KioskButton
              label={loading ? "Creando orden..." : "Continuar a pago"}
              variant="primary"
              size="xl"
              onClick={submit}
              disabled={!canSubmit || loading}
            />

            <KioskButton
              label="Volver"
              variant="secondary"
              size="xl"
              onClick={onBack}
              disabled={loading}
            />

            <div style={{ marginTop: 6, opacity: 0.75, fontSize: 16 }}>
              * En el MVP no pedimos dirección aquí (si luego quieres delivery completo, lo agregamos).
            </div>
          </div>
        </div>
      </div>
    </KioskPage>
  );
}

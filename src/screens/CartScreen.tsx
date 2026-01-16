import { useEffect, useMemo, useState } from "react";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskCartBar } from "../components/kiosk/KioskCartBar";
import { getCartSnapshot, subscribeCart, setQty, clearCart } from "../store/cart.store";

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

export default function CartScreen(props: { onBack: () => void; onCheckout: () => void }) {
  const [cart, setCart] = useState(() => getCartSnapshot());

  useEffect(() => {
    return subscribeCart(() => {
      const snap = getCartSnapshot();
      // fuerza nueva referencia (tu store muta state.items con push)
      setCart({ items: snap.items.map((i) => ({ ...i })) });
    });
  }, []);

  const itemsCount = useMemo(() => cart.items.reduce((a, i) => a + i.qty, 0), [cart]);
  const totalCents = useMemo(
    () => cart.items.reduce((a, i) => a + i.product.priceCents * i.qty, 0),
    [cart]
  );

  return (
    <div className="kioskScreen kioskNoSelect kioskContentWithFooter" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 240 }}>
          <KioskButton label="Seguir comprando" variant="secondary" size="xl" onClick={props.onBack} />
        </div>
        <h2 style={{ margin: 0, flex: 1, fontSize: 28, letterSpacing: ".2px" }}>Carrito</h2>
        <div style={{ width: 220 }}>
          <KioskButton
            label="Vaciar"
            variant="ghost"
            size="xl"
            onClick={() => clearCart()}
            disabled={itemsCount === 0}
          />
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 900 }}>
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
            Tu carrito está vacío. Toca “Seguir comprando”.
          </div>
        ) : (
          cart.items.map((it) => (
            <div
              key={it.product.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 220px",
                gap: 12,
                alignItems: "center",
                padding: 14,
                borderRadius: 18,
                border: "1px solid rgba(233,238,246,.12)",
                background: "var(--surface)",
                boxShadow: "0 8px 24px rgba(0,0,0,.16)",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{it.product.name}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>{it.product.brand ?? ""}</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>
                  {money(it.product.priceCents)}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <KioskButton
                  label="–"
                  variant="secondary"
                  size="xl"
                  onClick={() => setQty(it.product.id, it.qty - 1)}
                />
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
                  {it.qty}
                </div>
                <KioskButton
                  label="+"
                  variant="secondary"
                  size="xl"
                  onClick={() => setQty(it.product.id, it.qty + 1)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <KioskCartBar
        itemsCount={itemsCount}
        total={totalCents / 100}
        onViewCart={() => {}}
        onCheckout={props.onCheckout}
        checkoutDisabled={itemsCount === 0}
      />
    </div>
  );
}

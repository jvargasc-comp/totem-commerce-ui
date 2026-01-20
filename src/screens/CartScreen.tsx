import { useMemo } from "react";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskCartBar } from "../components/kiosk/KioskCartBar";
import { KioskFooterSpacer } from "../components/kiosk/KioskFooterSpacer";
import { cartTotals, setQty, clearCart } from "../store/cart.store";
import { useCart } from "../store/useCart";
import { KioskStepBar } from "../components/kiosk/KioskStepBar";

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

export default function CartScreen(props: { onHome: () => void; onCheckout: () => void }) {
  const cart = useCart();
  const totals = cartTotals();

  const itemsCount = useMemo(() => cart.items.reduce((a, it) => a + it.qty, 0), [cart]);
  const totalCents = totals.subtotalCents;

  return (
    <KioskPage
      title="Carrito"
      onHome={props.onHome}
      variant="portrait"
    >
      <KioskStepBar current="cart" />
      {/* Acciones rápidas arriba */}
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <div style={{ width: 220 }}>
          <KioskButton
            label="Vaciar"
            variant="ghost"
            size="xl"
            onClick={clearCart}
            disabled={cart.items.length === 0}
          />
        </div>
      </div>

      {/* Lista de items */}
      <div style={{ marginTop: 16, maxWidth: 1100, marginLeft: "auto", marginRight: "auto", display: "grid", gap: 12 }}>
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
            Tu carrito está vacío. Toca <b>Inicio</b> para agregar productos.
          </div>
        ) : (
          cart.items.map((i) => (
            <div
              key={i.product.id}
              style={{
                border: "1px solid rgba(233,238,246,.12)",
                background: "var(--surface)",
                borderRadius: 18,
                padding: 14,
                boxShadow: "0 8px 24px rgba(0,0,0,.16)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <div style={{ fontWeight: 900, fontSize: 20, flex: 1 }}>{i.product.name}</div>
                <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.9 }}>{money(i.product.priceCents)}</div>
              </div>

              {i.product.brand ? (
                <div style={{ opacity: 0.75, marginTop: 4 }}>{i.product.brand}</div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 120px 180px",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <KioskButton
                  label="–"
                  variant="secondary"
                  size="xl"
                  onClick={() => setQty(i.product.id, i.qty - 1)}
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
                  {i.qty}
                </div>

                <KioskButton
                  label="+"
                  variant="secondary"
                  size="xl"
                  onClick={() => setQty(i.product.id, i.qty + 1)}
                />

                <div style={{ textAlign: "right", fontSize: 22, fontWeight: 900 }}>
                  {money(i.product.priceCents * i.qty)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Spacer anti-tapa + Barra inferior */}
      <KioskFooterSpacer />
      <KioskCartBar
        itemsCount={itemsCount}
        total={totalCents / 100}
        onViewCart={() => {}}
        onCheckout={props.onCheckout}
        checkoutDisabled={cart.items.length === 0}
      />
    </KioskPage>
  );
}

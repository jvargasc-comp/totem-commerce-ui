import React from "react";
import { KioskButton } from "./KioskButton";

export type KioskCartBarProps = {
  itemsCount: number;
  total: number; // en tu moneda (ej. USD)
  onViewCart: () => void;
  onCheckout: () => void;

  // Opcional: si quieres bloquear checkout si no hay items
  checkoutDisabled?: boolean;

  // ✅ NUEVO (opcional): indica si hay items "Solo retiro" en el carrito
  hasNonDeliverables?: boolean;

  // ✅ NUEVO (opcional): texto personalizado (si no, usa default)
  nonDeliverablesLabel?: string;
};

const formatMoney = (value: number) => {
  return value.toLocaleString("es-EC", { style: "currency", currency: "USD" });
};

export const KioskCartBar: React.FC<KioskCartBarProps> = ({
  itemsCount,
  total,
  onViewCart,
  onCheckout,
  checkoutDisabled,
  hasNonDeliverables,
  nonDeliverablesLabel,
}) => {
  const showSoloRetiro = Boolean(hasNonDeliverables) && itemsCount > 0;
  const soloRetiroText = nonDeliverablesLabel ?? "🛍️ Solo retiro en carrito";

  return (
    <div
      className="kioskTouch kioskNoSelect"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: "var(--footer-h)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(18,24,35,.92)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(233,238,246,.10)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr",
          gap: "12px",
          alignItems: "center",
          padding: "12px 14px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Resumen */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: "var(--text-md)", color: "var(--muted)", fontWeight: 700 }}>
              Carrito
            </div>

            {/* ✅ Chip visible siempre */}
            {showSoloRetiro && (
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  color: "white",
                  border: "1px solid rgba(255,193,7,.55)",
                  background: "rgba(0,0,0,.55)",
                  backdropFilter: "blur(6px)",
                  letterSpacing: ".2px",
                }}
              >
                {soloRetiroText}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: "var(--text-xxl)", fontWeight: 900, letterSpacing: ".2px" }}>
              {formatMoney(total)}
            </div>

            <div style={{ fontSize: "var(--text-lg)", color: "var(--muted)", fontWeight: 800 }}>
              • {itemsCount} item{itemsCount === 1 ? "" : "s"}
            </div>
          </div>

          {/* ✅ Micro-copy (opcional) debajo, solo si hay solo retiro */}
          {showSoloRetiro && (
            <div style={{ fontSize: 13, color: "rgba(233,238,246,.78)", fontWeight: 800 }}>
              En checkout, “Envío a domicilio” se deshabilitará.
            </div>
          )}
        </div>

        {/* Ver carrito */}
        <KioskButton
          label="Ver carrito"
          variant="secondary"
          size="xl"
          onClick={onViewCart}
          disabled={itemsCount === 0}
        />

        {/* Pagar */}
        <KioskButton
          label="Pagar"
          variant="primary"
          size="xl"
          onClick={onCheckout}
          disabled={checkoutDisabled ?? itemsCount === 0}
        />
      </div>
    </div>
  );
};

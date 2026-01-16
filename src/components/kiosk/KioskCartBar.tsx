import React from "react";
import { KioskButton } from "./KioskButton";

export type KioskCartBarProps = {
  itemsCount: number;
  total: number; // en tu moneda (ej. USD)
  onViewCart: () => void;
  onCheckout: () => void;

  // Opcional: si quieres bloquear checkout si no hay items
  checkoutDisabled?: boolean;
};

const formatMoney = (value: number) => {
  // Ajusta locale/moneda si quieres
  return value.toLocaleString("es-EC", { style: "currency", currency: "USD" });
};

export const KioskCartBar: React.FC<KioskCartBarProps> = ({
  itemsCount,
  total,
  onViewCart,
  onCheckout,
  checkoutDisabled,
}) => {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: "var(--text-md)", color: "var(--muted)", fontWeight: 700 }}>
            Carrito
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: "var(--text-xxl)", fontWeight: 900, letterSpacing: ".2px" }}>
              {formatMoney(total)}
            </div>
            <div style={{ fontSize: "var(--text-lg)", color: "var(--muted)", fontWeight: 800 }}>
              • {itemsCount} item{itemsCount === 1 ? "" : "s"}
            </div>
          </div>
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

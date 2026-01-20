import React from "react";

type Step = {
  id: "catalog" | "cart" | "checkout" | "payment" | "receipt";
  label: string;
};

const STEPS: Step[] = [
  { id: "catalog", label: "Productos" },
  { id: "cart", label: "Carrito" },
  { id: "checkout", label: "Verificar" },
  { id: "payment", label: "Pagar" },
  { id: "receipt", label: "Recibo" },
];

type Props = {
  current: Step["id"];
};

export function KioskStepBar({ current }: Props) {
  const idx = STEPS.findIndex((s) => s.id === current);

  return (
    <div
      className="kioskNoSelect kioskTouch"
      style={{
        maxWidth: "var(--content-max, 820px)",
        margin: "0 auto",
        marginBottom: 12,
        display: "flex",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;

        return (
          <div
            key={s.id}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 999,
              border: active
                ? "1px solid rgba(47,125,255,.65)"
                : "1px solid rgba(233,238,246,.12)",
              background: active
                ? "rgba(47,125,255,.18)"
                : done
                ? "rgba(48,209,88,.10)"
                : "rgba(255,255,255,.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: ".2px",
              color: "var(--text)",
              opacity: done || active ? 1 : 0.75,
            }}
          >
            {i + 1}. {s.label}
          </div>
        );
      })}
    </div>
  );
}

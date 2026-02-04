import { useMemo } from "react";

export type KioskStepId = "catalog" | "cart" | "checkout" | "pay" | "receipt";

export function KioskStepBar(props: { current: KioskStepId }) {
  const steps = useMemo(
    () =>
      [
        { id: "catalog" as const, label: "1. Productos" },
        { id: "cart" as const, label: "2. Carrito" },
        { id: "checkout" as const, label: "3. Verificar" },
        { id: "pay" as const, label: "4. Pagar" },
        { id: "receipt" as const, label: "5. Recibo" },
      ] as const,
    []
  );

  const idx = steps.findIndex((s) => s.id === props.current);

  return (
    // ✅ Contenedor SIEMPRE igual al catálogo
    <div style={{ width: "100%" }}>
      <div
        style={{
          maxWidth: "var(--content-max, 1100px)",
          margin: "0 auto",
          padding: "0 14px",
        }}
      >
        <div
          className="kioskNoSelect"
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "nowrap",
            overflowX: "auto",
            paddingBottom: 6,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {steps.map((s, i) => {
            const done = i < idx;
            const active = i === idx;

            const border =
              active
                ? "1px solid rgba(47,125,255,.75)"
                : done
                ? "1px solid rgba(46,204,113,.35)"
                : "1px solid rgba(233,238,246,.14)";

            const bg =
              active
                ? "rgba(47,125,255,.18)"
                : done
                ? "rgba(46,204,113,.14)"
                : "rgba(233,238,246,.04)";

            const text =
              active
                ? "rgba(255,255,255,.98)"
                : done
                ? "rgba(255,255,255,.92)"
                : "rgba(255,255,255,.82)";

            return (
              <div
                key={s.id}
                className="kioskTouch"
                style={{
                  flex: "0 0 auto",
                  height: 44, // ✅ altura fija para que no “baile”
                  padding: "0 14px",
                  borderRadius: 999,
                  border,
                  background: bg,
                  color: text,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 14,
                  letterSpacing: ".2px",
                  whiteSpace: "nowrap",
                  boxShadow: active ? "0 10px 24px rgba(0,0,0,.18)" : "none",
                }}
              >
                {s.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

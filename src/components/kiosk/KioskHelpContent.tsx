import React from "react";

export function KioskHelpContent() {
  const itemStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(233,238,246,.12)",
    background: "var(--surface-2)",
    padding: 14,
    fontSize: 18,
    fontWeight: 800,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontSize: 18, opacity: 0.9 }}>
        Sigue estos pasos (tótem de farmacia):
      </div>

      <div style={itemStyle}>1) Elige productos y toca <b>Agregar</b>.</div>
      <div style={itemStyle}>2) Revisa tu <b>Carrito</b> y ajusta cantidades.</div>
      <div style={itemStyle}>3) En <b>Verificar</b>, ingresa nombre y teléfono, luego toca <b>Continuar a pago</b>.</div>

      <div style={{ opacity: 0.75, fontSize: 16 }}>
        Si el tótem se queda sin actividad, volverá al inicio automáticamente.
      </div>
    </div>
  );
}

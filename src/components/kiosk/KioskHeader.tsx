import React from "react";
import { KioskButton } from "./KioskButton";

export type KioskHeaderProps = {
  title: string;
  onHome?: () => void;     // volver a catálogo / inicio
  onHelp?: () => void;     // abrir modal ayuda (luego lo hacemos)
  rightSlot?: React.ReactNode; // opcional (ej: reloj, estado)
};

export function KioskHeader({ title, onHome, onHelp, rightSlot }: KioskHeaderProps) {
  return (
    <div
      className="kioskNoSelect kioskTouch"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        height: "var(--header-h)",
        background: "rgba(18,24,35,.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(233,238,246,.10)",
        zIndex: 60,
      }}
    >
      <div
        style={{
          height: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 14px",
          display: "grid",
          gridTemplateColumns: "320px 1fr 240px",
          gap: 28,
          alignItems: "center",
        }}
      >
        <div style={{ width: 260 }}>
          <KioskButton
            label="Inicio"
            variant="secondary"
            size="xl"
            onClick={onHome}
            disabled={!onHome}
          />
        </div>

        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: ".2px" }}>
          {title}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
          {rightSlot}
          <div style={{ width: 220 }}>
            <KioskButton
              label="Ayuda"
              variant="ghost"
              size="xl"
              onClick={onHelp}
              disabled={!onHelp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

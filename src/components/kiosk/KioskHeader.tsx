import React from "react";
import { KioskButton } from "./KioskButton";

export type KioskHeaderProps = {
  title: string;
  onHome?: () => void;

  // ✅ nuevo
  helpEnabled?: boolean;
  onHelp?: () => void;
};

export function KioskHeader({ title, onHome, helpEnabled = true, onHelp }: KioskHeaderProps) {
  return (
    <div
      className="kioskNoSelect"
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 240px",
        gap: 12,
        alignItems: "center",
        paddingTop: 10,
      }}
    >
      {/* Izq: Inicio */}
      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <div style={{ width: 220 }}>
          <KioskButton
            label="Inicio"
            variant="secondary"
            size="xl"
            onClick={onHome ?? (() => {})}
            disabled={!onHome}
          />
        </div>
      </div>

      {/* Centro: Título */}
      <div
        style={{
          textAlign: "center",
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: ".3px",
          color: "var(--text)",
          opacity: 0.98,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>

      {/* Der: Ayuda */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {helpEnabled ? (
          <div style={{ width: 220 }}>
            <KioskButton
              label="Ayuda"
              variant="ghost"
              size="xl"
              onClick={onHelp ?? (() => {})}
              disabled={!onHelp}
            />
          </div>
        ) : (
          <div style={{ width: 220 }} />
        )}
      </div>
    </div>
  );
}

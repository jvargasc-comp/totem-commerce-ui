import React from "react";
import { KioskButton } from "./KioskButton";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function KioskModal({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div
      className="kioskNoSelect kioskTouch"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(920px, 100%)",
          borderRadius: 22,
          border: "1px solid rgba(233,238,246,.14)",
          background: "var(--surface)",
          boxShadow: "0 18px 50px rgba(0,0,0,.45)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 1000, flex: 1 }}>{title}</div>
          <div style={{ width: 200 }}>
            <KioskButton label="Cerrar" variant="secondary" size="xl" onClick={onClose} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

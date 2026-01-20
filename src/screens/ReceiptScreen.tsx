import React, { useEffect, useMemo, useState } from "react";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskStepBar } from "../components/kiosk/KioskStepBar";

type Props = {
  orderId: string;
  onNew: () => void;
};

export default function ReceiptScreen({ orderId, onNew }: Props) {
  // Si ya tienes auto-retorno en tu Receipt actual, puedes borrar todo este bloque.
  const AUTO_SECONDS = 20;
  const [secondsLeft, setSecondsLeft] = useState<number>(AUTO_SECONDS);

  useEffect(() => {
    setSecondsLeft(AUTO_SECONDS);
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [orderId]);

  useEffect(() => {
    if (secondsLeft === 0) onNew();
  }, [secondsLeft, onNew]);

  const shortId = useMemo(() => {
    if (!orderId) return "";
    return orderId.length > 10 ? `${orderId.slice(0, 6)}…${orderId.slice(-4)}` : orderId;
  }, [orderId]);

  return (
    <KioskPage title="Recibo" onHome={onNew} variant="portrait">
      <KioskStepBar current="receipt" />
      <div style={{ maxWidth: "var(--content-max, 820px)", margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(233,238,246,.12)",
            background: "var(--surface)",
            borderRadius: 18,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            display: "grid",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 1000, letterSpacing: ".2px" }}>✅ Compra confirmada</div>
          <div style={{ fontSize: 18, opacity: 0.85 }}>
            Número de orden: <b>{shortId}</b>
          </div>

          <div
            style={{
              marginTop: 6,
              padding: 14,
              borderRadius: 18,
              border: "1px solid rgba(48,209,88,.35)",
              background: "rgba(48,209,88,.10)",
              color: "var(--text)",
              fontSize: 18,
              fontWeight: 900,
            }}
          >
            Gracias por tu compra
          </div>

          <div style={{ marginTop: 8, display: "grid", gap: 12 }}>
            <KioskButton label="Nueva compra" variant="primary" size="xl" onClick={onNew} />

            <div style={{ opacity: 0.75, fontSize: 16 }}>
              Volviendo al inicio en <b>{secondsLeft}s</b>…
            </div>
          </div>
        </div>
      </div>
    </KioskPage>
  );
}

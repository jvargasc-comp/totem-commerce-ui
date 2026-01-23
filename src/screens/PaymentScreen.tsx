import { useMemo, useState } from "react";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskStepBar } from "../components/kiosk/KioskStepBar";

type Props = {
  orderId: string;
  onPaid: () => void;
  onCancel: () => void;
};

export default function PaymentScreen({ orderId, onPaid, onCancel }: Props) {
  const [loading, setLoading] = useState(false);

  const shortId = useMemo(() => {
    if (!orderId) return "";
    return orderId.length > 10 ? `${orderId.slice(0, 6)}…${orderId.slice(-4)}` : orderId;
  }, [orderId]);

  async function paySimulated() {
    setLoading(true);
    try {
      // TODO (opcional): si tienes endpoint de pago simulado, llama aquí
      // await payOrder(orderId)
      await new Promise((r) => setTimeout(r, 600));
      onPaid();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KioskPage title="Pago" onHome={onCancel} variant="portrait">
      <KioskStepBar current="payment" />
      <div style={{ maxWidth: "var(--content-max, 820px)", margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(233,238,246,.12)",
            background: "var(--surface)",
            borderRadius: 18,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>Selecciona método de pago</div>
          <div style={{ opacity: 0.8, fontSize: 16 }}>
            Orden: <b>{shortId}</b>
          </div>

          <div style={{ marginTop: 6, display: "grid", gap: 12 }}>
            <KioskButton
              label={loading ? "Procesando..." : "Pagar con Tarjeta (simulado)"}
              variant="primary"
              size="xl"
              onClick={paySimulated}
              disabled={loading || !orderId}
            />

            <KioskButton
              label="Pago en Caja / Efectivo (simulado)"
              variant="secondary"
              size="xl"
              onClick={paySimulated}
              disabled={loading || !orderId}
            />

            <KioskButton
              label="Cancelar"
              variant="ghost"
              size="xl"
              onClick={onCancel}
              disabled={loading}
            />
          </div>

          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 16 }}>
            * En el MVP el pago es simulado. Luego conectamos a un gateway real.
          </div>
        </div>
      </div>
    </KioskPage>
  );
}

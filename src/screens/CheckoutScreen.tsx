import { useEffect, useMemo, useRef, useState } from "react";
import { getDeliveryWindows, type DeliveryWindow } from "../api/delivery.api";
import {
  createOrder,
  type CreateOrderPayload,
  type FulfillmentType,
  type DeliveryAddress,
} from "../api/orders.api";
import { useCart } from "../store/useCart";
import { cartTotals } from "../store/cart.store";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskButton } from "../components/kiosk/KioskButton";
import OnScreenKeyboardModal from "../components/OnScreenKeyboardModal";
import CityPickerModal from "../components/CityPickerModal";
import { KioskCartBar } from '../components/kiosk/KioskCartBar';
import { KioskFooterSpacer } from '../components/kiosk/KioskFooterSpacer';

type Props = {
  onBack: () => void;
  onOrderCreated: (orderId: string) => void;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D/g, "");
}

function formatUsPhone(digits: string) {
  const d = digitsOnly(digits).slice(0, 10);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function isValidUsPhone(digits: string) {
  return digitsOnly(digits).length === 10;
}

function isValidUsZip(zip: string) {
  return /^\d{5}(-\d{4})?$/.test((zip || "").trim());
}

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatWindow(w: DeliveryWindow) {
  const d = new Date(w.date).toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  return `${d} ${w.startTime}-${w.endTime}`;
}

function computeShippingCentsByItemsCount(itemsCount: number) {
  if (itemsCount <= 0) return 0;
  if (itemsCount <= 10) return 1000; // $10
  return 1000 + (itemsCount - 10) * 100; // +$1 desde el 11
}

type AddressState = {
  line1: string;
  reference: string;
  state: string;
  city: string;
  postalCode: string; // ZIP
  phoneDigits: string; // delivery phone
  notes: string;
};

type KbdField =
  | "name"
  | "line1"
  | "reference"
  | "zip"
  | "city_text"
  | "state_text";

function fieldMeta(field: KbdField) {
  switch (field) {
    case "name":
      return { title: "Name", placeholder: "e.g., John Smith", maxLength: 60 };
    case "line1":
      return { title: "Street address", placeholder: "e.g., 123 Main St Apt 4B", maxLength: 120 };
    case "reference":
      return { title: "Reference (optional)", placeholder: "e.g., Gate code / front desk", maxLength: 80 };
    case "zip":
      return { title: "ZIP code", placeholder: "e.g., 33101 or 33101-1234", maxLength: 10 };
    case "city_text":
      return { title: "City", placeholder: "Type your city…", maxLength: 60 };
    case "state_text":
      return { title: "State", placeholder: "Type your state…", maxLength: 30 };
  }
}

function TextFieldButton(props: {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
  rightHint?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 16, opacity: 0.85 }}>{props.label}</div>

      <button
        type="button"
        onClick={props.onClick}
        className="kioskTouch kioskNoSelect"
        style={{
          width: "100%",
          minHeight: 64,
          padding: 16,
          fontSize: 20,
          borderRadius: 16,
          border: "1px solid rgba(233,238,246,.14)",
          background: "var(--surface)",
          color: "var(--text)",
          textAlign: "left",
          touchAction: "manipulation",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span style={{ opacity: props.value?.trim()?.length ? 1 : 0.6 }}>
          {props.value?.trim()?.length ? props.value : props.placeholder}
        </span>
        {props.rightHint ? <span style={{ opacity: 0.7, fontWeight: 900 }}>{props.rightHint}</span> : null}
      </button>
    </div>
  );
}

/**
 * ✅ Numeric keypad modal (compacto) para teléfonos
 * - Solo dígitos
 * - Clear / Backspace / Done
 */
function NumericPadModal(props: {
  open: boolean;
  title: string;
  valueDigits: string; // raw digits
  maxDigits?: number;
  onCancel: () => void;
  onConfirm: (digits: string) => void;
}) {
  const max = props.maxDigits ?? 10;
  const [local, setLocal] = useState<string>("");

  useEffect(() => {
    if (props.open) setLocal(digitsOnly(props.valueDigits).slice(0, max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const append = (d: string) => setLocal((p) => (p + d).slice(0, max));
  const back = () => setLocal((p) => p.slice(0, -1));
  const clear = () => setLocal("");

  const keys = ["1","2","3","4","5","6","7","8","9","clear","0","back"] as const;

  if (!props.open) return null;

  return (
    <div
      className="kioskNoSelect"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,.55)",
        display: "grid",
        placeItems: "center",
        padding: 14,
      }}
    >
      <div
        style={{
          width: "min(520px, 96vw)", // ✅ más pequeño
          borderRadius: 22,
          border: "1px solid rgba(233,238,246,.14)",
          background: "rgba(18,24,35,.98)",
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900, flex: 1, color: "white" }}>
            {props.title}
          </div>
          <div style={{ fontSize: 14, opacity: 0.8, color: "white" }}>
            {local.length}/{max}
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(233,238,246,.14)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: ".6px",
            minHeight: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ opacity: local.length ? 1 : 0.65 }}>
            {local.length ? formatUsPhone(local) : "(###) ###-####"}
          </span>
          <span style={{ fontSize: 14, opacity: 0.8 }}>
            {local.length === max ? "Listo ✓" : "Solo números"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {keys.map((k) => {
            const isAction = k === "clear" || k === "back";
            const label = k === "clear" ? "Clear" : k === "back" ? "⌫" : k;

            return (
              <button
                key={k}
                type="button"
                className="kioskTouch kioskNoSelect"
                onClick={() => {
                  if (k === "clear") return clear();
                  if (k === "back") return back();
                  append(k);
                }}
                style={{
                  minHeight: 64, // ✅ compacto
                  borderRadius: 18,
                  border: "1px solid rgba(233,238,246,.14)",
                  background: isAction ? "rgba(233,238,246,.06)" : "var(--surface)",
                  color: "var(--text)",
                  fontSize: isAction ? 18 : 24,
                  fontWeight: 900,
                  boxShadow: "0 8px 18px rgba(0,0,0,.14)",
                  touchAction: "manipulation",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 2 }}>
          <KioskButton label="Cancelar" variant="secondary" size="xl" onClick={props.onCancel} />
          <KioskButton
            label="Listo"
            variant="primary"
            size="xl"
            onClick={() => props.onConfirm(local)}
            disabled={local.length === 0}
          />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutScreen({ onBack, onOrderCreated }: Props) {
  const cart = useCart();
  const totals = cartTotals();

  const storeId = "store-001";
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("PICKUP");

  const nonDeliverableItems = useMemo(() => {
    return cart.items
      .filter((it) => it.product?.isDeliverable === false)
      .map((it) => it.product?.name)
      .filter(Boolean) as string[];
  }, [cart.items]);

  const deliveryAllowed = nonDeliverableItems.length === 0;

  useEffect(() => {
    if (fulfillment === "DELIVERY" && !deliveryAllowed) setFulfillment("PICKUP");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryAllowed]);

  // Customer
  const [name, setName] = useState("");
  const [customerPhoneDigits, setCustomerPhoneDigits] = useState("");

  // Address (USA)
  const [address, setAddress] = useState<AddressState>({
    line1: "",
    reference: "",
    state: "Florida",
    city: "Miami",
    postalCode: "",
    phoneDigits: "",
    notes: "",
  });

  // Text keyboard
  const [kbdOpen, setKbdOpen] = useState(false);
  const [kbdField, setKbdField] = useState<KbdField>("name");
  const openKeyboard = (field: KbdField) => {
    setKbdField(field);
    setKbdOpen(true);
  };
  const meta = fieldMeta(kbdField);

  const kbdValue = useMemo(() => {
    switch (kbdField) {
      case "name":
        return name;
      case "line1":
        return address.line1;
      case "reference":
        return address.reference;
      case "zip":
        return address.postalCode;
      case "city_text":
        return address.city;
      case "state_text":
        return address.state;
    }
  }, [kbdField, name, address]);

  // ✅ Numeric pad for phones (reusable)
  const [phonePadOpen, setPhonePadOpen] = useState(false);
  const [phonePadTarget, setPhonePadTarget] = useState<"customer" | "delivery">("customer");

  const openPhonePad = (target: "customer" | "delivery") => {
    setPhonePadTarget(target);
    setPhonePadOpen(true);
  };

  const phonePadTitle = phonePadTarget === "customer" ? "Customer phone" : "Delivery phone";
  const phonePadValue = phonePadTarget === "customer" ? customerPhoneDigits : address.phoneDigits;

  // State -> Cities dataset
  const STATE_TO_CITIES: Record<string, string[]> = useMemo(
    () => ({
      Florida: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
      California: ["Los Angeles", "San Diego", "San Francisco", "San Jose", "Sacramento"],
      Texas: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
      "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
      Illinois: ["Chicago", "Aurora", "Naperville", "Joliet", "Rockford"],
      Washington: ["Seattle", "Spokane", "Tacoma", "Bellevue", "Everett"],
      Georgia: ["Atlanta", "Savannah", "Augusta", "Macon", "Athens"],
      Arizona: ["Phoenix", "Tucson", "Mesa", "Chandler", "Scottsdale"],
      "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Edison"],
      Massachusetts: ["Boston", "Worcester", "Springfield", "Cambridge", "Lowell"],
    }),
    []
  );

  const STATES = useMemo(() => Object.keys(STATE_TO_CITIES).sort(), [STATE_TO_CITIES]);

  const citiesForState = useMemo(() => {
    return STATE_TO_CITIES[address.state] ?? [];
  }, [STATE_TO_CITIES, address.state]);

  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  useEffect(() => {
    const list = STATE_TO_CITIES[address.state] ?? [];
    if (!list.length) return;
    if (!list.includes(address.city)) setAddress((a) => ({ ...a, city: list[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.state]);

  // Delivery windows
  const [deliveryDate, setDeliveryDate] = useState<string>(todayISO());
  const [windows, setWindows] = useState<DeliveryWindow[]>([]);
  const [windowId, setWindowId] = useState<string>("");

  const [loadingWindows, setLoadingWindows] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const itemsCount = useMemo(() => cart.items.reduce((a, it) => a + it.qty, 0), [cart.items]);

  const shippingCents = useMemo(() => {
    if (fulfillment !== "DELIVERY") return 0;
    return computeShippingCentsByItemsCount(itemsCount);
  }, [fulfillment, itemsCount]);

  const totalWithShippingCents = useMemo(() => totals.subtotalCents + shippingCents, [totals.subtotalCents, shippingCents]);

  const fetchTimer = useRef<number | null>(null);
  const lastFetchKey = useRef<string>("");

  useEffect(() => {
    setErr(null);

    if (fulfillment !== "DELIVERY") {
      setWindows([]);
      setWindowId("");
      lastFetchKey.current = "";
      if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
      fetchTimer.current = null;
      return;
    }

    if (!storeId || !deliveryDate) return;

    const key = JSON.stringify({ storeId, date: deliveryDate });
    if (lastFetchKey.current === key) return;

    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(() => {
      lastFetchKey.current = key;
      setLoadingWindows(true);

      getDeliveryWindows({ storeId, date: deliveryDate })
        .then((w) => {
          const list = Array.isArray(w) ? w : [];
          setWindows(list);
          if (windowId && !list.some((x) => x.id === windowId)) setWindowId("");
        })
        .catch((e: unknown) => {
          setWindows([]);
          setWindowId("");
          setErr(e instanceof Error ? e.message : "No se pudieron cargar ventanas de entrega");
        })
        .finally(() => setLoadingWindows(false));
    }, 250);

    return () => {
      if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fulfillment, storeId, deliveryDate]);

  const customerPhoneDisplay = useMemo(() => formatUsPhone(customerPhoneDigits), [customerPhoneDigits]);
  const addrPhoneDisplay = useMemo(() => formatUsPhone(address.phoneDigits), [address.phoneDigits]);

  const canSubmit = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (name.trim().length < 2) return false;
    if (!isValidUsPhone(customerPhoneDigits)) return false;

    if (fulfillment === "DELIVERY") {
      if (!deliveryAllowed) return false;
      if (address.line1.trim().length < 5) return false;
      if ((address.state || "").trim().length < 2) return false;
      if ((address.city || "").trim().length < 2) return false;
      if (!isValidUsZip(address.postalCode)) return false;
      if (!isValidUsPhone(address.phoneDigits)) return false;
      if (!windowId) return false;
      if (windows.length === 0) return false;
      if (!windows.some((w) => w.id === windowId)) return false;
    }

    return true;
  }, [cart.items.length, name, customerPhoneDigits, fulfillment, address, windowId, windows, deliveryAllowed]);

  async function submit() {
    setLoading(true);
    setErr(null);

    try {
      if (cart.items.some((i) => !i.product?.id)) {
        setErr("Producto inválido en el carrito. Vuelve a seleccionar.");
        return;
      }

      const payloadBase: CreateOrderPayload = {
        customerName: name.trim(),
        customerPhone: digitsOnly(customerPhoneDigits),
        items: cart.items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        fulfillmentType: fulfillment,
      };

      let payload: CreateOrderPayload = payloadBase;

      if (fulfillment === "DELIVERY") {
        if (!deliveryAllowed) {
          setErr("Tu carrito incluye productos solo retiro. Elige Retiro.");
          return;
        }

        const deliveryAddress: DeliveryAddress = {
          line1: address.line1.trim(),
          reference: address.reference.trim() || undefined,
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          phone: digitsOnly(address.phoneDigits),
          notes: address.notes.trim() || undefined,
        };

        payload = {
          ...payloadBase,
          delivery: {
            storeId,
            date: deliveryDate,
            windowId,
            address: deliveryAddress,
          },
          shippingCents,
          shippingProvider: "USPS_SIMULATED",
        };
      }

      const res = await createOrder(payload);
      if (!res?.id) throw new Error("Respuesta inválida al crear la orden");
      onOrderCreated(res.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Error creando la orden";
      setErr(typeof msg === "string" ? msg : "Error creando la orden");
    } finally {
      setLoading(false);
    }
  }

  const missing = useMemo(() => {
    const m: string[] = [];
    if (name.trim().length < 2) m.push("Name");
    if (!isValidUsPhone(customerPhoneDigits)) m.push("Customer phone (10 digits)");
    if (fulfillment === "DELIVERY") {
      if (!deliveryAllowed) m.push("Cart has pickup-only items");
      if (address.line1.trim().length < 5) m.push("Street address");
      if ((address.state || "").trim().length < 2) m.push("State");
      if ((address.city || "").trim().length < 2) m.push("City");
      if (!isValidUsZip(address.postalCode)) m.push("ZIP (12345 or 12345-6789)");
      if (!isValidUsPhone(address.phoneDigits)) m.push("Delivery phone (10 digits)");
      if (!windowId) m.push("Delivery window");
    }
    return m;
  }, [name, customerPhoneDigits, fulfillment, address, windowId, deliveryAllowed]);

  return (
    <KioskPage title="Verificar compra" onHome={onBack} variant="portrait" step="checkout">
  
      <div style={{ maxWidth: "var(--content-max, 820px)", margin: "0 auto" }}>
        {/* Resumen */}
        <div
          style={{
            border: "1px solid rgba(233,238,246,.12)",
            background: "var(--surface)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900, flex: 1 }}>Resumen</div>
            <div style={{ fontSize: 18, opacity: 0.8 }}>{itemsCount} ítems</div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Subtotal</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(totals.subtotalCents)}</div>
          </div>

          {fulfillment === "DELIVERY" && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Envío (simulado)</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{money(shippingCents)}</div>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 18, opacity: 0.85, flex: 1 }}>Total final</div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>{money(totalWithShippingCents)}</div>
              </div>

              <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 800 }}>
                Regla: $10 (1–10 ítems) + $1 por ítem desde el 11
              </div>
            </>
          )}
        </div>

        {!deliveryAllowed && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,193,7,.25)",
              background: "rgba(255,193,7,.12)",
              color: "white",
              fontWeight: 900,
              display: "grid",
              gap: 6,
            }}
          >
            <div>Tu carrito incluye productos que no aplican para entrega a domicilio.</div>
            <div style={{ fontWeight: 800, opacity: 0.9, fontSize: 14 }}>
              Solo retiro: {nonDeliverableItems.slice(0, 3).join(" · ")}
              {nonDeliverableItems.length > 3 ? " · ..." : ""}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>Datos del cliente</div>

          <TextFieldButton
            label="Nombre"
            value={name}
            placeholder="Toca para ingresar nombre…"
            onClick={() => openKeyboard("name")}
          />

          <TextFieldButton
            label="Teléfono (cliente)"
            value={customerPhoneDisplay}
            placeholder="Toca para ingresar teléfono…"
            onClick={() => openPhonePad("customer")}
            rightHint={isValidUsPhone(customerPhoneDigits) ? "✓" : "10"}
          />

          {/* Fulfillment */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95, marginBottom: 10 }}>
              Entrega
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={() => setFulfillment("PICKUP")}
                className="kioskTouch kioskNoSelect"
                style={{
                  minHeight: 72,
                  padding: "0 18px",
                  borderRadius: 18,
                  border:
                    fulfillment === "PICKUP"
                      ? "1px solid rgba(47,125,255,.65)"
                      : "1px solid rgba(233,238,246,.14)",
                  background: fulfillment === "PICKUP" ? "var(--primary)" : "var(--surface)",
                  color: "var(--text)",
                  fontSize: 18,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Retiro en farmacia</span>
                <span style={{ opacity: 0.9 }}>Gratis</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (deliveryAllowed) setFulfillment("DELIVERY");
                }}
                disabled={!deliveryAllowed}
                className="kioskTouch kioskNoSelect"
                style={{
                  minHeight: 72,
                  padding: "0 18px",
                  borderRadius: 18,
                  border:
                    fulfillment === "DELIVERY"
                      ? "1px solid rgba(47,125,255,.65)"
                      : "1px solid rgba(233,238,246,.14)",
                  background: fulfillment === "DELIVERY" ? "var(--primary)" : "var(--surface)",
                  color: "var(--text)",
                  fontSize: 18,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  opacity: deliveryAllowed ? 1 : 0.55,
                  cursor: deliveryAllowed ? "pointer" : "not-allowed",
                }}
              >
                <span>Envío a domicilio (USA)</span>
                <span style={{ opacity: 0.9 }}>{deliveryAllowed ? "USPS" : "No disponible"}</span>
              </button>
            </div>
          </div>

          {fulfillment === "DELIVERY" && (
            <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.95 }}>
                Dirección de envío (USA)
              </div>

              <TextFieldButton
                label="Street address"
                value={address.line1}
                placeholder="Toca para ingresar dirección…"
                onClick={() => openKeyboard("line1")}
              />

              <TextFieldButton
                label="Reference (opcional)"
                value={address.reference}
                placeholder="Toca para ingresar referencia…"
                onClick={() => openKeyboard("reference")}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TextFieldButton
                  label="State"
                  value={address.state}
                  placeholder="Selecciona estado…"
                  onClick={() => setStateModalOpen(true)}
                  rightHint="▾"
                />
                <TextFieldButton
                  label="City"
                  value={address.city}
                  placeholder="Selecciona ciudad…"
                  onClick={() => setCityModalOpen(true)}
                  rightHint="▾"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <TextFieldButton
                  label="ZIP code"
                  value={address.postalCode}
                  placeholder="Toca para ingresar ZIP…"
                  onClick={() => openKeyboard("zip")}
                  rightHint={isValidUsZip(address.postalCode) ? "✓" : "5/9"}
                />

                <TextFieldButton
                  label="Phone (delivery)"
                  value={addrPhoneDisplay}
                  placeholder="Toca para ingresar teléfono…"
                  onClick={() => openPhonePad("delivery")}
                  rightHint={isValidUsPhone(address.phoneDigits) ? "✓" : "10"}
                />
              </div>

              <label style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 16, opacity: 0.85 }}>Fecha de entrega</div>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{
                    padding: 16,
                    fontSize: 20,
                    borderRadius: 16,
                    border: "1px solid rgba(233,238,246,.14)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    minHeight: 64,
                  }}
                />
              </label>

              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 10 }}>
                  Ventana de entrega
                </div>

                {loadingWindows && (
                  <div style={{ padding: 12, borderRadius: 14, background: "rgba(233,238,246,.06)" }}>
                    Cargando ventanas…
                  </div>
                )}

                {!loadingWindows && windows.length === 0 && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,193,7,.25)",
                      background: "rgba(255,193,7,.12)",
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    No hay ventanas disponibles (prueba otra fecha).
                  </div>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {windows.map((w) => {
                    const active = windowId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWindowId(w.id)}
                        className="kioskTouch kioskNoSelect"
                        style={{
                          minHeight: 72,
                          padding: "0 18px",
                          borderRadius: 18,
                          border: active
                            ? "1px solid rgba(47,125,255,.65)"
                            : "1px solid rgba(233,238,246,.14)",
                          background: active ? "var(--primary)" : "var(--surface)",
                          color: "var(--text)",
                          fontSize: 18,
                          fontWeight: 900,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>{formatWindow(w)}</span>
                        <span style={{ opacity: 0.9 }}>Entrega</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {err && (
            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,59,48,.28)",
                background: "rgba(255,59,48,.16)",
                color: "white",
                fontWeight: 800,
              }}
            >
              {err}
            </div>
          )}

          {missing.length > 0 && (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,193,7,.25)",
                background: "rgba(255,193,7,.12)",
                color: "white",
                fontWeight: 800,
              }}
            >
              Completa: {missing.join(" • ")}
            </div>
          )}

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <KioskButton
              label={loading ? "Creando orden..." : "Continuar a pago"}
              variant="primary"
              size="xl"
              onClick={submit}
              disabled={!canSubmit || loading}
            />

            <KioskButton label="Volver" variant="secondary" size="xl" onClick={onBack} disabled={loading} />
          </div>
        </div>
      </div>

      {/* Modal teclado texto */}
      <OnScreenKeyboardModal
        open={kbdOpen}
        title={meta.title}
        placeholder={meta.placeholder}
        initialValue={kbdValue}
        maxLength={meta.maxLength}
        onCancel={() => setKbdOpen(false)}
        onConfirm={(val) => {
          const v = val.trim();
          switch (kbdField) {
            case "name":
              setName(v);
              break;
            case "line1":
              setAddress((a) => ({ ...a, line1: v }));
              break;
            case "reference":
              setAddress((a) => ({ ...a, reference: v }));
              break;
            case "zip":
              setAddress((a) => ({ ...a, postalCode: v }));
              break;
            case "city_text":
              setAddress((a) => ({ ...a, city: v }));
              break;
            case "state_text":
              setAddress((a) => ({ ...a, state: v }));
              break;
          }
          setKbdOpen(false);
        }}
      />

      {/* ✅ Numeric keypad modal (teléfonos) */}
      <NumericPadModal
        open={phonePadOpen}
        title={phonePadTitle}
        valueDigits={phonePadValue}
        maxDigits={10}
        onCancel={() => setPhonePadOpen(false)}
        onConfirm={(digits) => {
          if (phonePadTarget === "customer") setCustomerPhoneDigits(digitsOnly(digits));
          else setAddress((a) => ({ ...a, phoneDigits: digitsOnly(digits) }));
          setPhonePadOpen(false);
        }}
      />

      {/* Modal State */}
      <CityPickerModal
        open={stateModalOpen}
        title="State (USA)"
        cities={STATES}
        selected={address.state}
        onClose={() => setStateModalOpen(false)}
        onSelect={(state) => {
          setAddress((a) => ({ ...a, state }));
          setStateModalOpen(false);
        }}
        onOtherCity={() => {
          setStateModalOpen(false);
          openKeyboard("state_text");
        }}
      />

      {/* Modal City */}
      <CityPickerModal
        open={cityModalOpen}
        title={`City — ${address.state}`}
        cities={citiesForState.length ? citiesForState : ["(No cities configured)"]}
        selected={address.city}
        onClose={() => setCityModalOpen(false)}
        onSelect={(city) => {
          setAddress((a) => ({ ...a, city }));
          setCityModalOpen(false);
        }}
        onOtherCity={() => {
          setCityModalOpen(false);
          openKeyboard("city_text");
        }}
      />
      <KioskFooterSpacer />
      <KioskCartBar
        itemsCount={itemsCount}
        total={totalWithShippingCents / 100}
        onViewCart={onBack}       // o navega a carrito si tienes esa ruta/handler
        onCheckout={submit}       // en checkout equivale a “continuar”
        checkoutDisabled={!canSubmit || loading}
      />
    </KioskPage>
  );
}

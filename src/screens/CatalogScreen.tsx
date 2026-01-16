import { useEffect, useMemo, useState } from "react";
import { getCategories, getProducts } from "../api/catalog.api";
import type { Category, Product } from "../types/catalog";
import { addToCart, getCartSnapshot, subscribeCart } from "../store/cart.store";
import { KioskCartBar } from "../components/kiosk/KioskCartBar";
import { KioskButton } from "../components/kiosk/KioskButton";
import type { CartState } from "../store/cart.store";
import { KioskFooterSpacer } from "../components/kiosk/KioskFooterSpacer";

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

export default function CatalogScreen(props: { onGoCart: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ======= Estado de carrito (para barra inferior) =======
  const [cart, setCart] = useState<CartState>(() => {
  const snap = getCartSnapshot();
  return { items: snap.items.map((i) => ({ ...i })) };
});

useEffect(() => {
  return subscribeCart(() => {
    const snap = getCartSnapshot();
    // Clon superficial para garantizar nueva referencia y re-render
    setCart({ items: snap.items.map((i) => ({ ...i })) });
  });
}, []);

const itemsCount = useMemo(() => {
  return cart.items.reduce((acc, it) => acc + it.qty, 0);
}, [cart]);

const totalCents = useMemo(() => {
  return cart.items.reduce((acc, it) => acc + it.product.priceCents * it.qty, 0);
}, [cart]);

  // ======= Carga catálogo =======
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [cats, prods] = await Promise.all([
        getCategories(),
        getProducts({ categoryId: categoryId || undefined, q: q || undefined }),
      ]);
      setCategories(cats.filter((c) => c.isActive));
      setProducts(prods.filter((p) => p.isActive));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Error cargando catálogo");
    } finally {
      setLoading(false);
    }
    console.log("API:", import.meta.env.VITE_API_BASE_URL);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(term));
  }, [products, q]);

  return (
    <div className="kioskScreen kioskNoSelect kioskContentWithFooter" style={{ padding: 16 }}>
      {/* Header simple (por ahora); luego lo hacemos fijo tipo kiosk */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ margin: 0, flex: 1, fontSize: 28, letterSpacing: ".2px" }}>
          Farmacia — Catálogo
        </h2>

        {/* Este botón lo dejamos, pero ya estilo kiosk */}
        <div style={{ width: 220 }}>
          <KioskButton
            label="Ver carrito"
            variant="secondary"
            size="xl"
            onClick={props.onGoCart}
            disabled={itemsCount === 0}
          />
        </div>
      </div>

      {/* Filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr 220px",
          gap: 12,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{
            padding: 14,
            fontSize: 18,
            borderRadius: 14,
            border: "1px solid rgba(233,238,246,.14)",
            background: "var(--surface)",
            color: "var(--text)",
            minHeight: 56,
          }}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto..."
          style={{
            padding: 14,
            fontSize: 18,
            borderRadius: 14,
            border: "1px solid rgba(233,238,246,.14)",
            background: "var(--surface)",
            color: "var(--text)",
            minHeight: 56,
          }}
        />

        <KioskButton
          label={loading ? "Cargando..." : "Refrescar"}
          variant="ghost"
          size="xl"
          onClick={load}
          disabled={loading}
        />
      </div>

      {err && (
        <div
          style={{
            marginTop: 12,
            color: "white",
            background: "rgba(255,59,48,.16)",
            border: "1px solid rgba(255,59,48,.28)",
            padding: 12,
            borderRadius: 14,
            fontSize: 16,
          }}
        >
          {err}
        </div>
      )}

      {/* Grid de productos: touch-friendly */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {filtered.map((p) => (
          <div
            key={p.id}
            className="kioskTouch"
            style={{
              border: "1px solid rgba(233,238,246,.12)",
              background: "var(--surface)",
              borderRadius: 18,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.16)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ opacity: 0.75, fontSize: 16 }}>{p.brand ?? ""}</div>

            <div style={{ fontSize: 22, fontWeight: 900 }}>{money(p.priceCents)}</div>

            <KioskButton
              label="Agregar"
              variant="primary"
              size="xl"
              onClick={() => addToCart(p)}
            />
          </div>
        ))}
      </div>

      {/* Barra inferior fija */}
      <KioskFooterSpacer />
      <KioskCartBar
        itemsCount={itemsCount}
        total={totalCents / 100}
        onViewCart={props.onGoCart}
        onCheckout={props.onGoCart} // por ahora te mando a carrito; luego lo conectamos a /verify
      />
    </div>
  );
}

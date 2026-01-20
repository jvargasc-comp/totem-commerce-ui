import { useEffect, useMemo, useState } from "react";
import { getCategories, getProducts } from "../api/catalog.api";
import type { Category, Product } from "../types/catalog";
import { addToCart, getCartSnapshot, subscribeCart } from "../store/cart.store";
import type { CartState } from "../store/cart.store";
import { KioskCartBar } from "../components/kiosk/KioskCartBar";
import { KioskButton } from "../components/kiosk/KioskButton";
import { KioskFooterSpacer } from "../components/kiosk/KioskFooterSpacer";
import { KioskPage } from "../components/kiosk/KioskPage";
import { KioskCategoryBar } from "../components/kiosk/KioskCategoryBar";
import { KioskStepBar } from "../components/kiosk/KioskStepBar";

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", { style: "currency", currency: "USD" });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function CatalogScreen(props: { onGoCart: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>(""); // "" = todas
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ======= Carrito (barra inferior) =======
  const [cart, setCart] = useState<CartState>(() => {
    const snap = getCartSnapshot();
    return { items: snap.items.map((i) => ({ ...i })) };
  });

  useEffect(() => {
    return subscribeCart(() => {
      const snap = getCartSnapshot();
      setCart({ items: snap.items.map((i) => ({ ...i })) });
    });
  }, []);

  const itemsCount = useMemo(() => cart.items.reduce((acc, it) => acc + it.qty, 0), [cart]);
  const totalCents = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.product.priceCents * it.qty, 0),
    [cart]
  );

  // ======= Cargar catálogo =======
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
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(term));
  }, [products, q]);

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);

  return (
    <KioskPage title="Farmacia — Catálogo" variant="portrait">
      <div style={{ maxWidth: "var(--content-max, 1100px)", margin: "0 auto" }}>
        <KioskStepBar current="catalog" />
        {/* Categorías tipo kiosk */}
        <KioskCategoryBar
          categories={activeCategories.map((c) => ({ id: c.id, name: c.name }))}
          selectedId={categoryId}
          onSelect={(id) => {
            setCategoryId(id);
            scrollToTop();
          }}
        />

        {/* Search + refrescar */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 220px",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto..."
            inputMode="search"
            enterKeyHint="search"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                scrollToTop();
                load();
              }
            }}
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
            onClick={() => {
              scrollToTop();
              load();
            }}
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

        {/* Productos */}
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 16,
                borderRadius: 18,
                border: "1px solid rgba(233,238,246,.12)",
                background: "var(--surface)",
                color: "var(--muted)",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              No encontramos productos con ese filtro.
              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 240 }}>
                  <KioskButton
                    label="Limpiar búsqueda"
                    variant="secondary"
                    size="xl"
                    onClick={() => {
                      setQ("");
                      scrollToTop();
                    }}
                  />
                </div>
                <div style={{ width: 240 }}>
                  <KioskButton
                    label="Ver todo"
                    variant="ghost"
                    size="xl"
                    onClick={() => {
                      setCategoryId("");
                      setQ("");
                      scrollToTop();
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            filtered.map((p) => (
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

                <KioskButton label="Agregar" variant="primary" size="xl" onClick={() => addToCart(p)} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Spacer + barra fija */}
      <KioskFooterSpacer />
      <KioskCartBar
        itemsCount={itemsCount}
        total={totalCents / 100}
        onViewCart={props.onGoCart}
        onCheckout={props.onGoCart}
      />
    </KioskPage>
  );
}

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
import OnScreenKeyboardModal from "../components/OnScreenKeyboardModal";

function money(cents: number) {
  return (cents / 100).toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function productCoverUrl(p: Product) {
  const first = (p as { images?: Array<{ url: string }> })?.images?.[0]?.url as
    | string
    | undefined;
  return first || "";
}

function isDeliverable(p: Product) {
  // por compat: si no viene, asumimos true
  const v = (p as { isDeliverable?: unknown })?.isDeliverable;
  return typeof v === "boolean" ? v : true;
}

export default function CatalogScreen(props: { onGoCart: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>(""); // "" = todas
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔤 Teclado búsqueda
  const [searchOpen, setSearchOpen] = useState(false);

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

  const itemsCount = useMemo(
    () => cart.items.reduce((acc, it) => acc + it.qty, 0),
    [cart.items]
  );

  const totalCents = useMemo(
    () =>
      cart.items.reduce((acc, it) => acc + it.product.priceCents * it.qty, 0),
    [cart.items]
  );

  const hasNonDeliverables = useMemo(() => {
    return cart.items.some((i) => i.product?.isDeliverable === false);
  }, [cart.items]);

  // ======= Cargar catálogo =======
  async function load(search = q) {
    setLoading(true);
    setErr(null);
    try {
      const [cats, prods] = await Promise.all([
        getCategories(),
        getProducts({
          categoryId: categoryId || undefined,
          q: search?.trim() ? search.trim() : undefined,
        }),
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
    load(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  // ✅ limpiar búsqueda + mostrar todo
  function clearSearch() {
    setQ("");
    scrollToTop();
    load("");
  }

  const filtered = useMemo(() => {
    // Mantengo este filtro local por compat si el backend no filtra perfecto.
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) =>
      `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(term)
    );
  }, [products, q]);

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

        {/* Search + acciones */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: q ? "1fr 220px 220px" : "1fr 220px",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* ✅ Búsqueda como botón (abre teclado) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="kioskTouch kioskNoSelect"
            style={{
              minHeight: 64,
              padding: 16,
              fontSize: 20,
              borderRadius: 16,
              border: "1px solid rgba(233,238,246,.14)",
              background: "var(--surface)",
              color: "var(--text)",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              touchAction: "manipulation",
            }}
          >
            <span style={{ opacity: 0.7 }}>🔍</span>
            {q ? q : <span style={{ opacity: 0.6 }}>Buscar producto…</span>}
          </button>

          {/* ✅ Borrar búsqueda */}
          {q && (
            <KioskButton
              label="Borrar búsqueda"
              variant="ghost"
              size="xl"
              onClick={clearSearch}
              disabled={loading}
            />
          )}

          <KioskButton
            label={loading ? "Cargando..." : "Refrescar"}
            variant="secondary"
            size="xl"
            onClick={() => {
              scrollToTop();
              load(q);
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
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ width: 240 }}>
                  <KioskButton
                    label="Borrar búsqueda"
                    variant="secondary"
                    size="xl"
                    onClick={clearSearch}
                  />
                </div>
                <div style={{ width: 240 }}>
                  <KioskButton
                    label="Ver todo"
                    variant="ghost"
                    size="xl"
                    onClick={() => {
                      setCategoryId("");
                      clearSearch();
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            filtered.map((p) => {
              const cover = productCoverUrl(p);
              const deliverable = isDeliverable(p);

              return (
                <div
                  key={p.id}
                  className="kioskTouch"
                  style={{
                    border: "1px solid rgba(233,238,246,.12)",
                    background: "var(--surface)",
                    borderRadius: 18,
                    padding: 14,
                    display: "grid",
                    gap: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,.16)",
                  }}
                >
                  {/* Imagen */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 150,
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "rgba(233,238,246,.06)",
                      border: "1px solid rgba(233,238,246,.10)",
                    }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          opacity: 0.7,
                          fontWeight: 800,
                        }}
                      >
                        Sin imagen
                      </div>
                    )}

                    {/* Badge delivery */}
                    {!deliverable && (
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 900,
                          color: "white",
                          border: "1px solid rgba(255,193,7,.35)",
                          background: "rgba(0,0,0,.72)",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        🛍️ Solo retiro
                      </div>
                    )}
                  </div>

                  {/* Texto */}
                  <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.1 }}>
                    {p.name}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <div style={{ opacity: 0.75, fontSize: 16, flex: 1 }}>
                      {p.brand ?? ""}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>
                      {money(p.priceCents)}
                    </div>
                  </div>

                  {!deliverable && (
                    <div
                      style={{
                        fontSize: 14,
                        opacity: 0.85,
                        border: "1px solid rgba(255,193,7,.20)",
                        background: "rgba(255,193,7,.10)",
                        padding: "8px 10px",
                        borderRadius: 14,
                        fontWeight: 800,
                      }}
                    >
                      Este producto no aplica para entrega a domicilio.
                    </div>
                  )}

                  <KioskButton
                    label="Agregar"
                    variant="primary"
                    size="xl"
                    onClick={() => addToCart(p)}
                  />
                </div>
              );
            })
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
        hasNonDeliverables={hasNonDeliverables}
      />

      {/* ⌨️ Modal teclado búsqueda */}
      <OnScreenKeyboardModal
        open={searchOpen}
        title="Buscar producto"
        placeholder="Escribe el nombre del producto…"
        initialValue={q}
        maxLength={40}
        onCancel={() => setSearchOpen(false)}
        onConfirm={(value) => {
          const v = value.trim();
          setSearchOpen(false);
          scrollToTop();

          if (!v) {
            // ✅ vacío => mostrar todo
            setQ("");
            load("");
            return;
          }

          setQ(v);
          load(v);
        }}
      />
    </KioskPage>
  );
}

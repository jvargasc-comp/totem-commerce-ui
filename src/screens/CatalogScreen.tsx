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
import OnScreenKeyboardModal from "../components/OnScreenKeyboardModal";

type DeliverableFilter = "ALL" | "LOCAL" | "EXTERIOR";

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
  return p.images?.[0]?.url || "";
}

function isDeliverable(p: Product) {
  const v = (p as any)?.isDeliverable;
  return typeof v === "boolean" ? v : true;
}

export default function CatalogScreen(props: { onGoCart: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔤 Teclado búsqueda
  const [searchOpen, setSearchOpen] = useState(false);

  // 🧭 NUEVO: filtro por tipo de entrega
  const [deliverableFilter, setDeliverableFilter] =
    useState<DeliverableFilter>("ALL");

  // ======= Carrito =======
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
    () => cart.items.reduce((a, it) => a + it.qty, 0),
    [cart.items]
  );

  const totalCents = useMemo(
    () =>
      cart.items.reduce((acc, it) => acc + it.product.priceCents * it.qty, 0),
    [cart.items]
  );

  const hasNonDeliverables = useMemo(
    () => cart.items.some((i) => i.product?.isDeliverable === false),
    [cart.items]
  );

  // ======= Load catálogo =======
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
    } catch (e: any) {
      setErr(e.message || "Error cargando catálogo");
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

  // ✅ limpiar búsqueda
  function clearSearch() {
    setQ("");
    scrollToTop();
    load("");
  }

  // ======= FILTRO FINAL =======
  const filtered = useMemo(() => {
    let list = products;

    // 🔎 texto
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(term)
      );
    }

    // 🧭 deliverable
    if (deliverableFilter === "LOCAL") {
      list = list.filter((p) => isDeliverable(p) === false);
    } else if (deliverableFilter === "EXTERIOR") {
      list = list.filter((p) => isDeliverable(p) === true);
    }

    return list;
  }, [products, q, deliverableFilter]);

  return (
    <KioskPage title="Farmacia — Catálogo" variant="portrait" step="catalog">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <KioskCategoryBar
          categories={activeCategories.map((c) => ({ id: c.id, name: c.name }))}
          selectedId={categoryId}
          onSelect={(id) => {
            setCategoryId(id);
            scrollToTop();
          }}
        />

        {/* 🔍 Búsqueda + acciones */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: q ? "1fr 220px 220px" : "1fr 220px",
            gap: 12,
          }}
        >
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
            }}
          >
            🔍 {q || <span style={{ opacity: 0.6 }}>Buscar producto…</span>}
          </button>

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

        {/* 🧭 FILTRO LOCAL / EXTERIOR */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {[
            { id: "ALL", label: "Todos" },
            { id: "LOCAL", label: "Local" },
            { id: "EXTERIOR", label: "Exterior" },
          ].map((f) => {
            const active = deliverableFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setDeliverableFilter(f.id as DeliverableFilter);
                  scrollToTop();
                }}
                className="kioskTouch kioskNoSelect"
                style={{
                  minHeight: 56,
                  borderRadius: 18,
                  border: active
                    ? "1px solid rgba(47,125,255,.65)"
                    : "1px solid rgba(233,238,246,.14)",
                  background: active ? "var(--primary)" : "var(--surface)",
                  color: "var(--text)",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {err && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "rgba(255,59,48,.16)",
              border: "1px solid rgba(255,59,48,.28)",
              color: "white",
              fontWeight: 800,
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
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 14,
          }}
        >
          {filtered.map((p) => {
            const deliverable = isDeliverable(p);
            const cover = productCoverUrl(p);

            return (
              <div
                key={p.id}
                style={{
                  borderRadius: 18,
                  padding: 14,
                  background: "var(--surface)",
                  boxShadow: "0 8px 24px rgba(0,0,0,.16)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    height: 150,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "rgba(233,238,246,.06)",
                    position: "relative",
                  }}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: "100%",
                        opacity: 0.7,
                        fontWeight: 800,
                      }}
                    >
                      Sin imagen
                    </div>
                  )}

                  {!deliverable && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(0,0,0,.7)",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      🛍️ Local
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 20, fontWeight: 900 }}>{p.name}</div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ opacity: 0.7 }}>{p.brand}</div>
                  <div style={{ fontWeight: 900 }}>
                    {money(p.priceCents)}
                  </div>
                </div>

                <KioskButton
                  label="Agregar"
                  variant="primary"
                  size="xl"
                  onClick={() => addToCart(p)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <KioskFooterSpacer />
      <KioskCartBar
        itemsCount={itemsCount}
        total={totalCents / 100}
        onViewCart={props.onGoCart}
        onCheckout={props.onGoCart}
        hasNonDeliverables={hasNonDeliverables}
      />

      {/* ⌨️ Teclado búsqueda */}
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
          setQ(v);
          load(v);
        }}
      />
    </KioskPage>
  );
}

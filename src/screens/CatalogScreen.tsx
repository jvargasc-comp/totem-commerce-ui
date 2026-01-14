import { useEffect, useMemo, useState } from 'react';
import { getCategories, getProducts } from '../api/catalog.api';
import type { Category, Product } from '../types/catalog';
import { addToCart } from '../store/cart.store';

function money(cents: number) {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' });
}

export default function CatalogScreen(props: { onGoCart: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      setErr(e instanceof Error ? e.message : 'Error cargando catálogo');
    } finally {
      setLoading(false);
    }
    console.log('API:', import.meta.env.VITE_API_BASE_URL);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => `${p.name} ${p.brand ?? ''}`.toLowerCase().includes(term));
  }, [products, q]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Farmacia — Catálogo</h2>
        <button onClick={props.onGoCart} style={{ padding: '10px 14px', fontSize: 16 }}>
          Ver carrito
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ padding: 10, fontSize: 16 }}
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
          style={{ padding: 10, fontSize: 16, flex: 1 }}
        />

        <button onClick={load} disabled={loading} style={{ padding: '10px 14px', fontSize: 16 }}>
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {err && <div style={{ marginTop: 12, color: 'crimson' }}>{err}</div>}

      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 700 }}>{p.name}</div>
            <div style={{ opacity: 0.7 }}>{p.brand ?? ''}</div>
            <div style={{ fontSize: 18 }}>{money(p.priceCents)}</div>
            <button
              onClick={() => addToCart(p)}
              style={{ padding: '10px 14px', fontSize: 16 }}
            >
              Agregar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

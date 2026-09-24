import type { Metadata } from 'next';
import { publicApi } from '@/lib/api';
import { ProductSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductSearchControls } from '@/components/ProductSearchControls';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Productos',
  description: 'Explorá productos de múltiples tiendas independientes en SeVende. Comprá online con una experiencia simple y pagos mediante Mercado Pago.',
  alternates: { canonical: '/productos' },
};

const EMPTY_PRODUCTS: ProductSearch = { items: [], total: 0, page: 1, limit: 24 };

export default async function ProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const qs = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => v && qs.set(k, v));
  let catalogError = false;
  const [products, categories] = await Promise.all([
    publicApi<ProductSearch>(`/products?${qs.toString()}`).catch(() => {
      catalogError = true;
      return EMPTY_PRODUCTS;
    }),
    publicApi<any[]>('/categories').catch(() => []),
  ]);
  const flatCategories = categories.flatMap((c) => [c, ...(c.children ?? [])]);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-6 min-w-0">
        <h1 className="text-3xl font-black sm:text-4xl">Productos</h1>
        <p className="text-muted-foreground">{products.total} resultados</p>
      </div>
      <ProductSearchControls categories={flatCategories} total={products.total} />
      {catalogError && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No pudimos cargar el catálogo. Intenta recargar en unos segundos.</div>}
      <ProductGrid products={products.items} />
    </main>
  );
}

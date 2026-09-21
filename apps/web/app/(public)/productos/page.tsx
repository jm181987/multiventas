import { publicApi } from '@/lib/api';
import { ProductSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { FilterSidebar } from '@/components/FilterSidebar';

export const dynamic = 'force-dynamic';

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
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-black">Productos</h1>
        <p className="text-muted-foreground">{products.total} resultados</p>
      </div>
      {catalogError && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No pudimos cargar el catálogo. Intenta recargar en unos segundos.</div>}
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <FilterSidebar categories={categories.flatMap((c) => [c, ...(c.children ?? [])])} />
        <ProductGrid products={products.items} />
      </div>
    </main>
  );
}

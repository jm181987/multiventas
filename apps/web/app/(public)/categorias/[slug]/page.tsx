import { publicApi } from '@/lib/api';
import { ProductSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const data = await publicApi<ProductSearch>(`/products?category=${encodeURIComponent(params.slug)}`)
    .catch(() => ({ items: [], total: 0, page: 1, limit: 24 }));
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-8 text-4xl font-black">Categoría: {params.slug}</h1>
      <ProductGrid products={data.items} />
    </main>
  );
}

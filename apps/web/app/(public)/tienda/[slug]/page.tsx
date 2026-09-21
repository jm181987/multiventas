import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { ProductGrid } from '@/components/ProductGrid';
import { Store } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PublicStore = Store & { products?: any[] };

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await publicApi<PublicStore>(`/stores/${params.slug}`).catch(() => null);
  if (!store) notFound();

  const accent = store.primaryColor || '#18181b';

  return (
    <main>
      <section className="relative overflow-hidden border-b text-white" style={{ backgroundColor: accent }}>
        {store.coverUrl && <img src={store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-end">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-zinc-900 shadow-xl">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black">{store.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-4xl font-black">{store.name}</h1>
            {store.description && <p className="mt-2 max-w-2xl text-white/85">{store.description}</p>}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-7 flex items-center gap-3">
          <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <div>
            <h2 className="text-2xl font-black">Productos</h2>
            <p className="text-sm text-muted-foreground">{store.products?.length ?? 0} disponibles</p>
          </div>
        </div>
        <ProductGrid products={store.products ?? []} />
      </section>
    </main>
  );
}

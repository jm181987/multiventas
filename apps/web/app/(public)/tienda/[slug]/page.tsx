import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Store, ShieldCheck } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { ProductGrid } from '@/components/ProductGrid';
import { Store as StoreType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PublicStore = StoreType & { products?: any[] };

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await publicApi<PublicStore>(`/stores/${params.slug}`).catch(() => null);
  if (!store) notFound();

  const accent = store.primaryColor || '#18181b';

  return (
    <main>
      <section className="relative overflow-hidden border-b text-white" style={{ backgroundColor: accent }}>
        {store.coverUrl && <img src={store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex min-h-[320px] max-w-7xl flex-col justify-end gap-5 px-4 py-12 sm:flex-row sm:items-end sm:justify-start">
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-white text-zinc-900 shadow-2xl">
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <Store className="size-12" />
            )}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-black sm:text-5xl">{store.name}</h1>
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"><ShieldCheck className="mr-1 size-3.5" /> Tienda verificada</span>
            </div>
            {store.description && <p className="mt-3 max-w-3xl text-base text-white/90 sm:text-lg">{store.description}</p>}
            <p className="mt-3 text-sm text-white/75">{store.products?.length ?? 0} productos publicados</p>
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: `${accent}33` }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <Link href={`/tienda/${store.slug}`} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Productos</Link>
          <span className="text-sm text-muted-foreground">Compra directamente en la tienda de {store.name}</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-7 flex items-center gap-3">
          <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <div>
            <h2 className="text-3xl font-black">Productos</h2>
            <p className="text-sm text-muted-foreground">{store.products?.length ?? 0} disponibles</p>
          </div>
        </div>
        <ProductGrid products={store.products ?? []} accentColor={accent} />
      </section>
    </main>
  );
}

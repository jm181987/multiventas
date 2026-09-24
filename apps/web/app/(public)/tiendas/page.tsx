import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Store as StoreIcon } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { StoreSearch } from '@/lib/types';
import { StoreCard } from '@/components/StoreCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tiendas',
  description: 'Descubrí tiendas independientes y sus catálogos dentro de SeVende, el marketplace multi-vendedor de KNJ.',
  alternates: { canonical: '/tiendas' },
  openGraph: {
    type: 'website',
    url: '/tiendas',
    title: 'Tiendas | SeVende',
    description: 'Descubrí vendedores y tiendas independientes dentro de SeVende.',
  },
};

function pageHref(page: number, q?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  return `/tiendas${params.toString() ? `?${params.toString()}` : ''}`;
}

export default async function StoresPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const q = searchParams.q?.trim() ?? '';
  const qs = new URLSearchParams({ page: String(page), limit: '12' });
  if (q) qs.set('q', q);

  const data = await publicApi<StoreSearch>(`/stores?${qs.toString()}`).catch(() => ({
    items: [],
    total: 0,
    page,
    limit: 12,
  }));
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Marketplace</p>
          <h1 className="text-4xl font-black tracking-tight">Tiendas</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Descubre vendedores, entra a su tienda y explora todo su catálogo respetando la identidad visual de cada marca.</p>
        </div>
        <form className="flex w-full max-w-md gap-2" action="/tiendas">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input name="q" defaultValue={q} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" placeholder="Buscar tienda o vendedor…" />
          </div>
          <button className="h-10 rounded-md bg-black px-4 text-sm font-semibold text-white">Buscar</button>
        </form>
      </div>

      {!data.items.length ? (
        <div className="grid place-items-center gap-3 rounded-2xl border bg-white p-14 text-center">
          <StoreIcon className="size-10 text-muted-foreground" />
          <div><p className="font-bold">No encontramos tiendas</p><p className="text-sm text-muted-foreground">Prueba con otra búsqueda.</p></div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((store) => <StoreCard key={store.id} store={store} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && <Link href={pageHref(page - 1, q)} className="rounded-md border px-4 py-2 text-sm font-semibold">Anterior</Link>}
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={pageHref(page + 1, q)} className="rounded-md border px-4 py-2 text-sm font-semibold">Siguiente</Link>}
        </div>
      )}
    </main>
  );
}

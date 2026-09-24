import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Search, ShieldCheck, Store } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductSearch, Store as StoreType } from '@/lib/types';
import { contrastText } from '@/lib/utils';
import { ReviewStars } from '@/components/ReviewStars';
import { ShareButton } from '@/components/ShareButton';

export const dynamic = 'force-dynamic';

type PublicStore = StoreType & {
  productCount?: number;
  vendor?: { businessName?: string | null };
};

const siteUrl = 'https://www.sevende.knjpro.site';

function storeDescription(store: PublicStore) {
  const fallback = `Explorá los productos de ${store.name} en SeVende, el marketplace de KNJ.`;
  return (store.description || fallback).replace(/\s+/g, ' ').trim().slice(0, 160);
}

function absoluteMedia(url?: string | null) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return siteUrl + (url.startsWith('/') ? url : '/' + url);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const store = await publicApi<PublicStore>(`/stores/${params.slug}`).catch(() => null);
  if (!store) {
    return {
      title: 'Tienda no disponible',
      robots: { index: false, follow: false },
    };
  }

  const description = storeDescription(store);
  const canonical = `/tienda/${store.slug}`;
  return {
    title: `${store.name} · Tienda online`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      locale: 'es_UY',
      siteName: 'SeVende',
      url: canonical,
      title: `${store.name} | SeVende`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${store.name} | SeVende`,
      description,
    },
  };
}

type ReviewSummary = {
  average: number;
  count: number;
  distribution: Array<{ rating: number; count: number }>;
};

function storeHref(slug: string, page: number, q: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  return `/tienda/${slug}${params.toString() ? `?${params.toString()}` : ''}`;
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { q?: string; page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const q = searchParams.q?.trim() ?? '';

  const productParams = new URLSearchParams({
    store: params.slug,
    page: String(page),
    limit: '24',
  });
  if (q) productParams.set('q', q);

  const [store, products] = await Promise.all([
    publicApi<PublicStore>(`/stores/${params.slug}`).catch(() => null),
    publicApi<ProductSearch>(`/products?${productParams.toString()}`).catch(() => ({ items: [], total: 0, page, limit: 24 })),
  ]);

  if (!store) notFound();

  const reputation = await publicApi<ReviewSummary>(`/reviews/stores/${store.id}/summary`)
    .catch(() => ({ average: 0, count: 0, distribution: [] }));

  const accent = store.primaryColor || '#18181b';
  const accentText = contrastText(accent);
  const totalPages = Math.max(1, Math.ceil(products.total / products.limit));
  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.name,
    url: `${siteUrl}/tienda/${store.slug}`,
    description: storeDescription(store),
    ...(store.logoUrl ? { logo: absoluteMedia(store.logoUrl) } : {}),
    ...(reputation.count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reputation.average,
        reviewCount: reputation.count,
        bestRating: 5,
        worstRating: 1,
      },
    } : {}),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema).replace(/</g, '\\u003c') }}
      />
      <section className="relative overflow-hidden border-b text-white" style={{ backgroundColor: accent }}>
        {store.coverUrl && <img src={store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex min-h-[320px] max-w-7xl flex-col justify-end gap-5 px-4 py-12 sm:flex-row sm:items-end sm:justify-start">
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-white text-zinc-900 shadow-2xl">
            {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" /> : <Store className="size-12" />}
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-black sm:text-5xl">{store.name}</h1>
              <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"><ShieldCheck className="mr-1 size-3.5" /> Tienda verificada</span>
            </div>
            {store.vendor?.businessName && <p className="mt-1 text-sm text-white/75">{store.vendor.businessName}</p>}
            {store.description && <p className="mt-3 max-w-3xl text-base text-white/90 sm:text-lg">{store.description}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span>{store.productCount ?? products.total} productos publicados</span>
              {reputation.count > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 backdrop-blur">
                  <ReviewStars rating={reputation.average} />
                  <strong className="text-white">{reputation.average.toFixed(1)}</strong>
                  <span>· {reputation.count} opiniones verificadas</span>
                </span>
              )}
            </div>
            <div className="mt-4">
              <ShareButton
                path={`/tienda/${store.slug}`}
                title={store.name}
                text={`Conocé ${store.name} en SeVende`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: `${accent}33` }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/tienda/${store.slug}`} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: accent, color: accentText }}>Todos los productos</Link>
            <Link href="/tiendas" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Ver otras tiendas</Link>
          </div>
          <span className="text-sm text-muted-foreground">Compra directamente en {store.name}</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
            <div><h2 className="text-3xl font-black">Productos</h2><p className="text-sm text-muted-foreground">{products.total} disponibles</p></div>
          </div>
          <form className="flex w-full max-w-md gap-2" action={`/tienda/${store.slug}`}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <input name="q" defaultValue={q} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" placeholder="Buscar en esta tienda…" />
            </div>
            <button className="h-10 rounded-md px-4 text-sm font-semibold" style={{ backgroundColor: accent, color: accentText }}>Buscar</button>
          </form>
        </div>

        <ProductGrid products={products.items} accentColor={accent} />

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            {page > 1 && <Link href={storeHref(store.slug, page - 1, q)} className="rounded-md border px-4 py-2 text-sm font-semibold">Anterior</Link>}
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            {page < totalPages && <Link href={storeHref(store.slug, page + 1, q)} className="rounded-md border px-4 py-2 text-sm font-semibold">Siguiente</Link>}
          </div>
        )}
      </section>
    </main>
  );
}

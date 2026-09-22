import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Store as StoreIcon } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Product, ProductSearch } from '@/lib/types';
import { money } from '@/lib/utils';
import { ProductGrid } from '@/components/ProductGrid';
import { Badge } from '@/components/ui/badge';
import { ProductPurchasePanel } from '@/components/ProductPurchasePanel';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await publicApi<Product>(`/products/${params.id}`).catch(() => null);
  if (!product) notFound();

  const related = await publicApi<ProductSearch>(`/products?store=${encodeURIComponent(product.store.slug)}&limit=5`)
    .catch(() => ({ items: [], total: 0, page: 1, limit: 5 }));

  const moreFromSeller = related.items.filter((item) => item.id !== product.id).slice(0, 4);
  const image = product.images?.[0]?.url ?? 'https://placehold.co/1000x1000?text=Multiventas';
  const accent = product.store.primaryColor || '#18181b';

  return (
    <main>
      <section className="relative overflow-hidden border-b text-white" style={{ backgroundColor: accent }}>
        {product.store.coverUrl && <img src={product.store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-5">
          <Link href={`/tienda/${product.store.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
            <ArrowLeft className="size-4" /> Volver a {product.store.name}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <Image src={image} alt={product.title} fill unoptimized={image.startsWith('/media/')} className="object-cover" />
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(1, 6).map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    <Image src={img.url} alt={img.alt ?? product.title} fill unoptimized={img.url.startsWith('/media/')} className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Link href={`/tienda/${product.store.slug}`} className="flex items-center gap-3 rounded-xl border bg-white p-3 hover:bg-muted/40" style={{ borderColor: `${accent}55` }}>
              <div className="grid size-12 place-items-center overflow-hidden rounded-xl border bg-muted">
                {product.store.logoUrl ? <img src={product.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="size-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendido por</p>
                <p className="truncate font-black">{product.store.name}</p>
              </div>
              <ArrowRight className="ml-auto size-4" />
            </Link>

            <div>
              {product.category && <Badge className="text-white" style={{ backgroundColor: accent }}>{product.category.name}</Badge>}
              <h1 className="mt-3 text-4xl font-black tracking-tight">{product.title}</h1>
              {product.description && <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p>}
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: `${accent}44` }}>
              <p className="text-4xl font-black">{money(product.price, product.currency)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Stock disponible: {product.stock}</p>
              <div className="mt-5"><ProductPurchasePanel productId={product.id} stock={product.stock} accentColor={accent} /></div>
            </div>

            <Link
              href={`/tienda/${product.store.slug}`}
              className="inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Ver todos los productos de {product.store.name}
            </Link>
          </div>
        </div>

        {!!moreFromSeller.length && (
          <section className="mt-14 border-t pt-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Misma tienda</p>
                <h2 className="text-3xl font-black">Más de {product.store.name}</h2>
              </div>
              <Link href={`/tienda/${product.store.slug}`} className="text-sm font-semibold">Ver tienda →</Link>
            </div>
            <ProductGrid products={moreFromSeller} accentColor={accent} />
          </section>
        )}
      </section>
    </main>
  );
}

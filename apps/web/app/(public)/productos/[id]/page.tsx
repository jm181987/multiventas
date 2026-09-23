import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, Gift, MapPin, ShieldCheck, Store as StoreIcon, Truck } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Product, ProductSearch } from '@/lib/types';
import { money } from '@/lib/utils';
import { ProductGrid } from '@/components/ProductGrid';
import { Badge } from '@/components/ui/badge';
import { ProductPurchasePanel } from '@/components/ProductPurchasePanel';
import { ReviewStars } from '@/components/ReviewStars';

export const dynamic = 'force-dynamic';

type ReviewSummary = {
  average: number;
  count: number;
  distribution: Array<{ rating: number; count: number }>;
};

type ProductReviews = {
  items: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    verifiedPurchase: boolean;
    buyerName: string;
  }>;
  total: number;
  page: number;
  limit: number;
  summary: ReviewSummary;
};

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await publicApi<Product>(`/products/${params.id}`).catch(() => null);
  if (!product) notFound();

  const [related, reviews, storeReputation] = await Promise.all([
    publicApi<ProductSearch>(`/products?store=${encodeURIComponent(product.store.slug)}&limit=5`)
      .catch(() => ({ items: [], total: 0, page: 1, limit: 5 })),
    publicApi<ProductReviews>(`/reviews/products/${product.id}?limit=8`)
      .catch(() => ({ items: [], total: 0, page: 1, limit: 8, summary: { average: 0, count: 0, distribution: [] } })),
    publicApi<ReviewSummary>(`/reviews/stores/${product.store.id}/summary`)
      .catch(() => ({ average: 0, count: 0, distribution: [] })),
  ]);

  const moreFromSeller = related.items.filter((item) => item.id !== product.id).slice(0, 4);
  const image = product.images?.[0]?.url ?? 'https://placehold.co/1000x1000?text=SeVende';
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
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendido por</p>
                <p className="truncate font-black">{product.store.name}</p>
                {storeReputation.count > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <ReviewStars rating={storeReputation.average} />
                    <span>{storeReputation.average.toFixed(1)} · {storeReputation.count} opiniones</span>
                  </div>
                )}
              </div>
              <ArrowRight className="ml-auto size-4" />
            </Link>

            <div>
              {product.category && <Badge className="text-white" style={{ backgroundColor: accent }}>{product.category.name}</Badge>}
              <h1 className="mt-3 text-4xl font-black tracking-tight">{product.title}</h1>
              {reviews.summary.count > 0 && (
                <a href="#opiniones" className="mt-3 inline-flex items-center gap-2 text-sm hover:underline">
                  <ReviewStars rating={reviews.summary.average} showValue />
                  <span className="text-muted-foreground">{reviews.summary.count} opiniones verificadas</span>
                </a>
              )}
              {product.description && <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p>}
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: `${accent}44` }}>
              <p className="text-4xl font-black">{money(product.price, product.currency)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Stock disponible: {product.stock}</p>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Formas de entrega</p>
                {product.deliveryOptions?.length ? (
                  <div className="grid gap-2">
                    {product.deliveryOptions.map((option) => {
                      const Icon = option.type === 'SHIPPING_PAID'
                        ? Truck
                        : option.type === 'SHIPPING_FREE'
                          ? Gift
                          : option.type === 'PICKUP'
                            ? MapPin
                            : Download;
                      const label = option.type === 'SHIPPING_PAID'
                        ? 'Envío pago'
                        : option.type === 'SHIPPING_FREE'
                          ? 'Envío gratis'
                          : option.type === 'PICKUP'
                            ? 'Retiro en local'
                            : 'Entrega digital';
                      return (
                        <div key={option.type} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><Icon className="size-4" /></span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">{label}</p>
                              {option.type === 'SHIPPING_PAID' && <span className="text-sm font-black">{money(Number(option.fee), product.currency)}</span>}
                            </div>
                            {option.details && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{option.details}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm text-muted-foreground">Entrega a coordinar directamente con el vendedor.</p>
                )}
              </div>

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

        <section id="opiniones" className="mt-14 border-t pt-10">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Reputación</p>
              <h2 className="mt-1 text-3xl font-black">Opiniones verificadas</h2>

              {reviews.summary.count > 0 ? (
                <div className="mt-5 rounded-2xl border bg-slate-50 p-5">
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black">{reviews.summary.average.toFixed(1)}</span>
                    <span className="pb-1 text-sm text-muted-foreground">de 5</span>
                  </div>
                  <div className="mt-2"><ReviewStars rating={reviews.summary.average} size="md" /></div>
                  <p className="mt-2 text-sm text-muted-foreground">{reviews.summary.count} opiniones publicadas</p>

                  <div className="mt-5 space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = reviews.summary.distribution.find((item) => item.rating === rating)?.count ?? 0;
                      const percent = reviews.summary.count ? (count / reviews.summary.count) * 100 : 0;
                      return (
                        <div key={rating} className="grid grid-cols-[18px_1fr_28px] items-center gap-2 text-xs">
                          <span>{rating}</span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: percent + '%' }} />
                          </div>
                          <span className="text-right text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Este producto todavía no tiene opiniones publicadas. Las reseñas solo pueden ser creadas por compradores con pedidos entregados.
                </p>
              )}
            </div>

            <div className="space-y-3">
              {reviews.items.map((review) => (
                <article key={review.id} className="rounded-2xl border bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{review.buyerName}</p>
                      {review.verifiedPurchase && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <ShieldCheck className="size-3.5" /> Compra verificada
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <ReviewStars rating={review.rating} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('es-UY')}
                      </p>
                    </div>
                  </div>
                  {review.comment && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{review.comment}</p>}
                </article>
              ))}
              {!reviews.items.length && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Sé de los primeros compradores en compartir tu experiencia cuando recibas este producto.
                </div>
              )}
            </div>
          </div>
        </section>

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

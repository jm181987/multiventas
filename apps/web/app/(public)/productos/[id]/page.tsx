import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store as StoreIcon } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Product } from '@/lib/types';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ProductPurchasePanel } from '@/components/ProductPurchasePanel';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await publicApi<Product>(`/products/${params.id}`).catch(() => null);
  if (!product) notFound();

  const image = product.images?.[0]?.url ?? 'https://placehold.co/1000x1000?text=Multiventas';
  const accent = product.store.primaryColor || '#18181b';

  return (
    <main>
      <section className="border-b" style={{ borderColor: `${accent}33` }}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <Link href={`/tienda/${product.store.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold hover:underline">
            <ArrowLeft className="size-4" /> Volver a {product.store.name}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-3xl border bg-muted">
              <Image src={image} alt={product.title} fill unoptimized={image.startsWith('/media/')} className="object-cover" />
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.slice(1, 6).map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                    <Image src={img.url} alt={img.alt ?? product.title} fill unoptimized={img.url.startsWith('/media/')} className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Link
              href={`/tienda/${product.store.slug}`}
              className="flex items-center gap-3 rounded-2xl border p-3 transition hover:bg-muted/40"
              style={{ borderColor: `${accent}55` }}
            >
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
                {product.store.logoUrl ? <img src={product.store.logoUrl} alt={product.store.name} className="h-full w-full object-cover" /> : <StoreIcon className="size-6" />}
              </div>
              <div className="min-w-0">
                <Badge className="text-white" style={{ backgroundColor: accent }}>Tienda</Badge>
                <p className="mt-1 truncate font-black">{product.store.name}</p>
              </div>
            </Link>

            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{product.title}</h1>
              {product.description && <p className="mt-4 whitespace-pre-line text-base leading-7 text-muted-foreground">{product.description}</p>}
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: `${accent}44` }}>
              <p className="text-4xl font-black">{money(product.price, product.currency)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock disponible'}</p>
              <div className="mt-5"><ProductPurchasePanel productId={product.id} stock={product.stock} accentColor={accent} /></div>
            </div>

            <div className="rounded-2xl p-5 text-sm text-white" style={{ backgroundColor: accent }}>
              <p className="font-bold">Compras en {product.store.name}</p>
              <p className="mt-1 text-white/80">Este producto pertenece a la tienda y mantiene su identidad visual durante toda la experiencia de compra.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

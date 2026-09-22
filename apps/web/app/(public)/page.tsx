import Link from 'next/link';
import { ArrowRight, ShieldCheck, Store, Zap } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { ProductSearch, StoreSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { StoreCard } from '@/components/StoreCard';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let catalogError = false;
  const [products, stores] = await Promise.all([
    publicApi<ProductSearch>('/products?limit=8').catch(() => {
      catalogError = true;
      return { items: [], total: 0, page: 1, limit: 8 };
    }),
    publicApi<StoreSearch>('/stores?limit=6').catch(() => ({ items: [], total: 0, page: 1, limit: 6 })),
  ]);

  return (
    <main>
      <section className="hero-grid border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div className="space-y-7">
            <div className="inline-flex rounded-full border bg-white px-3 py-1 text-sm font-medium">Marketplace uruguayo · Multi-vendedor</div>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">Todo lo que buscás. <span className="text-zinc-500">Muchas tiendas, un solo lugar.</span></h1>
            <p className="max-w-xl text-lg text-muted-foreground">Comprá a vendedores independientes, conoce cada tienda y explora todo su catálogo con su propia identidad visual.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/productos" className="inline-flex h-12 items-center rounded-md bg-black px-6 font-semibold text-white">Explorar productos <ArrowRight className="ml-2 size-4" /></Link>
              <Link href="/tiendas" className="inline-flex h-12 items-center rounded-md border bg-white px-6 font-semibold">Ver tiendas</Link>
              <Link href="/registro?tipo=vendedor" className="inline-flex h-12 items-center rounded-md border bg-white px-6 font-semibold">Crear mi tienda</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[[Store,'Multi-tienda','Cada vendedor tiene su propio escaparate y catálogo.'],[ShieldCheck,'Split automático','La plataforma no custodia fondos.'],[Zap,'Venta simple','Stock, pedidos y pagos sincronizados.']].map(([Icon,title,text]: any) => (
              <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm"><Icon className="mb-4 size-7" /><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      {!!stores.items.length && (
        <section className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Vendedores</p><h2 className="text-3xl font-black">Descubre tiendas</h2><p className="mt-1 text-muted-foreground">Entra a una tienda y mira todos los productos de ese vendedor.</p></div>
              <Link href="/tiendas" className="shrink-0 text-sm font-semibold">Ver todas →</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {stores.items.map((store) => <StoreCard key={store.id} store={store} />)}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-7 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Novedades</p><h2 className="text-3xl font-black">Productos destacados</h2></div><Link href="/productos" className="text-sm font-semibold">Ver todos →</Link></div>
        {catalogError && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">El catálogo no está disponible temporalmente. Intenta recargar en unos segundos.</div>}
        <ProductGrid products={products.items} />
      </section>
    </main>
  );
}

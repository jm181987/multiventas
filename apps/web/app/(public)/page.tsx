import Link from 'next/link';
import { ArrowRight, Palette, ShieldCheck, Store, Zap } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { ProductSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { CustomizationMirror, StoreIdentityShowcase } from '@/components/LandingCustomizationShowcase';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let catalogError = false;
  const data = await publicApi<ProductSearch>('/products?limit=8').catch(() => {
    catalogError = true;
    return { items: [], total: 0, page: 1, limit: 8 };
  });

  return (
    <main>
      <section className="overflow-hidden border-b bg-gradient-to-b from-white to-zinc-50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-semibold shadow-sm"><Palette className="size-4" /> Tu tienda. Tu marca. Tus reglas.</div>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">Vende con una tienda que <span className="text-zinc-500">se vea realmente tuya.</span></h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">Cambia colores, logo, portada y estilo. Multiventas te da la infraestructura del marketplace sin quitarle identidad a cada comercio.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/registro?tipo=vendedor" className="inline-flex h-12 items-center rounded-md bg-black px-6 font-semibold text-white">Crear mi tienda <ArrowRight className="ml-2 size-4" /></Link>
              <Link href="/productos" className="inline-flex h-12 items-center rounded-md border bg-white px-6 font-semibold">Explorar tiendas</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[[Store,'Identidad propia'],[ShieldCheck,'Pagos seguros'],[Zap,'Gestión simple']].map(([Icon,title]: any) => (
                <div key={title} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Icon className="size-4 text-foreground" />{title}</div>
              ))}
            </div>
          </div>
          <CustomizationMirror />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-muted-foreground">Una plataforma, muchas identidades</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">La misma tecnología. Tres marcas completamente distintas.</h2>
          <p className="mt-3 text-muted-foreground">Cada vendedor controla cómo se presenta su tienda mientras comparte la potencia del marketplace.</p>
        </div>
        <StoreIdentityShowcase />
      </section>

      <section className="border-y bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Marketplace</p><h2 className="text-3xl font-black">Productos disponibles</h2><p className="mt-1 text-sm text-muted-foreground">Cada tarjeta conserva el color y la identidad de su tienda.</p></div>
            <Link href="/productos" className="shrink-0 text-sm font-semibold">Ver todos →</Link>
          </div>
          {catalogError && <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">El catálogo no está disponible temporalmente. Intenta recargar en unos segundos.</div>}
          <ProductGrid products={data.items} />
        </div>
      </section>
    </main>
  );
}

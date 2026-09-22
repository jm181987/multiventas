import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Store,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { publicApi } from '@/lib/api';
import { ProductSearch, StoreSearch } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { StoreCard } from '@/components/StoreCard';
import { HowItWorksCarousel } from '@/components/HowItWorksCarousel';

export const dynamic = 'force-dynamic';

const features = [
  {
    icon: Store,
    title: 'Multi-tienda',
    text: 'Cada vendedor tiene su propio escaparate, identidad visual y catálogo.',
    accent: 'text-[#22D3EE]',
  },
  {
    icon: ShieldCheck,
    title: 'Split automático',
    text: 'Pagos integrados con Mercado Pago sin que la plataforma custodie fondos.',
    accent: 'text-[#6366F1]',
  },
  {
    icon: Zap,
    title: 'Venta simple',
    text: 'Productos, stock, pedidos y cobros conectados en un mismo flujo.',
    accent: 'text-[#22D3EE]',
  },
];

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
    <main className="bg-[#F8FAFC]">
      <section className="tech-commerce-hero relative overflow-hidden border-b border-white/[.06] text-[#F8FAFC]">
        <div className="tech-commerce-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="tech-pulse pointer-events-none absolute -right-20 top-10 size-72 rounded-full bg-[#6366F1]/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-20 bottom-0 size-64 rounded-full bg-[#22D3EE]/[.06] blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_.98fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.04] px-3 py-1.5 text-sm font-medium text-[#94A3B8] backdrop-blur">
                <span className="size-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,.7)]" />
                Marketplace uruguayo · Multi-vendedor
              </div>

              <h1 className="mt-7 text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Todo lo que buscás.
                <span className="mt-2 block bg-gradient-to-r from-[#818CF8] via-[#8B5CF6] to-[#22D3EE] bg-clip-text text-transparent">
                  Muchas tiendas, un solo lugar.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[#94A3B8] sm:text-lg">
                Comprá a vendedores independientes o creá tu propia tienda online con una experiencia moderna,
                pagos con Mercado Pago y gestión centralizada.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/registro?tipo=vendedor"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-6 font-semibold text-white shadow-[0_14px_40px_rgba(99,102,241,.28)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_46px_rgba(99,102,241,.42)]"
                >
                  Crear mi tienda <ArrowRight className="ml-2 size-4" />
                </Link>

                <Link
                  href="/productos"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/[.12] bg-white/[.04] px-6 font-semibold text-[#F8FAFC] transition hover:border-white/[.2] hover:bg-white/[.08]"
                >
                  Explorar productos
                </Link>

                <Link
                  href="/tiendas"
                  className="inline-flex h-12 items-center justify-center px-3 text-sm font-semibold text-[#94A3B8] transition hover:text-white"
                >
                  Ver tiendas <ArrowRight className="ml-2 size-4" />
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#94A3B8]">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#10B981]" />
                  Pagos con Mercado Pago
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-[#10B981]" />
                  Tiendas independientes
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-6 rounded-[2.2rem] bg-gradient-to-r from-[#6366F1]/10 to-[#22D3EE]/10 blur-2xl" aria-hidden="true" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-[#111827]/90 p-4 shadow-[0_30px_90px_rgba(0,0,0,.45)] backdrop-blur sm:p-5">
                <div className="flex items-center justify-between border-b border-white/[.07] pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#64748B]">Vista de negocio</p>
                    <p className="mt-1 text-sm font-semibold text-white">SeVende Commerce</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-2.5 py-1 text-xs font-semibold text-[#6EE7B7]">
                    <span className="size-1.5 rounded-full bg-[#10B981]" /> En línea
                  </span>
                </div>

                <div className="grid gap-4 pt-4 sm:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-2xl border border-white/[.07] bg-[#0B1020] p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-[#64748B]">Ventas de hoy</p>
                        <p className="mt-1 text-3xl font-black tracking-tight">$ 18.420</p>
                      </div>
                      <span className="grid size-9 place-items-center rounded-xl bg-[#6366F1]/10 text-[#818CF8]">
                        <TrendingUp className="size-4" />
                      </span>
                    </div>

                    <div className="mt-6 flex h-28 items-end gap-2">
                      {[38, 54, 46, 72, 62, 86, 74, 94].map((height, index) => (
                        <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-[#6366F1] to-[#22D3EE]" style={{ height: `${height}%`, opacity: 0.35 + index * 0.06 }} />
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-[#64748B]">
                      <span>Pedidos activos</span>
                      <span className="font-semibold text-[#F8FAFC]">12</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="tech-float rounded-2xl border border-white/[.08] bg-white/[.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-[#22D3EE]/10 text-[#22D3EE]">
                          <PackageCheck className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs text-[#64748B]">Nuevo pedido</p>
                          <p className="text-sm font-bold">#SV-2841</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-[#94A3B8]">Estado</span>
                        <span className="font-semibold text-[#6EE7B7]">Confirmado</span>
                      </div>
                    </div>

                    <div className="tech-float-delayed rounded-2xl border border-white/[.08] bg-white/[.04] p-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-[#6366F1]/10 text-[#818CF8]">
                          <CreditCard className="size-5" />
                        </span>
                        <div>
                          <p className="text-xs text-[#64748B]">Pago procesado</p>
                          <p className="text-sm font-bold">Mercado Pago</p>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                        <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[#6366F1] to-[#22D3EE]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-3 lg:mt-16">
            {features.map(({ icon: Icon, title, text, accent }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[.07] bg-[#111827]/65 p-5 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/[.12] hover:bg-[#111827]/90"
              >
                <Icon className={`size-5 ${accent}`} />
                <h3 className="mt-4 font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#94A3B8]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksCarousel />

      {!!stores.items.length && (
        <section className="border-b border-slate-200 bg-[#F8FAFC]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#6366F1]">Vendedores</p>
                <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Descubrí tiendas</h2>
                <p className="mt-2 text-slate-500">Entrá a una tienda y explorá todo el catálogo de ese vendedor.</p>
              </div>
              <Link href="/tiendas" className="shrink-0 text-sm font-semibold text-[#4F46E5] transition hover:text-[#6366F1]">
                Ver todas →
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {stores.items.map((store) => <StoreCard key={store.id} store={store} />)}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#6366F1]">Novedades</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Productos destacados</h2>
              <p className="mt-2 text-slate-500">Productos reales de las tiendas que forman parte de SeVende.</p>
            </div>
            <Link href="/productos" className="shrink-0 text-sm font-semibold text-[#4F46E5] transition hover:text-[#6366F1]">
              Ver todos →
            </Link>
          </div>
          {catalogError && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              El catálogo no está disponible temporalmente. Intenta recargar en unos segundos.
            </div>
          )}
          <ProductGrid products={products.items} />
        </div>
      </section>
    </main>
  );
}

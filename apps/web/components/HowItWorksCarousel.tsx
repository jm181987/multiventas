'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  PackageCheck,
  Search,
  ShoppingBag,
  Store,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Journey = 'buyer' | 'seller';

const buyerSteps = [
  {
    icon: Search,
    title: 'Explorá productos y tiendas',
    text: 'Buscá lo que necesitás, compará opciones y entrá al catálogo de cada vendedor.',
    eyebrow: 'Descubrí',
  },
  {
    icon: ShoppingBag,
    title: 'Agregá al carrito',
    text: 'Elegí tus productos y revisá el pedido antes de continuar al checkout.',
    eyebrow: 'Elegí',
  },
  {
    icon: CreditCard,
    title: 'Completá tus datos y pagá',
    text: 'Indicá los datos de entrega y pagá de forma segura mediante Mercado Pago.',
    eyebrow: 'Pagá',
  },
  {
    icon: PackageCheck,
    title: 'Seguí tus pedidos',
    text: 'Desde tu cuenta podés revisar el estado de cada compra y mantener todo ordenado.',
    eyebrow: 'Recibí',
  },
];

const sellerSteps = [
  {
    icon: UserPlus,
    title: 'Creá tu cuenta de vendedor',
    text: 'Registrate con los datos básicos de tu negocio y elegí el nombre de tu tienda.',
    eyebrow: 'Empezá',
  },
  {
    icon: BadgeCheck,
    title: 'Esperá la aprobación',
    text: 'Revisamos la cuenta para habilitar las funciones de venta y proteger el marketplace.',
    eyebrow: 'Validá',
  },
  {
    icon: Store,
    title: 'Personalizá y cargá productos',
    text: 'Configurá logo, colores y datos de tu tienda. Después publicá productos, precios y stock.',
    eyebrow: 'Publicá',
  },
  {
    icon: WalletCards,
    title: 'Conectá Mercado Pago',
    text: 'Vinculá tu cuenta para recibir los pagos correspondientes a tus ventas.',
    eyebrow: 'Cobrá',
  },
  {
    icon: PackageCheck,
    title: 'Vendé y gestioná pedidos',
    text: 'Recibí pedidos, actualizá estados y administrá tu operación desde el panel.',
    eyebrow: 'Escalá',
  },
];

export function HowItWorksCarousel() {
  const [journey, setJourney] = useState<Journey>('buyer');
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);

  const steps = useMemo(() => (journey === 'buyer' ? buyerSteps : sellerSteps), [journey]);
  const current = steps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / steps.length) * 100;

  function selectJourney(nextJourney: Journey) {
    setJourney(nextJourney);
    setStep(0);
  }

  function previous() {
    setStep((value) => (value === 0 ? steps.length - 1 : value - 1));
  }

  function next() {
    setStep((value) => (value === steps.length - 1 ? 0 : value + 1));
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStart.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStart.current === null) return;
    const end = event.changedTouches[0]?.clientX ?? touchStart.current;
    const delta = end - touchStart.current;
    touchStart.current = null;

    if (Math.abs(delta) < 50) return;
    if (delta < 0) next();
    else previous();
  }

  return (
    <section className="border-b border-slate-200 bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="mb-8 flex flex-col gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#6366F1]">Cómo funciona</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Empezar es simple.
            </h2>
            <p className="mt-3 max-w-2xl text-slate-500">
              Elegí tu recorrido y avanzá paso a paso. Sin manuales largos ni configuraciones confusas.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => selectJourney('buyer')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                journey === 'buyer'
                  ? 'bg-[#0B1020] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Quiero comprar
            </button>
            <button
              type="button"
              onClick={() => selectJourney('seller')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                journey === 'seller'
                  ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Quiero vender
            </button>
          </div>
        </div>

        <div
          className="tech-commerce-panel relative overflow-hidden rounded-[2rem] border border-white/[.08] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,.22)] sm:p-8 lg:p-10"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="tech-commerce-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-[#6366F1]/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-56 rounded-full bg-[#22D3EE]/10 blur-3xl" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="text-[#22D3EE]">{String(step + 1).padStart(2, '0')}</span>
                <span className="text-[#475569]">/</span>
                <span className="text-[#64748B]">{String(steps.length).padStart(2, '0')}</span>
              </div>
              <p className="hidden text-xs font-semibold uppercase tracking-[.18em] text-[#64748B] sm:block">
                {journey === 'buyer' ? 'Experiencia de compra' : 'Tu camino para vender'}
              </p>
            </div>

            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#22D3EE] shadow-[0_0_18px_rgba(99,102,241,.5)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-[170px_1fr] sm:items-center lg:grid-cols-[240px_1fr] lg:gap-12">
              <div className="relative mx-auto grid size-40 place-items-center sm:mx-0 sm:size-44 lg:size-56">
                <div className="absolute inset-0 rounded-[2rem] border border-white/[.08] bg-white/[.035]" />
                <div className="absolute inset-5 rounded-[1.6rem] bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/5 blur-sm" />
                <div className="relative grid size-24 place-items-center rounded-3xl border border-white/[.1] bg-[#111827] text-[#22D3EE] shadow-[0_18px_50px_rgba(0,0,0,.3)] lg:size-28">
                  <Icon className="size-11 lg:size-12" strokeWidth={1.6} />
                </div>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[.2em] text-[#818CF8]">{current.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">{current.title}</h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#94A3B8] sm:mx-0 sm:text-base">
                  {current.text}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={previous}
                      className="border-white/[.1] bg-white/[.04] text-white hover:bg-white/[.08]"
                      aria-label="Paso anterior"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={next}
                      className="border-white/[.1] bg-white/[.04] text-white hover:bg-white/[.08]"
                    >
                      Siguiente <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>

                  {step === steps.length - 1 && (
                    <Link
                      href={journey === 'buyer' ? '/productos' : '/registro?tipo=vendedor'}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(99,102,241,.25)] transition hover:brightness-110"
                    >
                      {journey === 'buyer' ? 'Explorar productos' : 'Crear mi tienda'}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 sm:justify-start">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === step
                      ? 'w-8 bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,.45)]'
                      : 'w-2 bg-white/15 hover:bg-white/30'
                  }`}
                  aria-label={`Ir al paso ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                />
              ))}
            </div>

            <p className="mt-4 text-center text-[11px] font-medium text-[#64748B] sm:hidden">
              Deslizá hacia los lados para cambiar de paso
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

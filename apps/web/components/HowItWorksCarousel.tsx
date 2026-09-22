'use client';

import { useMemo, useState } from 'react';
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
  },
  {
    icon: ShoppingBag,
    title: 'Agregá al carrito',
    text: 'Elegí tus productos y revisá el pedido antes de continuar al checkout.',
  },
  {
    icon: CreditCard,
    title: 'Completá tus datos y pagá',
    text: 'Indicá los datos de entrega y pagá de forma segura mediante Mercado Pago.',
  },
  {
    icon: PackageCheck,
    title: 'Seguí tus pedidos',
    text: 'Desde tu cuenta podés revisar el estado de cada compra y mantener todo ordenado.',
  },
];

const sellerSteps = [
  {
    icon: UserPlus,
    title: 'Creá tu cuenta de vendedor',
    text: 'Registrate con los datos básicos de tu negocio y elegí el nombre de tu tienda.',
  },
  {
    icon: BadgeCheck,
    title: 'Esperá la aprobación',
    text: 'Revisamos la cuenta para habilitar las funciones de venta y proteger el marketplace.',
  },
  {
    icon: Store,
    title: 'Personalizá y cargá productos',
    text: 'Configurá logo, colores y datos de tu tienda. Después publicá productos, precios y stock.',
  },
  {
    icon: WalletCards,
    title: 'Conectá Mercado Pago',
    text: 'Vinculá tu cuenta para recibir los pagos correspondientes a tus ventas.',
  },
  {
    icon: PackageCheck,
    title: 'Vendé y gestioná pedidos',
    text: 'Recibí pedidos, actualizá estados y administrá tu operación desde el panel.',
  },
];

export function HowItWorksCarousel() {
  const [journey, setJourney] = useState<Journey>('buyer');
  const [step, setStep] = useState(0);

  const steps = useMemo(() => (journey === 'buyer' ? buyerSteps : sellerSteps), [journey]);
  const current = steps[step];
  const Icon = current.icon;

  function selectJourney(next: Journey) {
    setJourney(next);
    setStep(0);
  }

  function previous() {
    setStep((value) => (value === 0 ? steps.length - 1 : value - 1));
  }

  function next() {
    setStep((value) => (value === steps.length - 1 ? 0 : value + 1));
  }

  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cómo funciona</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Empezar es simple</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Elegí qué querés hacer y te mostramos el recorrido completo, paso a paso.
            </p>

            <div className="mt-6 inline-flex rounded-xl border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => selectJourney('buyer')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  journey === 'buyer' ? 'bg-black text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quiero comprar
              </button>
              <button
                type="button"
                onClick={() => selectJourney('seller')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  journey === 'seller' ? 'bg-black text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quiero vender
              </button>
            </div>

            <div className="mt-7 flex flex-wrap gap-2" aria-label="Progreso del recorrido">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === step ? 'w-9 bg-black' : 'w-2.5 bg-zinc-300 hover:bg-zinc-400'
                  }`}
                  aria-label={`Ir al paso ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                />
              ))}
            </div>

            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Paso {step + 1} de {steps.length}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
            <div className="absolute right-0 top-0 size-48 rounded-full bg-sky-500/20 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/10">
                  <Icon className="size-7" />
                </div>
                <span className="text-5xl font-black text-white/10">{String(step + 1).padStart(2, '0')}</span>
              </div>

              <h3 className="mt-8 text-2xl font-black sm:text-3xl">{current.title}</h3>
              <p className="mt-3 min-h-16 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                {current.text}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={previous}
                    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                    aria-label="Paso anterior"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={next}
                    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    Siguiente <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>

                {step === steps.length - 1 && (
                  <Link
                    href={journey === 'buyer' ? '/productos' : '/registro?tipo=vendedor'}
                    className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-100"
                  >
                    {journey === 'buyer' ? 'Explorar productos' : 'Crear mi tienda'}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

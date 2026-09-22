import Link from 'next/link';
import { CreditCard, FileText, Scale, ShieldCheck } from 'lucide-react';

const docs = [
  {
    href: '/legal/terminos',
    title: 'Términos de uso',
    description: 'Reglas generales de acceso, cuentas, compradores, vendedores, funcionamiento y limitaciones.',
    icon: FileText,
  },
  {
    href: '/legal/privacidad',
    title: 'Privacidad',
    description: 'Qué datos procesa la plataforma, para qué se utilizan y cómo se protegen.',
    icon: ShieldCheck,
  },
  {
    href: '/legal/marketplace',
    title: 'Reglas del marketplace',
    description: 'Responsabilidades de vendedores y compradores, publicaciones, productos prohibidos y moderación.',
    icon: Scale,
  },
  {
    href: '/legal/comisiones',
    title: 'Comisiones, pagos y entregas',
    description: 'Fee del 8%, proveedores de pago, entregas, devoluciones, reclamos y disputas.',
    icon: CreditCard,
  },
] as const;

export default function LegalPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Transparencia</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Centro legal de Multiventas</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Aquí se explica cómo funciona la plataforma, qué responsabilidades corresponden a Multiventas,
          a cada tienda y a cada comprador, y cómo se aplican las comisiones, pagos y entregas.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border-2 border-zinc-900 bg-zinc-950 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Comisión estándar</p>
        <p className="mt-2 text-3xl font-black">8% del total de la orden</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
          La plataforma aplica actualmente una comisión estándar del 8% sobre el importe total de cada orden
          procesada por el marketplace, salvo acuerdo comercial distinto informado al vendedor.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {docs.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <Icon className="size-6" />
            <h2 className="mt-4 text-xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        Estos textos describen las reglas operativas de la plataforma y deben adaptarse a la identidad jurídica,
        domicilio, canales de contacto y normativa específica aplicable a la empresa antes de su lanzamiento comercial definitivo.
      </div>
    </main>
  );
}

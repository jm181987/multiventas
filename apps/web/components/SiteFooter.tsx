import Link from 'next/link';
import { ShieldCheck, Store } from 'lucide-react';

const legalLinks = [
  ['/legal/terminos', 'Términos de uso'],
  ['/legal/privacidad', 'Privacidad'],
  ['/legal/marketplace', 'Reglas del marketplace'],
  ['/legal/comisiones', 'Comisiones, pagos y entregas'],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-zinc-950 text-zinc-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-black text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-zinc-950"><Store className="size-5" /></span>
            Multiventas
          </Link>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
            Marketplace multi-vendedor. Cada tienda es responsable por sus productos, precios, stock,
            garantías y entregas. Multiventas provee la infraestructura tecnológica y de intermediación.
          </p>
          <div className="mt-5 inline-flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              Comisión estándar de plataforma: <strong className="text-white">8% del total de cada orden procesada</strong>,
              salvo que exista un acuerdo comercial diferente informado expresamente.
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-white">Legal</p>
          <nav className="mt-4 flex flex-col gap-3 text-sm">
            {legalLinks.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-white">{label}</Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-white">Importante</p>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Multiventas no fabrica, almacena, inspecciona ni transporta los productos publicados por terceros.
            En la máxima medida permitida por la ley aplicable, las obligaciones sobre producto, garantía,
            devolución y entrega corresponden al vendedor y/o proveedor logístico involucrado.
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Multiventas. Todos los derechos reservados.</span>
          <Link href="/legal" className="hover:text-zinc-300">Centro legal y funcionamiento de la plataforma</Link>
        </div>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import { ReactNode } from 'react';

export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8">
        <Link href="/legal" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Centro legal</Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Multiventas · Información legal</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{intro}</p>
        <p className="mt-3 text-xs text-muted-foreground">Última actualización: septiembre de 2026.</p>
      </div>
      <article className="space-y-8 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">
        {children}
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

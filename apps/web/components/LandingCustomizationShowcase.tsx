'use client';

import { useEffect, useState } from 'react';
import { Check, MousePointer2, Palette, Sparkles, Store } from 'lucide-react';

const themes = {
  green: { accent: '#16a34a', label: 'Verde' },
  red: { accent: '#dc2626', label: 'Rojo' },
};

function MiniProduct({ accent }: { accent: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="aspect-[4/3] bg-gradient-to-br from-zinc-100 to-zinc-200 p-3">
        <div className="h-full rounded-lg border border-white/70 bg-white/70" />
      </div>
      <div className="space-y-2 p-3">
        <div className="h-2.5 w-3/4 rounded-full bg-zinc-200" />
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-14 rounded-full bg-zinc-300" />
          <div className="h-7 w-16 rounded-md transition-colors duration-700" style={{ backgroundColor: accent }} />
        </div>
      </div>
    </div>
  );
}

export function CustomizationMirror() {
  const [theme, setTheme] = useState<'green' | 'red'>('green');
  const current = themes[theme];

  useEffect(() => {
    const id = window.setInterval(() => setTheme((value) => value === 'green' ? 'red' : 'green'), 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-zinc-100 via-white to-zinc-200 blur-2xl" />
      <div className="overflow-hidden rounded-[2rem] border bg-white shadow-2xl">
        <div className="grid lg:grid-cols-[170px_1fr]">
          <aside className="border-b bg-zinc-950 p-4 text-white lg:border-b-0 lg:border-r">
            <div className="mb-6 flex items-center gap-2 text-sm font-black"><Palette className="size-4" /> Editor</div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/50">Color principal</p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {Object.entries(themes).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key as 'green' | 'red')}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition"
                  style={{
                    borderColor: theme === key ? value.accent : 'rgba(255,255,255,.15)',
                    backgroundColor: theme === key ? value.accent + '22' : 'transparent',
                  }}
                >
                  <span className="size-4 rounded-full border border-white/40" style={{ backgroundColor: value.accent }} />
                  {value.label}
                  {theme === key && <Check className="ml-auto size-3.5" />}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/50">Vista previa</p>
              <p className="mt-1 text-xs text-white/80">Los cambios se reflejan instantáneamente.</p>
            </div>
          </aside>

          <div className="relative p-4 sm:p-6">
            <MousePointer2 className="absolute left-3 top-24 z-20 size-7 rotate-[-20deg] drop-shadow-md transition-all duration-700" style={{ color: current.accent }} />
            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="relative h-28 p-4 text-white transition-colors duration-700" style={{ backgroundColor: current.accent }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0 2px, transparent 3px)', backgroundSize: '22px 22px' }} />
                <div className="relative flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-white text-zinc-900 shadow"><Store className="size-5" /></div>
                  <div><p className="font-black">Tu Tienda</p><p className="text-xs text-white/80">Una identidad hecha a tu medida.</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                {[0, 1, 2].map((index) => <MiniProduct key={index} accent={current.accent} />)}
              </div>
              <div className="flex items-center justify-between border-t p-4">
                <div><p className="text-xs text-muted-foreground">Botón principal</p><p className="font-bold">Comprar ahora</p></div>
                <button type="button" className="rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors duration-700" style={{ backgroundColor: current.accent }}>Comprar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 -top-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-bold shadow-lg">
        <Sparkles className="size-3.5" /> Tú tienes el control
      </div>
    </div>
  );
}

const demoStores = [
  { name: 'NOIR', category: 'Moda minimalista', accent: '#09090b', soft: '#f4f4f5', labels: ['Básicos', 'Nueva colección'] },
  { name: 'NEXBYTE', category: 'Tecnología', accent: '#2563eb', soft: '#dbeafe', labels: ['Gaming', 'Accesorios'] },
  { name: 'FUEGO', category: 'Comida & sabores', accent: '#ea580c', soft: '#ffedd5', labels: ['Combos', 'Favoritos'] },
];

export function StoreIdentityShowcase() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {demoStores.map((store, idx) => (
        <div key={store.name} className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          <div className="relative h-36 p-5" style={{ backgroundColor: store.accent }}>
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: idx === 0
                  ? 'linear-gradient(45deg,white 25%,transparent 25%,transparent 75%,white 75%)'
                  : idx === 1
                    ? 'radial-gradient(circle,white 1px,transparent 1px)'
                    : 'linear-gradient(120deg,transparent 40%,white 40%,white 45%,transparent 45%)',
                backgroundSize: '18px 18px',
              }}
            />
            <div className="relative flex items-center gap-3 text-white">
              <div className="grid size-12 place-items-center rounded-2xl bg-white font-black text-zinc-900">{store.name.slice(0, 1)}</div>
              <div><p className="text-xl font-black tracking-tight">{store.name}</p><p className="text-xs text-white/75">{store.category}</p></div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              {store.labels.map((label) => <span key={label} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: store.soft, color: store.accent }}>{label}</span>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((item) => (
                <div key={item} className="rounded-2xl border p-3">
                  <div className="aspect-square rounded-xl" style={{ backgroundColor: store.soft }} />
                  <div className="mt-3 h-2.5 w-4/5 rounded bg-zinc-200" />
                  <div className="mt-2 flex items-center justify-between"><div className="h-2.5 w-12 rounded bg-zinc-300" /><div className="size-7 rounded-md" style={{ backgroundColor: store.accent }} /></div>
                </div>
              ))}
            </div>
            <div className="rounded-xl px-4 py-3 text-center text-sm font-black text-white" style={{ backgroundColor: store.accent }}>Ver tienda</div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Category = { slug: string; name: string };
const HISTORY_KEY = 'sv-search-history';

export function ProductSearchControls({ categories, total }: { categories: Category[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [history, setHistory] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')); } catch { setHistory([]); }
  }, []);

  const activeCount = useMemo(() => ['category','minPrice','maxPrice'].filter((key) => params.get(key)).length, [params]);

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    next.delete('page');
    router.push(pathname + (next.size ? '?' + next.toString() : ''));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) {
      const next = [value, ...history.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6);
      setHistory(next);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    }
    navigate({ q: value });
  }

  const suggestions = query.trim().length >= 2
    ? history.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 4)
    : history.slice(0, 4);

  return (
    <section className="mb-7 min-w-0 space-y-4 rounded-2xl border bg-white p-3 shadow-sm sm:p-4">
      <form onSubmit={submit} className="relative flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Buscar productos, marcas o descripciones"
            className="h-11 w-full min-w-0 rounded-xl border bg-white pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-slate-300" />
          {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setQuery(''); navigate({ q: '' }); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="size-4" /></button>}
          {open && suggestions.length > 0 && (
            <div className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-xl border bg-white shadow-xl">
              <p className="px-3 pt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Búsquedas recientes</p>
              {suggestions.map((item) => <button key={item} type="button" onMouseDown={() => { setQuery(item); navigate({ q: item }); }} className="block w-full truncate px-3 py-2.5 text-left text-sm hover:bg-muted">{item}</button>)}
            </div>
          )}
        </div>
        <button className="h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">Buscar</button>
      </form>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><SlidersHorizontal className="size-4" /> Filtros{activeCount ? ` (${activeCount})` : ''}</span>
        <select aria-label="Categoría" value={params.get('category') ?? ''} onChange={(e) => navigate({ category: e.target.value })} className="h-9 max-w-full rounded-lg border bg-white px-2 text-sm">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input aria-label="Precio mínimo" inputMode="decimal" placeholder="Precio mín." defaultValue={params.get('minPrice') ?? ''} onBlur={(e) => navigate({ minPrice: e.target.value })} className="h-9 w-28 rounded-lg border px-2 text-sm" />
        <input aria-label="Precio máximo" inputMode="decimal" placeholder="Precio máx." defaultValue={params.get('maxPrice') ?? ''} onBlur={(e) => navigate({ maxPrice: e.target.value })} className="h-9 w-28 rounded-lg border px-2 text-sm" />
        <select aria-label="Ordenar productos" value={params.get('sort') ?? 'newest'} onChange={(e) => navigate({ sort: e.target.value })} className="h-9 rounded-lg border bg-white px-2 text-sm">
          <option value="newest">Más recientes</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
          <option value="name_asc">Nombre A-Z</option>
        </select>
        {(params.toString()) && <button type="button" onClick={() => { setQuery(''); router.push(pathname); }} className="h-9 rounded-lg border px-3 text-sm font-semibold">Limpiar</button>}
        <span className="ml-auto text-xs text-muted-foreground">{total} productos</span>
      </div>
    </section>
  );
}

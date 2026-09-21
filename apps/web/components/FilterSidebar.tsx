import Link from 'next/link';

export function FilterSidebar({ categories }: { categories: Array<{ slug: string; name: string }> }) {
  return (
    <aside className="space-y-5 rounded-xl border p-5">
      <div>
        <h3 className="font-bold">Categorías</h3>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link href="/productos">Todas</Link>
          {categories.map((c) => <Link key={c.slug} href={`/productos?category=${c.slug}`} className="text-muted-foreground hover:text-foreground">{c.name}</Link>)}
        </div>
      </div>
    </aside>
  );
}

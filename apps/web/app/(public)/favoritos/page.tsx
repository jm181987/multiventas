import { FavoritesView } from '@/components/FavoritesView';

export default function FavoritesPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Tu selección</p>
        <h1 className="text-3xl font-black tracking-tight">Favoritos</h1>
        <p className="mt-1 text-muted-foreground">Guardá productos para volver a ellos cuando quieras.</p>
      </div>
      <FavoritesView />
    </main>
  );
}

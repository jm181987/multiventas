import Image from 'next/image';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { ProductGrid } from '@/components/ProductGrid';

export default async function StorePage({ params }: { params: { slug: string } }) {
  const store = await publicApi<any>(`/stores/${params.slug}`).catch(() => null);
  if (!store) notFound();
  return (
    <main>
      <section className="border-b bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h1 className="text-4xl font-black">{store.name}</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">{store.description}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10"><ProductGrid products={store.products ?? []} /></section>
    </main>
  );
}

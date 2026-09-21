import Image from 'next/image';
import { notFound } from 'next/navigation';
import { publicApi } from '@/lib/api';
import { Product } from '@/lib/types';
import { money } from '@/lib/utils';
import { ProductCard } from '@/components/ProductCard';
import { Badge } from '@/components/ui/badge';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await publicApi<Product>(`/products/${params.id}`).catch(() => null);
  if (!product) notFound();
  const image = product.images?.[0]?.url ?? 'https://placehold.co/1000x1000?text=Multiventas';
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted"><Image src={image} alt={product.title} fill className="object-cover" /></div>
        <div className="space-y-6">
          <Badge>{product.store.name}</Badge>
          <div><h1 className="text-4xl font-black tracking-tight">{product.title}</h1><p className="mt-4 text-muted-foreground">{product.description}</p></div>
          <p className="text-4xl font-black">{money(product.price, product.currency)}</p>
          <p className="text-sm text-muted-foreground">Stock disponible: {product.stock}</p>
          <div className="max-w-sm"><ProductCard product={product} /></div>
        </div>
      </div>
    </main>
  );
}

import { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products, accentColor }: { products: Product[]; accentColor?: string }) {
  if (!products.length) return <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No encontramos productos.</div>;
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} accentColor={accentColor} />)}</div>;
}

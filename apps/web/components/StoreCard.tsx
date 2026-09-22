import Link from 'next/link';
import { ArrowRight, Package, Store as StoreIcon } from 'lucide-react';
import { Store } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

export type PublicStoreCard = Store & {
  productCount: number;
  vendor?: { businessName?: string | null };
  products?: Array<{
    id: string;
    title: string;
    images?: Array<{ url: string }>;
  }>;
};

export function StoreCard({ store }: { store: PublicStoreCard }) {
  const accent = store.primaryColor || '#18181b';
  const preview = store.products ?? [];

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/tienda/${store.slug}`} className="block">
        <div className="relative h-36 overflow-hidden" style={{ backgroundColor: accent }}>
          {store.coverUrl && <img src={store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute bottom-3 left-3 grid size-16 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-zinc-900 shadow-lg">
            {store.logoUrl ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" /> : <StoreIcon className="size-7" />}
          </div>
        </div>
        <CardContent className="space-y-4 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-black">{store.name}</h3>
                {store.vendor?.businessName && <p className="truncate text-xs text-muted-foreground">{store.vendor.businessName}</p>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                <Package className="size-3.5" /> {store.productCount}
              </span>
            </div>
            {store.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{store.description}</p>}
          </div>

          {!!preview.length && (
            <div className="grid grid-cols-4 gap-2">
              {preview.slice(0, 4).map((product) => (
                <div key={product.id} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] text-muted-foreground">Sin foto</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center text-sm font-semibold" style={{ color: accent }}>
            Ver tienda <ArrowRight className="ml-1 size-4" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

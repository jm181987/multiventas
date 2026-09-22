'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Store, ShoppingCart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/lib/types';
import { authApi, hasAuth } from '@/lib/api';
import { money } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/store/cart';

export function ProductCard({ product, accentColor }: { product: Product; accentColor?: string }) {
  const qc = useQueryClient();
  const open = useCartUi((s) => s.setOpen);
  const image = product.images?.[0]?.url ?? 'https://placehold.co/800x800?text=Multiventas';
  const storeAccent = accentColor || product.store?.primaryColor || '#18181b';

  const add = useMutation({
    mutationFn: () => authApi('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); open(true); },
  });

  return (
    <Card className="group overflow-hidden">
      <Link href={`/productos/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image src={image} alt={product.title} fill unoptimized={image.startsWith('/media/')} className="object-cover transition duration-300 group-hover:scale-105" />
        </div>
      </Link>

      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          {product.store?.slug ? (
            <Link
              href={`/tienda/${product.store.slug}`}
              className="inline-flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
              title={`Ver tienda ${product.store.name}`}
            >
              <span className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                {product.store.logoUrl ? <img src={product.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="size-3" />}
              </span>
              <span className="truncate">{product.store.name}</span>
            </Link>
          ) : <span />}
          <span className="shrink-0 text-xs text-muted-foreground">{product.stock} disponibles</span>
        </div>

        <Link href={`/productos/${product.id}`} className="line-clamp-2 min-h-12 font-semibold">{product.title}</Link>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-black">{money(product.price, product.currency)}</span>
          <Button
            size="sm"
            style={{ backgroundColor: storeAccent, color: '#fff' }}
            onClick={() => {
              if (!hasAuth()) { location.href = '/login'; return; }
              add.mutate();
            }}
            disabled={add.isPending || product.stock < 1}
          >
            <ShoppingCart className="mr-1 size-4" /> Agregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/lib/types';
import { authApi, hasAuth } from '@/lib/api';
import { money } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartUi } from '@/store/cart';

export function ProductCard({ product, accentColor }: { product: Product; accentColor?: string }) {
  const qc = useQueryClient();
  const open = useCartUi((s) => s.setOpen);
  const image = product.images?.[0]?.url ?? 'https://placehold.co/800x800?text=Multiventas';
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
          <Badge className={accentColor ? 'border border-transparent text-white' : undefined} style={accentColor ? { backgroundColor: accentColor } : undefined}>{product.store?.name}</Badge>
          <span className="text-xs text-muted-foreground">{product.stock} disponibles</span>
        </div>
        <Link href={`/productos/${product.id}`} className="line-clamp-2 min-h-12 font-semibold">{product.title}</Link>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xl font-black">{money(product.price, product.currency)}</span>
          <Button
            size="sm"
            style={accentColor ? { backgroundColor: accentColor, color: '#fff' } : undefined}
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

'use client';

import { ShoppingCart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, hasAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function ProductPurchasePanel({
  productId,
  stock,
  accentColor,
}: {
  productId: string;
  stock: number;
  accentColor?: string | null;
}) {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: () => authApi('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity: 1 }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  return (
    <Button
      className="w-full sm:w-auto"
      size="lg"
      style={accentColor ? { backgroundColor: accentColor, color: '#fff' } : undefined}
      disabled={add.isPending || stock < 1}
      onClick={() => {
        if (!hasAuth()) {
          location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
          return;
        }
        add.mutate();
      }}
    >
      <ShoppingCart className="mr-2 size-5" />
      {stock < 1 ? 'Sin stock' : add.isPending ? 'Agregando…' : 'Agregar al carrito'}
    </Button>
  );
}

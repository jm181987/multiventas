'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, hasAuth } from '@/lib/api';
import { Product } from '@/lib/types';
import { money } from '@/lib/utils';
import { useCartUi } from '@/store/cart';
import { Button } from '@/components/ui/button';

type CartItem = { productId: string; quantity: number };
type Detailed = CartItem & { product: Product };

async function loadCart(): Promise<Detailed[]> {
  if (!hasAuth()) return [];
  const cart = await authApi<CartItem[]>('/cart');
  return Promise.all(cart.map(async (item) => ({
    ...item,
    product: await authApi<Product>(`/products/${item.productId}`),
  })));
}

export function CartDrawer() {
  const open = useCartUi((s) => s.open);
  const setOpen = useCartUi((s) => s.setOpen);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['cart'], queryFn: loadCart, enabled: open });

  const refresh = () => qc.invalidateQueries({ queryKey: ['cart'] });
  const update = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      authApi(`/cart/${productId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (productId: string) => authApi(`/cart/${productId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  const busy = update.isPending || remove.isPending;
  const total = data.reduce((sum, row) => sum + Number(row.product.price) * row.quantity, 0);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
      <aside className="ml-auto flex h-[100dvh] w-full max-w-md min-w-0 flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="safe-area-top flex items-center justify-between gap-3 border-b px-4 pb-4 pt-4 sm:p-5">
          <h2 className="text-lg font-bold">Tu carrito</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Cerrar carrito"><X className="size-5" /></Button>
        </div>
        <div className="scrollbar-safe flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando carrito…</p>}
          {!isLoading && !data.length && <p className="text-sm text-muted-foreground">El carrito está vacío o todavía no iniciaste sesión.</p>}
          {data.map((row) => (
            <div key={row.productId} className="space-y-3 border-b pb-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{row.product.title}</p>
                  <p className="text-sm text-muted-foreground">{row.product.stock} disponibles</p>
                </div>
                <span className="shrink-0 font-semibold">{money(Number(row.product.price) * row.quantity, row.product.currency)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || row.quantity <= 1}
                    onClick={() => update.mutate({ productId: row.productId, quantity: row.quantity - 1 })}
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-8 text-center font-semibold">{row.quantity}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy || row.quantity >= row.product.stock}
                    onClick={() => update.mutate({ productId: row.productId, quantity: row.quantity + 1 })}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove.mutate(row.productId)}
                  aria-label="Eliminar del carrito"
                >
                  <Trash2 className="mr-1 size-4" /> Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="safe-area-bottom space-y-3 border-t px-4 pt-4 sm:p-5">
          <div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(total)}</span></div>
          <Link href="/checkout" onClick={() => setOpen(false)}>
            <Button className="w-full" disabled={!data.length}>Ir al checkout</Button>
          </Link>
        </div>
      </aside>
    </div>
  );
}

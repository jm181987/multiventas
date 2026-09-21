'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
  const { data = [] } = useQuery({ queryKey: ['cart'], queryFn: loadCart, enabled: open });
  const total = data.reduce((sum, row) => sum + Number(row.product.price) * row.quantity, 0);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setOpen(false)}>
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-bold">Tu carrito</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}><X className="size-5" /></Button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {!data.length && <p className="text-sm text-muted-foreground">El carrito está vacío o todavía no iniciaste sesión.</p>}
          {data.map((row) => (
            <div key={row.productId} className="flex justify-between gap-4 border-b pb-4">
              <div><p className="font-medium">{row.product.title}</p><p className="text-sm text-muted-foreground">Cantidad: {row.quantity}</p></div>
              <span className="font-semibold">{money(Number(row.product.price) * row.quantity, row.product.currency)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t p-5">
          <div className="flex justify-between text-lg font-black"><span>Total</span><span>{money(total)}</span></div>
          <Link href="/checkout" onClick={() => setOpen(false)}><Button className="w-full">Ir al checkout</Button></Link>
        </div>
      </aside>
    </div>
  );
}

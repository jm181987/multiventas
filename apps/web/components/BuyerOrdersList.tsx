'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, ShoppingBag } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OrderStatusTimeline, OrderStatus } from '@/components/OrderStatusTimeline';

type BuyerOrder = {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotal: string | number;
  shippingAmount: string | number;
  discountAmount: string | number;
  total: string | number;
  shippingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  store: { id: string; slug: string; name: string; description?: string | null; logoUrl?: string | null; coverUrl?: string | null; primaryColor?: string | null };
  payment?: { status: string; provider: string; paidAt?: string | null } | null;
  items: Array<{
    id: string;
    title: string;
    sku?: string | null;
    quantity: number;
    unitPrice: string | number;
    total: string | number;
    product?: { id: string; slug: string; images?: Array<{ url: string }> } | null;
  }>;
};

const label: Record<OrderStatus, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagado',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export function BuyerOrdersList() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['buyer-orders'], queryFn: () => authApi<BuyerOrder[]>('/orders/mine') });
  const cancel = useMutation({
    mutationFn: (id: string) => authApi(`/orders/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer-orders'] }),
  });

  const orders = query.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Compras</p>
        <h1 className="text-3xl font-black tracking-tight">Mis pedidos</h1>
        <p className="mt-1 text-muted-foreground">Sigue cada compra respetando la identidad de la tienda donde compraste.</p>
      </div>

      {query.isLoading ? <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      : query.error ? <p className="text-sm text-red-600">{String(query.error)}</p>
      : !orders.length ? (
        <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><PackageCheck className="size-10 text-muted-foreground" /><div><p className="font-bold">Todavía no tienes pedidos</p><p className="text-sm text-muted-foreground">Cuando compres, podrás seguirlos desde aquí.</p></div><Link href="/productos"><Button>Explorar productos</Button></Link></CardContent></Card>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const accent = order.store.primaryColor || '#18181b';
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="relative h-24" style={{ backgroundColor: accent }}>
                  {order.store.coverUrl && <img src={order.store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 text-white">
                    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-zinc-900">
                      {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-black">{order.store.name.slice(0,1)}</span>}
                    </div>
                    <div className="min-w-0"><Link href={`/tienda/${order.store.slug}`} className="truncate font-black hover:underline">{order.store.name}</Link><p className="text-xs text-white/80">Pedido #{order.id.slice(0,8).toUpperCase()}</p></div>
                  </div>
                </div>

                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Badge>{label[order.status]}</Badge>
                      <p className="mt-2 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</p>
                    </div>
                    <div className="md:text-right"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-black">{money(Number(order.total), order.currency)}</p></div>
                  </div>

                  <OrderStatusTimeline status={order.status} accentColor={accent} />

                  <div className="divide-y rounded-xl border">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                            {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="size-5 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-muted-foreground">Cantidad {item.quantity}{item.sku ? ` · ${item.sku}` : ''}</p></div>
                        </div>
                        <p className="shrink-0 font-semibold">{money(Number(item.total), order.currency)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">{order.payment ? `Pago: ${order.payment.status}` : 'Pago pendiente'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tienda/${order.store.slug}`}><Button variant="outline" size="sm">Volver a la tienda</Button></Link>
                      {order.status === 'PENDING' && (
                        <Button variant="ghost" size="sm" className="text-red-600" disabled={cancel.isPending} onClick={() => {
                          if (confirm('¿Cancelar este pedido pendiente?')) cancel.mutate(order.id);
                        }}>Cancelar pedido</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

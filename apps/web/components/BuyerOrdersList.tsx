'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, PackageCheck, Truck, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type BuyerOrder = {
  id: string;
  status: OrderStatus;
  currency: string;
  total: string | number;
  shippingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  store: { id: string; slug: string; name: string; logoUrl?: string | null; primaryColor?: string | null };
  payment?: { status: string; provider: string; paidAt?: string | null } | null;
  items: Array<{
    id: string;
    title: string;
    sku?: string | null;
    quantity: number;
    unitPrice: string | number;
    total: string | number;
  }>;
};

const label: Record<OrderStatus, string> = {
  PENDING: 'Pendiente de pago',
  PAID: 'Pagado',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

function statusIcon(status: OrderStatus) {
  if (status === 'PAID') return CheckCircle2;
  if (status === 'SHIPPED') return Truck;
  if (status === 'DELIVERED') return PackageCheck;
  if (status === 'CANCELLED') return XCircle;
  return Clock3;
}

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
        <p className="mt-1 text-muted-foreground">Consulta el estado de tus compras y vuelve a visitar cada tienda.</p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : query.error ? (
        <p className="text-sm text-red-600">{String(query.error)}</p>
      ) : !orders.length ? (
        <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><PackageCheck className="size-10 text-muted-foreground" /><div><p className="font-bold">Todavía no tienes pedidos</p><p className="text-sm text-muted-foreground">Cuando compres, podrás seguirlos desde aquí.</p></div><Link href="/productos"><Button>Explorar productos</Button></Link></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const Icon = statusIcon(order.status);
            const accent = order.store.primaryColor || '#18181b';
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: accent }} />
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                        {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-black">{order.store.name.slice(0,1)}</span>}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <Badge><Icon className="mr-1 size-3.5" />{label[order.status]}</Badge>
                        </div>
                        <Link href={`/tienda/${order.store.slug}`} className="mt-1 inline-block font-semibold hover:underline">{order.store.name}</Link>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</p>
                      </div>
                    </div>
                    <div className="text-left lg:text-right"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-black">{money(Number(order.total), order.currency)}</p></div>
                  </div>

                  <div className="mt-5 divide-y rounded-xl border">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 p-3">
                        <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">Cantidad {item.quantity}{item.sku ? ` · ${item.sku}` : ''}</p></div>
                        <p className="font-semibold">{money(Number(item.total), order.currency)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{order.payment ? `Pago: ${order.payment.status}` : 'Pago pendiente'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tienda/${order.store.slug}`}><Button variant="outline" size="sm">Ver tienda</Button></Link>
                      {order.status === 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          disabled={cancel.isPending}
                          onClick={() => {
                            if (confirm('¿Cancelar este pedido pendiente?')) cancel.mutate(order.id);
                          }}
                        >
                          Cancelar pedido
                        </Button>
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

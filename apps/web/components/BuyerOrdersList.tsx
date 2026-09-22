'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

function addressText(address?: Record<string, unknown> | null) {
  if (!address) return 'Sin dirección registrada';
  const preferred = ['address', 'street', 'number', 'city', 'department', 'state', 'postalCode', 'zip', 'country'];
  const values = preferred
    .map((key) => address[key])
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String);
  return values.join(', ') || 'Sin dirección registrada';
}

export function BuyerOrdersList() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  const query = useQuery({ queryKey: ['buyer-orders'], queryFn: () => authApi<BuyerOrder[]>('/orders/mine') });
  const cancel = useMutation({
    mutationFn: (id: string) => authApi('/orders/' + id + '/cancel', { method: 'PATCH' }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo cancelar el pedido'),
  });

  const orders = query.data ?? [];
  const visible = useMemo(() => orders.filter((order) => filter === 'ALL' || order.status === filter), [filter, orders]);
  const counters = useMemo(() => ({
    active: orders.filter((order) => ['PENDING', 'PAID', 'SHIPPED'].includes(order.status)).length,
    shipped: orders.filter((order) => order.status === 'SHIPPED').length,
    delivered: orders.filter((order) => order.status === 'DELIVERED').length,
  }), [orders]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Compras</p>
        <h1 className="text-3xl font-black tracking-tight">Mis pedidos</h1>
        <p className="mt-1 text-muted-foreground">Sigue cada compra con la identidad y el estado real de la tienda donde compraste.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['En proceso', counters.active, Clock3],
          ['En camino', counters.shipped, Truck],
          ['Entregados', counters.delivered, PackageCheck],
        ].map(([title, value, Icon]: any) => (
          <Card key={title}><CardContent className="flex items-center gap-3 pt-5"><div className="grid size-10 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p><p className="text-2xl font-black">{value}</p></div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const).map((value) => (
              <Button key={value} size="sm" variant={filter === value ? 'default' : 'outline'} onClick={() => setFilter(value)}>
                {value === 'ALL' ? 'Todos' : label[value]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {query.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando pedidos…</div>
          : query.error ? <div className="p-8 text-sm text-red-600">{String(query.error)}</div>
          : !visible.length ? (
            <div className="grid place-items-center gap-3 p-12 text-center">
              <PackageCheck className="size-10 text-muted-foreground" />
              <div><p className="font-bold">No hay pedidos en este estado</p><p className="text-sm text-muted-foreground">Tus compras aparecerán aquí a medida que avancen.</p></div>
              {!orders.length && <Link href="/productos"><Button>Explorar productos</Button></Link>}
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((order) => {
                const accent = order.store.primaryColor || '#18181b';
                const isOpen = expanded === order.id;
                return (
                  <div key={order.id} className="overflow-hidden">
                    <div className="relative h-28" style={{ backgroundColor: accent }}>
                      {order.store.coverUrl && <img src={order.store.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 text-white">
                        <div className="flex min-w-0 items-end gap-3">
                          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-zinc-900">
                            {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-black">{order.store.name.slice(0, 1)}</span>}
                          </div>
                          <div className="min-w-0"><Link href={'/tienda/' + order.store.slug} className="truncate text-lg font-black hover:underline">{order.store.name}</Link><p className="text-xs text-white/80">Pedido #{order.id.slice(0, 8).toUpperCase()}</p></div>
                        </div>
                        <p className="shrink-0 text-xl font-black">{money(Number(order.total), order.currency)}</p>
                      </div>
                    </div>

                    <div className="space-y-5 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><Badge>{label[order.status]}</Badge><p className="mt-2 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</p></div>
                        <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : order.id)}>{isOpen ? 'Ocultar detalle' : 'Ver detalle'}</Button>
                      </div>

                      <OrderStatusTimeline status={order.status} accentColor={accent} />

                      <div className="divide-y rounded-xl border">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4 p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                                {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="size-5 text-muted-foreground" />}
                              </div>
                              <div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="text-xs text-muted-foreground">Cantidad {item.quantity}{item.sku ? ' · ' + item.sku : ''}</p></div>
                            </div>
                            <p className="shrink-0 font-semibold">{money(Number(item.total), order.currency)}</p>
                          </div>
                        ))}
                      </div>

                      {isOpen && (
                        <div className="grid gap-4 rounded-xl bg-muted/40 p-4 text-sm md:grid-cols-2">
                          <div><p className="font-bold">Entrega</p><p className="mt-1 text-muted-foreground">{addressText(order.shippingAddress)}</p>{order.notes && <p className="mt-2 text-muted-foreground">Nota: {order.notes}</p>}</div>
                          <div><p className="font-bold">Pago</p><p className="mt-1 text-muted-foreground">{order.payment ? order.payment.provider + ' · ' + order.payment.status : 'Pago pendiente'}</p><p className="mt-2 font-semibold">Subtotal {money(Number(order.subtotal), order.currency)}</p></div>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                        <Link href={'/tienda/' + order.store.slug}><Button variant="outline" size="sm">Volver a la tienda</Button></Link>
                        {order.status === 'PENDING' && (
                          <Button variant="ghost" size="sm" className="text-red-600" disabled={cancel.isPending} onClick={() => {
                            if (confirm('¿Cancelar este pedido pendiente?')) cancel.mutate(order.id);
                          }}>Cancelar pedido</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

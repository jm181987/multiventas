'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Clock3, PackageCheck, Store, Truck, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type BuyerOrder = {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotal: string | number;
  shippingAmount?: string | number;
  discountAmount?: string | number;
  total: string | number;
  shippingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  store: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    primaryColor?: string | null;
  };
  payment?: { status: string; provider: string; paidAt?: string | null } | null;
  items: Array<{
    id: string;
    productId?: string | null;
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

function statusIcon(status: OrderStatus) {
  if (status === 'PAID') return CheckCircle2;
  if (status === 'SHIPPED') return Truck;
  if (status === 'DELIVERED') return PackageCheck;
  if (status === 'CANCELLED') return XCircle;
  return Clock3;
}

function statusClass(status: OrderStatus) {
  if (status === 'PAID') return 'bg-blue-100 text-blue-800';
  if (status === 'SHIPPED') return 'bg-amber-100 text-amber-800';
  if (status === 'DELIVERED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700';
  return 'bg-zinc-100 text-zinc-700';
}

function addressText(address?: Record<string, unknown> | null) {
  if (!address) return 'Sin dirección registrada';
  const preferred = ['address', 'street', 'number', 'city', 'state', 'department', 'postalCode', 'zip', 'country'];
  const values = preferred
    .map((key) => address[key])
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String);
  if (values.length) return values.join(', ');
  return Object.values(address)
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String)
    .join(', ') || 'Sin dirección registrada';
}

export function BuyerOrdersList() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['buyer-orders'], queryFn: () => authApi<BuyerOrder[]>('/orders/mine') });
  const cancel = useMutation({
    mutationFn: (id: string) => authApi(`/orders/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buyer-orders'] }),
  });

  const orders = query.data ?? [];
  const filtered = useMemo(() => orders.filter((order) => filter === 'ALL' || order.status === filter), [filter, orders]);

  const counters = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    paid: orders.filter((o) => o.status === 'PAID').length,
    active: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
  }), [orders]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Compras</p>
        <h1 className="text-3xl font-black tracking-tight">Mis pedidos</h1>
        <p className="mt-1 text-muted-foreground">Consulta pagos, entrega y detalle de cada compra sin perder la identidad de la tienda.</p>
      </div>

      {!!orders.length && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Todos', counters.all, 'ALL'],
            ['Pendientes', counters.pending, 'PENDING'],
            ['Pagados', counters.paid, 'PAID'],
            ['En camino', counters.active, 'SHIPPED'],
            ['Entregados', counters.delivered, 'DELIVERED'],
          ].map(([text, value, status]) => (
            <button
              key={String(status)}
              type="button"
              onClick={() => setFilter(status as typeof filter)}
              className={`rounded-xl border p-4 text-left transition hover:bg-muted/50 ${filter === status ? 'border-zinc-900 bg-muted/50' : 'bg-white'}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{text}</p>
              <p className="mt-1 text-2xl font-black">{value}</p>
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pedidos…</p>
      ) : query.error ? (
        <p className="text-sm text-red-600">{String(query.error)}</p>
      ) : !orders.length ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-12 text-center">
            <PackageCheck className="size-10 text-muted-foreground" />
            <div>
              <p className="font-bold">Todavía no tienes pedidos</p>
              <p className="text-sm text-muted-foreground">Cuando compres, podrás seguirlos desde aquí.</p>
            </div>
            <Link href="/productos"><Button>Explorar productos</Button></Link>
          </CardContent>
        </Card>
      ) : !filtered.length ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No hay pedidos con este estado.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const Icon = statusIcon(order.status);
            const accent = order.store.primaryColor || '#18181b';
            const isOpen = expanded === order.id;
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: accent }} />
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
                          {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="size-6" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <Badge className={statusClass(order.status)}><Icon className="mr-1 size-3.5" />{label[order.status]}</Badge>
                          </div>
                          <Link href={`/tienda/${order.store.slug}`} className="mt-1 inline-block font-semibold hover:underline">{order.store.name}</Link>
                          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</p>
                        </div>
                      </div>
                      <div className="text-left lg:text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-black">{money(Number(order.total), order.currency)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        {order.payment ? `Pago: ${order.payment.provider} · ${order.payment.status}` : 'Pago pendiente'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/tienda/${order.store.slug}`}><Button variant="outline" size="sm">Ver tienda</Button></Link>
                        <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : order.id)}>
                          {isOpen ? 'Ocultar detalle' : 'Ver detalle'} <ChevronDown className={`ml-1 size-4 transition ${isOpen ? 'rotate-180' : ''}`} />
                        </Button>
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
                  </div>

                  {isOpen && (
                    <div className="grid gap-5 border-t bg-muted/30 p-5 lg:grid-cols-[1fr_300px]">
                      <div className="space-y-4">
                        <OrderStatusTimeline status={order.status} accentColor={accent} />
                        <h3 className="font-bold">Productos</h3>
                        <div className="divide-y rounded-xl border bg-white">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 p-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                                  {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <Store className="size-4 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0">
                                  {item.productId ? <Link href={`/productos/${item.productId}`} className="truncate font-medium hover:underline">{item.title}</Link> : <p className="truncate font-medium">{item.title}</p>}
                                  <p className="text-xs text-muted-foreground">Cantidad {item.quantity}{item.sku ? ` · ${item.sku}` : ''}</p>
                                </div>
                              </div>
                              <p className="shrink-0 font-semibold">{money(Number(item.total), order.currency)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 text-sm">
                        <div><p className="font-bold">Entrega</p><p className="text-muted-foreground">{addressText(order.shippingAddress)}</p></div>
                        <div><p className="font-bold">Pago</p><p className="text-muted-foreground">{order.payment ? `${order.payment.provider} · ${order.payment.status}` : 'Pendiente'}</p></div>
                        {order.notes && <div><p className="font-bold">Notas</p><p className="text-muted-foreground">{order.notes}</p></div>}
                        <div className="border-t pt-3">
                          <div className="flex justify-between"><span>Subtotal</span><span>{money(Number(order.subtotal), order.currency)}</span></div>
                          <div className="mt-1 flex justify-between font-black"><span>Total</span><span>{money(Number(order.total), order.currency)}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

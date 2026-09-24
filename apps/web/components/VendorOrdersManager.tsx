'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ExternalLink, PackageCheck, Search, Store, Truck, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { contrastText, money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { ConversationUnreadBadge, OrderConversation } from '@/components/OrderConversation';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type VendorOrder = {
  id: string;
  status: OrderStatus;
  currency: string;
  subtotal: string | number;
  shippingAmount: string | number;
  discountAmount: string | number;
  couponCode?: string | null;
  total: string | number;
  shippingAddress?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  buyer: { id: string; name: string; email: string; phone?: string | null; avatarUrl?: string | null };
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
    deliveryMethod?: 'SHIPPING_PAID' | 'SHIPPING_FREE' | 'PICKUP' | 'DIGITAL' | null;
    deliveryAmount?: string | number;
    deliveryDetails?: string | null;
    product?: { id: string; slug: string; images?: Array<{ url: string }> } | null;
  }>;
};

const labels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

function deliveryLabel(method?: string | null) {
  if (method === 'SHIPPING_PAID') return 'Envío pago';
  if (method === 'SHIPPING_FREE') return 'Envío gratis';
  if (method === 'PICKUP') return 'Retiro en local';
  if (method === 'DIGITAL') return 'Entrega digital';
  return 'Entrega a coordinar';
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
  const parts = preferred
    .map((key) => address[key])
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .map(String);
  if (parts.length) return parts.join(', ');
  return Object.values(address).filter((value) => typeof value === 'string' || typeof value === 'number').map(String).join(', ') || 'Sin dirección registrada';
}

function nextAction(order: VendorOrder): { status: OrderStatus; label: string; icon: any } | null {
  const methods = order.items.map((item) => item.deliveryMethod).filter(Boolean);
  const onlyPickup = methods.length > 0 && methods.every((method) => method === 'PICKUP');
  const onlyDigital = methods.length > 0 && methods.every((method) => method === 'DIGITAL');

  if (order.status === 'PAID') {
    if (onlyPickup) return { status: 'SHIPPED', label: 'Marcar listo para retiro', icon: PackageCheck };
    if (onlyDigital) return { status: 'SHIPPED', label: 'Marcar entrega enviada', icon: PackageCheck };
    return { status: 'SHIPPED', label: 'Marcar enviado', icon: Truck };
  }
  if (order.status === 'SHIPPED') {
    if (onlyPickup) return { status: 'DELIVERED', label: 'Marcar retirado', icon: PackageCheck };
    return { status: 'DELIVERED', label: 'Marcar entregado', icon: PackageCheck };
  }
  if (order.status === 'PENDING') return { status: 'CANCELLED', label: 'Cancelar pedido', icon: XCircle };
  return null;
}

export function VendorOrdersManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const query = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => authApi<VendorOrder[]>('/vendor/orders'),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      authApi(`/vendor/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => { setActionError(''); qc.invalidateQueries({ queryKey: ['vendor-orders'] }); },
    onError: (e) => setActionError(e instanceof Error ? e.message : 'No se pudo actualizar el pedido'),
  });

  const orders = query.data ?? [];
  const stores = useMemo(() => {
    const map = new Map<string, VendorOrder['store']>();
    for (const order of orders) map.set(order.store.id, order.store);
    return Array.from(map.values());
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !q
        || order.id.toLowerCase().includes(q)
        || order.buyer.name.toLowerCase().includes(q)
        || order.buyer.email.toLowerCase().includes(q)
        || order.store.name.toLowerCase().includes(q)
        || order.items.some((item) => item.title.toLowerCase().includes(q));
      const matchesStatus = filter === 'ALL' || order.status === filter;
      const matchesStore = storeFilter === 'ALL' || order.store.id === storeFilter;
      return matchesText && matchesStatus && matchesStore;
    });
  }, [filter, orders, search, storeFilter]);

  const counters = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'PENDING').length,
    paid: orders.filter((o) => o.status === 'PAID').length,
    shipped: orders.filter((o) => o.status === 'SHIPPED').length,
    delivered: orders.filter((o) => o.status === 'DELIVERED').length,
  }), [orders]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ventas</p>
        <h1 className="text-3xl font-black tracking-tight">Pedidos</h1>
        <p className="mt-1 text-muted-foreground">Gestiona las ventas de todas tus tiendas y sigue cada pedido hasta la entrega.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ['Pendientes', counters.pending, Clock3],
          ['Pagados', counters.paid, CheckCircle2],
          ['En camino', counters.shipped, Truck],
          ['Entregados', counters.delivered, PackageCheck],
        ] as const).map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="grid size-10 place-items-center rounded-lg bg-muted"><Icon className="size-5" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-2xl font-black">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {actionError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

      <Card>
        <CardHeader className="border-b">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, pedido, tienda o producto…" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="ALL">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="PAID">Pagados</option>
              <option value="SHIPPED">Enviados</option>
              <option value="DELIVERED">Entregados</option>
              <option value="CANCELLED">Cancelados</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
              <option value="ALL">Todas las tiendas</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Cargando pedidos…</div>
          ) : query.error ? (
            <div className="p-8 text-sm text-red-600">{String(query.error)}</div>
          ) : !filtered.length ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No hay pedidos para mostrar.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((order) => {
                const action = nextAction(order);
                const Icon = action?.icon;
                const isOpen = expanded === order.id;
                const accent = order.store.primaryColor || '#18181b';

                return (
                  <div key={order.id} className="relative p-4 sm:p-5">
                    <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <button type="button" className="min-w-0 text-left" onClick={() => setExpanded(isOpen ? null : order.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <Badge className={statusClass(order.status)}>{labels[order.status]}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                            {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store className="size-4" />}
                          </div>
                          <div>
                            <p className="font-semibold">{order.buyer.name}</p>
                            <p className="text-sm text-muted-foreground">{order.store.name} · {order.items.length} artículo{order.items.length === 1 ? '' : 's'} · {money(Number(order.total), order.currency)}</p>
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/tienda/${order.store.slug}`} target="_blank">
                          <Button variant="outline" size="sm"><ExternalLink className="mr-1 size-4" /> Ver tienda</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : order.id)}>
                          {isOpen ? 'Ocultar' : 'Ver detalle'} <ConversationUnreadBadge orderId={order.id} />
                        </Button>
                        {action && (
                          <Button
                            size="sm"
                            variant={action.status === 'CANCELLED' ? 'outline' : 'default'}
                            className={action.status === 'CANCELLED' ? 'text-red-600' : ''}
                            style={action.status === 'CANCELLED' ? undefined : { backgroundColor: accent, color: contrastText(accent) }}
                            disabled={update.isPending}
                            onClick={() => {
                              if (action.status === 'CANCELLED' && !confirm('¿Cancelar este pedido? El stock reservado será devuelto.')) return;
                              update.mutate({ id: order.id, status: action.status });
                            }}
                          >
                            {Icon && <Icon className="mr-1 size-4" />}{action.label}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-5 grid gap-5 rounded-xl bg-muted/40 p-4 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-4">
                          <OrderStatusTimeline status={order.status} accentColor={accent} />
                          <h3 className="font-bold">Productos</h3>
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg bg-white p-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                                  {item.product?.images?.[0]?.url ? <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" /> : <Store className="size-4 text-muted-foreground" />}
                                </div>
                                <div className="min-w-0">
                                  {item.productId ? (
                                    <Link href={`/productos/${item.productId}`} target="_blank" className="truncate font-medium hover:underline">{item.title}</Link>
                                  ) : <p className="truncate font-medium">{item.title}</p>}
                                  <p className="text-xs text-muted-foreground">{item.sku || 'Sin SKU'} · Cantidad {item.quantity}</p>
                                  <p className="mt-1 text-xs font-semibold text-indigo-700">
                                    {deliveryLabel(item.deliveryMethod)}
                                    {Number(item.deliveryAmount ?? 0) > 0 ? ` · ${money(Number(item.deliveryAmount), order.currency)}` : ''}
                                  </p>
                                  {item.deliveryDetails && <p className="mt-0.5 text-xs text-muted-foreground">{item.deliveryDetails}</p>}
                                </div>
                              </div>
                              <p className="shrink-0 font-bold">{money(Number(item.total), order.currency)}</p>
                            </div>
                          ))}
                          <div className="space-y-1 border-t pt-3 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span>{money(Number(order.subtotal), order.currency)}</span></div>
                            {Number(order.shippingAmount ?? 0) > 0 && (
                              <div className="flex justify-between"><span>Entrega</span><span>{money(Number(order.shippingAmount), order.currency)}</span></div>
                            )}
                            {Number(order.discountAmount ?? 0) > 0 && (
                              <div className="flex justify-between text-emerald-700">
                                <span>Descuento{order.couponCode ? ` · ${order.couponCode}` : ''}</span>
                                <span>-{money(Number(order.discountAmount), order.currency)}</span>
                              </div>
                            )}
                            <div className="mt-2 flex justify-between border-t pt-2 text-lg font-black"><span>Total</span><span>{money(Number(order.total), order.currency)}</span></div>
                          </div>
                          <OrderConversation orderId={order.id} />
                        </div>

                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="font-bold">Tienda</p>
                            <Link href={`/tienda/${order.store.slug}`} target="_blank" className="text-muted-foreground hover:underline">{order.store.name}</Link>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                              {order.buyer.avatarUrl ? <img src={order.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="font-bold">{order.buyer.name.slice(0,1)}</span>}
                            </div>
                            <div className="min-w-0"><p className="font-bold">{order.buyer.name}</p><p className="truncate text-muted-foreground">{order.buyer.email}</p>{order.buyer.phone && <p className="text-muted-foreground">{order.buyer.phone}</p>}</div>
                          </div>
                          <div>
                            <p className="font-bold">Entrega</p>
                            <p className="text-muted-foreground">{order.shippingAddress ? addressText(order.shippingAddress) : 'Según la modalidad elegida por producto'}</p>
                          </div>
                          <div><p className="font-bold">Pago</p><p className="text-muted-foreground">{order.payment ? `${order.payment.provider} · ${order.payment.status}` : 'Pago pendiente'}</p></div>
                          {order.notes && <div><p className="font-bold">Notas</p><p className="text-muted-foreground">{order.notes}</p></div>}
                        </div>
                      </div>
                    )}
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

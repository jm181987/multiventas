'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, PackageCheck, Search, Truck, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

type VendorOrder = {
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
  buyer: { id: string; name: string; email: string; phone?: string | null };
  store: { id: string; slug: string; name: string };
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

const labels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

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
  if (order.status === 'PAID') return { status: 'SHIPPED', label: 'Marcar enviado', icon: Truck };
  if (order.status === 'SHIPPED') return { status: 'DELIVERED', label: 'Marcar entregado', icon: PackageCheck };
  if (order.status === 'PENDING') return { status: 'CANCELLED', label: 'Cancelar pedido', icon: XCircle };
  return null;
}

export function VendorOrdersManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: () => authApi<VendorOrder[]>('/vendor/orders'),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      authApi(`/vendor/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-orders'] }),
  });

  const orders = query.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesText = !q
        || order.id.toLowerCase().includes(q)
        || order.buyer.name.toLowerCase().includes(q)
        || order.buyer.email.toLowerCase().includes(q)
        || order.store.name.toLowerCase().includes(q)
        || order.items.some((item) => item.title.toLowerCase().includes(q));
      return matchesText && (filter === 'ALL' || order.status === filter);
    });
  }, [filter, orders, search]);

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
        <p className="mt-1 text-muted-foreground">Gestiona cada venta desde el pago hasta la entrega.</p>
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

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
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
                return (
                  <div key={order.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <button type="button" className="min-w-0 text-left" onClick={() => setExpanded(isOpen ? null : order.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black">#{order.id.slice(0, 8).toUpperCase()}</span>
                          <Badge className={statusClass(order.status)}>{labels[order.status]}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('es-UY')}</span>
                        </div>
                        <p className="mt-1 font-semibold">{order.buyer.name} · {order.store.name}</p>
                        <p className="text-sm text-muted-foreground">{order.items.length} artículo{order.items.length === 1 ? '' : 's'} · {money(Number(order.total), order.currency)}</p>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : order.id)}>{isOpen ? 'Ocultar' : 'Ver detalle'}</Button>
                        {action && (
                          <Button
                            size="sm"
                            variant={action.status === 'CANCELLED' ? 'outline' : 'default'}
                            className={action.status === 'CANCELLED' ? 'text-red-600' : ''}
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
                        <div className="space-y-3">
                          <h3 className="font-bold">Productos</h3>
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg bg-white p-3">
                              <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.sku || 'Sin SKU'} · Cantidad {item.quantity}</p></div>
                              <p className="font-bold">{money(Number(item.total), order.currency)}</p>
                            </div>
                          ))}
                          <div className="flex justify-between border-t pt-3 text-lg font-black"><span>Total</span><span>{money(Number(order.total), order.currency)}</span></div>
                        </div>

                        <div className="space-y-4 text-sm">
                          <div><p className="font-bold">Cliente</p><p>{order.buyer.name}</p><p className="text-muted-foreground">{order.buyer.email}</p>{order.buyer.phone && <p className="text-muted-foreground">{order.buyer.phone}</p>}</div>
                          <div><p className="font-bold">Entrega</p><p className="text-muted-foreground">{addressText(order.shippingAddress)}</p></div>
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

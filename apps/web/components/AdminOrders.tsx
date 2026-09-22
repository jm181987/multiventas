'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingBag } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AdminOrder = {
  id: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total: string | number;
  currency: string;
  createdAt: string;
  store: { id: string; slug: string; name: string; logoUrl?: string | null; primaryColor?: string | null };
  buyer: { id: string; name: string; email: string };
  payment?: { status: string; provider: string } | null;
  items: Array<{ id: string; title: string; quantity: number; total: string | number }>;
};

export function AdminOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | AdminOrder['status']>('ALL');
  const query = useQuery({ queryKey: ['admin-orders'], queryFn: () => authApi<AdminOrder[]>('/admin/orders') });
  const orders = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matches = !q
        || order.id.toLowerCase().includes(q)
        || order.store.name.toLowerCase().includes(q)
        || order.buyer.name.toLowerCase().includes(q)
        || order.buyer.email.toLowerCase().includes(q)
        || order.items.some((item) => item.title.toLowerCase().includes(q));
      return matches && (status === 'ALL' || order.status === status);
    });
  }, [orders, search, status]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Operaciones</p>
        <h1 className="text-3xl font-black tracking-tight">Pedidos del marketplace</h1>
        <p className="mt-1 text-muted-foreground">Supervisa pedidos de todas las tiendas, compradores y estados de pago.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido, cliente, tienda o producto…" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
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
          {query.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando pedidos…</div>
          : query.error ? <div className="p-8 text-sm text-red-600">{String(query.error)}</div>
          : !filtered.length ? <div className="p-12 text-center text-sm text-muted-foreground">No hay pedidos para estos filtros.</div>
          : <div className="divide-y">
              {filtered.map((order) => {
                const accent = order.store.primaryColor || '#18181b';
                return (
                  <div key={order.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border text-white" style={{ backgroundColor: accent }}>
                        {order.store.logoUrl ? <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <Badge>{order.status}</Badge>
                          {order.payment && <Badge>{order.payment.status}</Badge>}
                        </div>
                        <Link href={'/tienda/' + order.store.slug} className="mt-1 block truncate font-semibold hover:underline">{order.store.name}</Link>
                        <p className="text-sm text-muted-foreground">{order.buyer.name} · {order.buyer.email}</p>
                        <p className="text-xs text-muted-foreground">{order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades · {new Date(order.createdAt).toLocaleString('es-UY')}</p>
                      </div>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-black">{money(Number(order.total), order.currency)}</p>
                    </div>
                  </div>
                );
              })}
            </div>}
        </CardContent>
      </Card>
    </div>
  );
}

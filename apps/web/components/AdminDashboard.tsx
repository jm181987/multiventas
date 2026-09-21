'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Boxes, CircleDollarSign, Clock3, ShoppingBag, Store, Users } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type DashboardData = {
  users: number;
  vendors: number;
  pendingVendors: number;
  approvedVendors: number;
  stores: number;
  products: number;
  orders: number;
  pendingOrders: number;
  grossSales: string | number;
  platformCommissions: string | number;
  recentVendors: Array<{
    id: string;
    businessName: string;
    status: string;
    createdAt: string;
    user: { name: string; email: string };
    stores: Array<{ id: string; name: string; status: string }>;
  }>;
};

export function AdminDashboard() {
  const query = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => authApi<DashboardData>('/admin/dashboard') });

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Cargando administración…</p>;
  if (query.error || !query.data) return <p className="text-sm text-red-600">{String(query.error ?? 'No se pudo cargar el panel')}</p>;

  const d = query.data;

  const stats = [
    ['Usuarios', d.users, Users],
    ['Vendedores', d.vendors, Store],
    ['Pendientes', d.pendingVendors, Clock3],
    ['Tiendas', d.stores, BadgeCheck],
    ['Productos', d.products, Boxes],
    ['Pedidos', d.orders, ShoppingBag],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Marketplace</p>
          <h1 className="text-3xl font-black tracking-tight">Panel administrativo</h1>
          <p className="mt-1 text-muted-foreground">Control general de cuentas, tiendas, ventas y comisiones.</p>
        </div>
        <Link href="/admin/vendedores"><Button>{d.pendingVendors ? `Revisar ${d.pendingVendors} pendientes` : 'Ver vendedores'}</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value, Icon]) => (
          <Card key={label}><CardContent className="flex items-center gap-4 pt-5"><div className="grid size-11 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-3xl font-black">{value}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-lg font-bold">Actividad económica</h2></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="size-4" /> Ventas brutas</div><p className="mt-2 text-2xl font-black">{money(Number(d.grossSales))}</p></div>
            <div className="rounded-xl bg-muted/50 p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="size-4" /> Comisiones</div><p className="mt-2 text-2xl font-black">{money(Number(d.platformCommissions))}</p></div>
            <div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Pedidos pendientes</p><p className="mt-2 text-2xl font-black">{d.pendingOrders}</p></div>
            <div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Vendedores aprobados</p><p className="mt-2 text-2xl font-black">{d.approvedVendors}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><h2 className="text-lg font-bold">Vendedores recientes</h2><Link href="/admin/vendedores" className="text-sm font-semibold underline">Ver todos</Link></CardHeader>
          <CardContent className="space-y-3">
            {d.recentVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between gap-4 rounded-xl border p-3">
                <div className="min-w-0"><p className="truncate font-semibold">{vendor.businessName}</p><p className="truncate text-sm text-muted-foreground">{vendor.user.email}</p></div>
                <Badge>{vendor.status}</Badge>
              </div>
            ))}
            {!d.recentVendors.length && <p className="text-sm text-muted-foreground">Sin vendedores todavía.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BadgeDollarSign, Boxes, Building2, ShoppingCart, Store, Users } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Dashboard = {
  users: number;
  vendors: number;
  pendingVendors: number;
  approvedVendors: number;
  stores: number;
  activeStores: number;
  products: number;
  activeProducts: number;
  orders: number;
  grossSales: string | number;
  platformCommissions: string | number;
  marketplaceHealth: { productsWithoutImages: number; productsWithoutCategory: number; outOfStockProducts: number; storesWithoutMercadoPago: number; stalePendingOrders: number; totalIssues: number };
  commercialOpportunities: Array<{ id: string; title: string; storeName: string; stock: number; views: number; cartAdds: number; favoriteAdds: number; orders: number; soldUnits: number; conversionRate: number }>;
  recentVendors: Array<{
    id: string;
    businessName: string;
    status: string;
    kycStatus: string;
    createdAt: string;
    user: { id: string; email: string; name: string; avatarUrl?: string | null };
    stores: Array<{ id: string; name: string; slug: string; status: string }>;
  }>;
};

export function AdminOverview() {
  const query = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => authApi<Dashboard>('/admin/dashboard') });
  const data = query.data;

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Cargando panel administrativo…</p>;
  if (query.error || !data) return <p className="text-sm text-red-600">{String(query.error ?? 'No se pudo cargar el panel')}</p>;

  const cards = [
    { label: 'Usuarios', value: data.users, detail: 'cuentas registradas', icon: Users },
    { label: 'Vendedores', value: data.vendors, detail: String(data.approvedVendors) + ' aprobados', icon: Building2 },
    { label: 'Tiendas', value: data.stores, detail: String(data.activeStores) + ' activas', icon: Store },
    { label: 'Productos', value: data.products, detail: String(data.activeProducts) + ' publicados', icon: Boxes },
    { label: 'Pedidos', value: data.orders, detail: 'pedidos totales', icon: ShoppingCart },
    { label: 'Comisiones', value: money(data.platformCommissions), detail: 'ventas ' + money(data.grossSales), icon: BadgeDollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Administración</p>
          <h1 className="text-3xl font-black tracking-tight">Resumen del marketplace</h1>
          <p className="mt-1 text-muted-foreground">Estado general, cuentas y actividad de Multiventas.</p>
        </div>
        {data.pendingVendors > 0 && (
          <Link href="/admin/vendedores">
            <Button><AlertCircle className="mr-2 size-4" /> {data.pendingVendors} pendientes</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="grid size-11 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div>
            <h2 className="text-xl font-bold">Salud del marketplace</h2>
            <p className="text-sm text-muted-foreground">Problemas operativos que pueden estar frenando ventas.</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Sin imágenes', data.marketplaceHealth.productsWithoutImages],
            ['Sin categoría', data.marketplaceHealth.productsWithoutCategory],
            ['Sin stock', data.marketplaceHealth.outOfStockProducts],
            ['Sin Mercado Pago', data.marketplaceHealth.storesWithoutMercadoPago],
            ['Pedidos +24 h', data.marketplaceHealth.stalePendingOrders],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border p-4">
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div>
            <h2 className="text-xl font-bold">Oportunidades de conversión</h2>
            <p className="text-sm text-muted-foreground">Productos con interés real en los últimos 30 días que todavía convierten poco.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.commercialOpportunities.map((product) => (
              <div key={product.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{product.title}</p>
                  <p className="text-sm text-muted-foreground">{product.storeName} · {product.stock} en stock</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge>{product.views} vistas</Badge>
                  <Badge>{product.cartAdds} carritos</Badge>
                  <Badge>{product.orders} ventas</Badge>
                  <Badge className={product.conversionRate < 1 ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}>
                    {product.conversionRate}% conversión
                  </Badge>
                </div>
              </div>
            ))}
            {!data.commercialOpportunities.length && (
              <p className="p-6 text-sm text-muted-foreground">No hay oportunidades críticas detectadas en los últimos 30 días.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div><h2 className="text-xl font-bold">Vendedores recientes</h2><p className="text-sm text-muted-foreground">Últimas solicitudes y cuentas creadas.</p></div>
          <Link href="/admin/vendedores" className="text-sm font-semibold underline">Ver todos</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.recentVendors.map((vendor) => (
              <div key={vendor.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center overflow-hidden rounded-full bg-muted">
                    {vendor.user.avatarUrl ? <img src={vendor.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : vendor.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{vendor.businessName}</p>
                    <p className="text-sm text-muted-foreground">{vendor.user.name} · {vendor.user.email}</p>
                  </div>
                </div>
                <Badge className={vendor.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : vendor.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : ''}>
                  {vendor.status}
                </Badge>
              </div>
            ))}
            {!data.recentVendors.length && <p className="p-6 text-sm text-muted-foreground">Todavía no hay vendedores.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

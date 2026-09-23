'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, BadgeDollarSign, BarChart3, Boxes, Check, CircleDollarSign, Clock3,
  PackageCheck, ShoppingBag, Sparkles, TrendingUp, TriangleAlert, WalletCards
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type DashboardData = {
  vendor: { status: string; kycStatus: string; businessName: string };
  onboarding: {
    steps: Array<{ key: string; title: string; description: string; complete: boolean; href: string }>;
    completeSteps: number; totalSteps: number; percent: number; complete: boolean;
  };
  metrics: {
    revenueTotal: number; revenueToday: number; revenueMonth: number;
    ordersToday: number; ordersMonth: number; averageTicketMonth: number;
    pendingFulfillment: number; products: number; activeProducts: number;
    lowStock: number; outOfStock: number; commissionMonth: number;
  };
  salesChart: Array<{ date: string; total: number }>;
  topProducts: Array<{ productId: string | null; title: string; quantity: number; revenue: number }>;
  recentOrders: Array<{
    id: string; status: string; total: number; currency: string; createdAt: string;
    store: { name: string }; buyer: { name: string };
  }>;
};

const statusLabel: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagado', SHIPPED: 'Enviado',
  DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

export function VendorDashboard() {
  const query = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: () => authApi<DashboardData>('/vendor/dashboard'),
  });

  if (query.isLoading) {
    return <div className="rounded-2xl border bg-white p-8 text-sm text-muted-foreground">Preparando tu dashboard…</div>;
  }
  if (query.error || !query.data) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">No se pudo cargar el resumen comercial.</div>;
  }

  const data = query.data;
  const maxChart = Math.max(...data.salesChart.map((point) => point.total), 1);
  const metricCards = [
    ['Ventas del mes', money(data.metrics.revenueMonth, 'UYU'), data.metrics.ordersMonth + ' pedidos', CircleDollarSign, 'text-indigo-600 bg-indigo-50'],
    ['Ventas de hoy', money(data.metrics.revenueToday, 'UYU'), data.metrics.ordersToday + ' pedidos', TrendingUp, 'text-cyan-600 bg-cyan-50'],
    ['Ticket promedio', money(data.metrics.averageTicketMonth, 'UYU'), 'Este mes', BadgeDollarSign, 'text-violet-600 bg-violet-50'],
    ['Por preparar', String(data.metrics.pendingFulfillment), 'Pedidos pagados', PackageCheck, 'text-emerald-600 bg-emerald-50'],
  ] as const;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#6366F1]">Mi negocio</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Hola, {data.vendor.businessName}</h1>
          <p className="mt-1 text-muted-foreground">Ventas, pedidos y próximos pasos en un solo lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendor/analitica"><Button variant="outline"><BarChart3 className="mr-2 size-4" /> Analítica</Button></Link>
          <Link href="/vendor/productos"><Button variant="outline"><Boxes className="mr-2 size-4" /> Productos</Button></Link>
          <Link href="/vendor/promociones">
            <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110">
              <Sparkles className="mr-2 size-4" /> Crear promoción
            </Button>
          </Link>
        </div>
      </div>

      {!data.onboarding.complete && (
        <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50/50">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[280px_1fr] lg:p-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
                <Sparkles className="size-3.5" /> Puesta en marcha
              </div>
              <h2 className="mt-4 text-2xl font-black">Prepará tu tienda para vender</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Completá estos pasos y dejá tu operación lista para recibir ventas.</p>
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{data.onboarding.completeSteps} de {data.onboarding.totalSteps} completos</span>
                  <span className="text-indigo-600">{data.onboarding.percent}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#22D3EE]" style={{ width: data.onboarding.percent + '%' }} />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              {data.onboarding.steps.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={'group flex items-start gap-3 rounded-xl border p-3.5 transition ' + (
                    item.complete
                      ? 'border-emerald-100 bg-emerald-50/60'
                      : 'border-white bg-white/90 hover:border-indigo-200 hover:shadow-sm'
                  )}
                >
                  <span className={'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ' + (item.complete ? 'bg-[#10B981] text-white' : 'bg-slate-100 text-slate-500')}>
                    {item.complete ? <Check className="size-4" /> : <span className="size-2 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                  {!item.complete && <ArrowRight className="mt-1 size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, value, detail, Icon, accent]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
                <span className={'grid size-10 place-items-center rounded-xl ' + accent}><Icon className="size-5" /></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="text-xl font-black">Ventas · últimos 14 días</h2><p className="text-sm text-muted-foreground">Ingresos de pedidos confirmados.</p></div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Histórico</p>
                <p className="font-black">{money(data.metrics.revenueTotal, 'UYU')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex h-56 items-end gap-2">
              {data.salesChart.map((point) => {
                const height = point.total ? Math.max(7, (point.total / maxChart) * 100) : 3;
                return (
                  <div key={point.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                    <div className="relative flex flex-1 items-end">
                      <div className="w-full rounded-t-md bg-gradient-to-t from-[#6366F1] to-[#22D3EE] opacity-85 group-hover:opacity-100" style={{ height: height + '%' }} />
                      {point.total > 0 && <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950 px-2 py-1 text-[10px] text-white group-hover:block">{money(point.total, 'UYU')}</span>}
                    </div>
                    <span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{new Date(point.date + 'T12:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b"><h2 className="text-xl font-black">Inventario</h2><p className="text-sm text-muted-foreground">Productos que requieren atención.</p></CardHeader>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3"><Boxes className="size-5 text-indigo-600" /><div><p className="font-bold">Activos</p><p className="text-xs text-muted-foreground">de {data.metrics.products} productos</p></div></div>
              <span className="text-2xl font-black">{data.metrics.activeProducts}</span>
            </div>
            <Link href="/vendor/productos" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3"><TriangleAlert className="size-5 text-amber-600" /><div><p className="font-bold">Stock bajo</p><p className="text-xs text-amber-700">5 unidades o menos</p></div></div>
              <span className="text-xl font-black text-amber-700">{data.metrics.lowStock}</span>
            </Link>
            <Link href="/vendor/productos" className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-3"><ShoppingBag className="size-5 text-red-600" /><div><p className="font-bold">Sin stock</p><p className="text-xs text-red-700">No disponibles</p></div></div>
              <span className="text-xl font-black text-red-700">{data.metrics.outOfStock}</span>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b"><h2 className="text-xl font-black">Productos que más venden</h2><p className="text-sm text-muted-foreground">Ranking por unidades vendidas.</p></CardHeader>
          <CardContent className="pt-2">
            {!data.topProducts.length ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay ventas suficientes.</p> : (
              <div className="divide-y">{data.topProducts.map((product, index) => (
                <div key={(product.productId || product.title) + index} className="flex items-center gap-3 py-3.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-xs font-black">{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{product.title}</p><p className="text-xs text-muted-foreground">{product.quantity} unidades</p></div>
                  <p className="font-black">{money(product.revenue, 'UYU')}</p>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b"><h2 className="text-xl font-black">Pedidos recientes</h2><p className="text-sm text-muted-foreground">Últimos movimientos.</p></CardHeader>
          <CardContent className="pt-2">
            {!data.recentOrders.length ? <p className="py-8 text-center text-sm text-muted-foreground">Todavía no recibiste pedidos.</p> : (
              <div className="divide-y">{data.recentOrders.map((order) => (
                <Link key={order.id} href="/vendor/pedidos" className="flex items-center gap-3 py-3.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-slate-100">{order.status === 'PAID' ? <WalletCards className="size-4 text-emerald-600" /> : <Clock3 className="size-4 text-slate-500" />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{order.store.name} · {order.buyer.name}</p><p className="text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()} · {statusLabel[order.status] || order.status}</p></div>
                  <p className="font-black">{money(order.total, order.currency)}</p>
                </Link>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-indigo-100 bg-slate-950 text-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-[#22D3EE]">Comisiones del mes</p><p className="mt-1 text-3xl font-black">{money(data.metrics.commissionMonth, 'UYU')}</p><p className="mt-1 text-xs text-slate-400">Comisiones confirmadas sobre ventas cobradas.</p></div>
          <Link href="/vendor/promociones"><Button className="bg-white text-slate-950 hover:bg-slate-100"><Sparkles className="mr-2 size-4" /> Impulsar ventas</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}

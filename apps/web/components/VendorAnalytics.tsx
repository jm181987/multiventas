'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CircleDollarSign,
  Eye,
  Heart,
  PackageCheck,
  Percent,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type AnalyticsProduct = {
  productId: string;
  title: string;
  status: string;
  stock: number;
  storeName: string;
  imageUrl?: string | null;
  views: number;
  cartAdds: number;
  favoriteAdds: number;
  currentFavorites: number;
  orders: number;
  soldUnits: number;
  revenue: number;
  cartRate: number;
  favoriteRate: number;
  conversionRate: number;
};

type AnalyticsData = {
  days: number;
  from: string;
  to: string;
  summary: {
    views: number;
    cartAdds: number;
    favoriteAdds: number;
    currentFavorites: number;
    orders: number;
    soldUnits: number;
    revenue: number;
    cartRate: number;
    favoriteRate: number;
    conversionRate: number;
  };
  trend: Array<{
    date: string;
    views: number;
    cartAdds: number;
    favoriteAdds: number;
    orders: number;
    soldUnits: number;
    revenue: number;
  }>;
  products: AnalyticsProduct[];
};

type SortKey = 'views' | 'cartAdds' | 'favoriteAdds' | 'conversionRate' | 'revenue';

const sortLabels: Record<SortKey, string> = {
  views: 'Más vistos',
  cartAdds: 'Más agregados al carrito',
  favoriteAdds: 'Más guardados',
  conversionRate: 'Mejor conversión',
  revenue: 'Más ventas',
};

function pct(value: number) {
  return value.toLocaleString('es-UY', { maximumFractionDigits: 2 }) + '%';
}

export function VendorAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [sort, setSort] = useState<SortKey>('views');

  const query = useQuery({
    queryKey: ['vendor-analytics', days],
    queryFn: () => authApi<AnalyticsData>('/vendor/analytics?days=' + days),
  });

  const products = useMemo(() => {
    const rows = [...(query.data?.products ?? [])];
    return rows.sort((a, b) => {
      if (sort === 'conversionRate') {
        const aEligible = a.views >= 3 ? a.conversionRate : -1;
        const bEligible = b.views >= 3 ? b.conversionRate : -1;
        return bEligible - aEligible || b.revenue - a.revenue;
      }
      return b[sort] - a[sort] || b.revenue - a.revenue;
    });
  }, [query.data?.products, sort]);

  if (query.isLoading) {
    return <div className="rounded-2xl border bg-white p-8 text-sm text-muted-foreground">Preparando analítica comercial…</div>;
  }

  if (query.error || !query.data) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">No se pudo cargar la analítica comercial.</div>;
  }

  const data = query.data;
  const maxTrend = Math.max(...data.trend.map((point) => Math.max(point.views, point.cartAdds)), 1);
  const funnelMax = Math.max(data.summary.views, data.summary.cartAdds, data.summary.orders, 1);

  const metricCards = [
    ['Vistas', data.summary.views.toLocaleString('es-UY'), 'Fichas de producto vistas', Eye, 'bg-indigo-50 text-indigo-600'],
    ['Al carrito', data.summary.cartAdds.toLocaleString('es-UY'), pct(data.summary.cartRate) + ' de las vistas', ShoppingCart, 'bg-cyan-50 text-cyan-600'],
    ['Favoritos', data.summary.favoriteAdds.toLocaleString('es-UY'), data.summary.currentFavorites + ' guardados ahora', Heart, 'bg-rose-50 text-rose-600'],
    ['Conversión', pct(data.summary.conversionRate), data.summary.orders + ' pedidos confirmados', Percent, 'bg-violet-50 text-violet-600'],
    ['Ventas', money(data.summary.revenue, 'UYU'), data.summary.soldUnits + ' unidades', CircleDollarSign, 'bg-emerald-50 text-emerald-600'],
  ] as const;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#6366F1]">Inteligencia comercial</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Analítica</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Descubrí qué productos atraen atención, cuáles generan intención de compra y cuáles convierten en ventas.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-xl border bg-white p-1">
          {([7, 30, 90] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={days === value ? 'default' : 'ghost'}
              onClick={() => setDays(value)}
            >
              {value} días
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(([label, value, detail, Icon, accent]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
                <span className={'grid size-10 shrink-0 place-items-center rounded-xl ' + accent}>
                  <Icon className="size-5" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <BarChart3 className="size-5 text-indigo-600" />
              <div>
                <h2 className="text-xl font-black">Actividad diaria</h2>
                <p className="text-sm text-muted-foreground">Vistas y agregados al carrito dentro del período.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto pb-2">
              <div className="flex h-56 min-w-[720px] items-end gap-1.5">
                {data.trend.map((point) => {
                  const viewHeight = point.views ? Math.max(5, (point.views / maxTrend) * 100) : 2;
                  const cartHeight = point.cartAdds ? Math.max(5, (point.cartAdds / maxTrend) * 100) : 0;
                  return (
                    <div key={point.date} className="group flex h-full min-w-3 flex-1 flex-col justify-end">
                      <div className="relative flex flex-1 items-end justify-center gap-px">
                        <div
                          className="w-1/2 rounded-t bg-indigo-500/80"
                          style={{ height: viewHeight + '%' }}
                        />
                        <div
                          className="w-1/2 rounded-t bg-cyan-400/90"
                          style={{ height: cartHeight + '%' }}
                        />
                        {(point.views > 0 || point.cartAdds > 0 || point.orders > 0) && (
                          <div className="absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2.5 py-2 text-[10px] leading-4 text-white shadow-xl group-hover:block">
                            <div>{point.views} vistas</div>
                            <div>{point.cartAdds} al carrito</div>
                            <div>{point.orders} pedidos</div>
                          </div>
                        )}
                      </div>
                      {(days <= 30 || Number(point.date.slice(-2)) % 5 === 0) && (
                        <span className="mt-2 truncate text-center text-[9px] text-muted-foreground">
                          {new Date(point.date + 'T12:00:00').toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-indigo-500" /> Vistas</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-cyan-400" /> Al carrito</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <h2 className="text-xl font-black">Embudo comercial</h2>
            <p className="text-sm text-muted-foreground">De atención a compra confirmada.</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {[
              ['Vistas', data.summary.views, '100%'],
              ['Al carrito', data.summary.cartAdds, pct(data.summary.cartRate)],
              ['Pedidos', data.summary.orders, pct(data.summary.conversionRate)],
            ].map(([label, value, rate]) => {
              const numeric = Number(value);
              return (
                <div key={String(label)}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{label}</span>
                    <span><strong>{numeric.toLocaleString('es-UY')}</strong> <span className="text-muted-foreground">· {rate}</span></span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366F1] to-[#22D3EE]"
                      style={{ width: Math.max(numeric ? 5 : 0, (numeric / funnelMax) * 100) + '%' }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl bg-rose-50 p-4">
              <div className="flex items-center gap-2">
                <Heart className="size-4 text-rose-600" />
                <p className="font-bold">Interés guardado</p>
              </div>
              <p className="mt-2 text-2xl font-black">{data.summary.currentFavorites}</p>
              <p className="text-xs text-muted-foreground">
                Productos tuyos que siguen actualmente guardados por compradores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black">Rendimiento por producto</h2>
              <p className="text-sm text-muted-foreground">Compará descubrimiento, intención y ventas producto por producto.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Ordenar por</span>
              <select
                className="h-9 rounded-md border bg-white px-3 text-sm font-semibold"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <option key={key} value={key}>{sortLabels[key]}</option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!products.length ? (
            <div className="grid place-items-center gap-2 p-12 text-center">
              <TrendingUp className="size-9 text-slate-300" />
              <p className="font-bold">Todavía no hay productos para analizar</p>
            </div>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {products.map((product) => (
                  <div key={product.productId} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.storeName} · {product.status}</p>
                      </div>
                      <p className="shrink-0 font-black">{money(product.revenue, 'UYU')}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-muted-foreground">Vistas</p><p className="font-black">{product.views}</p></div>
                      <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-muted-foreground">Carrito</p><p className="font-black">{product.cartAdds}</p></div>
                      <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] uppercase text-muted-foreground">Favoritos</p><p className="font-black">{product.currentFavorites}</p></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span>{product.orders} pedidos · {product.soldUnits} unidades</span>
                      <span className="font-bold text-indigo-700">{pct(product.conversionRate)} conversión</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Producto</th>
                      <th className="px-4 py-3 text-right">Vistas</th>
                      <th className="px-4 py-3 text-right">Carrito</th>
                      <th className="px-4 py-3 text-right">Favoritos</th>
                      <th className="px-4 py-3 text-right">Pedidos</th>
                      <th className="px-4 py-3 text-right">Conversión</th>
                      <th className="px-5 py-3 text-right">Ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((product) => (
                      <tr key={product.productId} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="font-bold">{product.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{product.storeName} · Stock {product.stock}</p>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold">{product.views}</td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-semibold">{product.cartAdds}</p>
                          <p className="text-xs text-muted-foreground">{pct(product.cartRate)}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-semibold">{product.currentFavorites}</p>
                          <p className="text-xs text-muted-foreground">{product.favoriteAdds} nuevos</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="font-semibold">{product.orders}</p>
                          <p className="text-xs text-muted-foreground">{product.soldUnits} uds.</p>
                        </td>
                        <td className="px-4 py-4 text-right font-black text-indigo-700">{pct(product.conversionRate)}</td>
                        <td className="px-5 py-4 text-right font-black">{money(product.revenue, 'UYU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-dashed bg-slate-50 p-4 text-xs leading-5 text-muted-foreground">
        Las vistas se registran como máximo una vez por navegador, producto y día. La conversión se calcula como pedidos confirmados ÷ vistas registradas dentro del período.
      </div>
    </div>
  );
}

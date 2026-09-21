'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type Commission = {
  id: string;
  status: string;
  rate: string | number;
  baseAmount: string | number;
  amount: string | number;
  createdAt: string;
  vendor: { businessName: string; user: { email: string } };
  order: { currency: string; store: { name: string } };
};

export function AdminCommissions() {
  const query = useQuery({ queryKey: ['admin-commissions'], queryFn: () => authApi<Commission[]>('/admin/commissions') });
  const total = (query.data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ingresos de plataforma</p>
        <h1 className="text-3xl font-black tracking-tight">Comisiones</h1>
        <p className="mt-1 text-muted-foreground">Total registrado: <span className="font-bold text-foreground">{money(total)}</span></p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-4">Fecha</th><th className="p-4">Vendedor</th><th className="p-4">Tienda</th><th className="p-4">Estado</th><th className="p-4 text-right">Base</th><th className="p-4 text-right">Tasa</th><th className="p-4 text-right">Comisión</th></tr>
              </thead>
              <tbody className="divide-y">
                {(query.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="p-4">{new Date(row.createdAt).toLocaleString('es-UY')}</td>
                    <td className="p-4"><p className="font-medium">{row.vendor.businessName}</p><p className="text-xs text-muted-foreground">{row.vendor.user.email}</p></td>
                    <td className="p-4">{row.order.store.name}</td>
                    <td className="p-4"><Badge>{row.status}</Badge></td>
                    <td className="p-4 text-right">{money(row.baseAmount, row.order.currency)}</td>
                    <td className="p-4 text-right">{(Number(row.rate) * 100).toFixed(2)}%</td>
                    <td className="p-4 text-right font-bold">{money(row.amount, row.order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando comisiones…</p>}
          {!query.isLoading && !query.data?.length && <p className="p-6 text-sm text-muted-foreground">Todavía no hay comisiones registradas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

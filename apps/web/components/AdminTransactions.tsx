'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type Payment = {
  id: string;
  provider: string;
  status: string;
  amount: string | number;
  createdAt: string;
  order: {
    currency: string;
    store: { name: string };
    buyer: { name: string; email: string };
  };
  commission?: { amount: string | number } | null;
};

export function AdminTransactions() {
  const query = useQuery({ queryKey: ['admin-transactions'], queryFn: () => authApi<Payment[]>('/admin/transactions') });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Pagos</p>
        <h1 className="text-3xl font-black tracking-tight">Transacciones</h1>
        <p className="mt-1 text-muted-foreground">Pagos y movimientos procesados por el marketplace.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Fecha</th><th className="p-4">Tienda</th><th className="p-4">Comprador</th><th className="p-4">Proveedor</th><th className="p-4">Estado</th><th className="p-4 text-right">Importe</th><th className="p-4 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(query.data ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td className="p-4">{new Date(payment.createdAt).toLocaleString('es-UY')}</td>
                    <td className="p-4 font-medium">{payment.order.store.name}</td>
                    <td className="p-4"><p>{payment.order.buyer.name}</p><p className="text-xs text-muted-foreground">{payment.order.buyer.email}</p></td>
                    <td className="p-4">{payment.provider}</td>
                    <td className="p-4"><Badge>{payment.status}</Badge></td>
                    <td className="p-4 text-right font-semibold">{money(payment.amount, payment.order.currency)}</td>
                    <td className="p-4 text-right">{money(payment.commission?.amount ?? 0, payment.order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.isLoading && <p className="p-6 text-sm text-muted-foreground">Cargando transacciones…</p>}
          {!query.isLoading && !query.data?.length && <p className="p-6 text-sm text-muted-foreground">Todavía no hay transacciones.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

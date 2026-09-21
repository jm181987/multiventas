'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type Commission = {
  id: string;
  rate: string | number;
  baseAmount: string | number;
  amount: string | number;
  status: string;
  createdAt: string;
  vendor: { businessName: string; user: { name: string; email: string } };
  order: { id: string; currency: string; store: { name: string } };
};

export function AdminCommissions() {
  const query = useQuery({ queryKey: ['admin-commissions'], queryFn: () => authApi<Commission[]>('/admin/commissions') });
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ingresos</p><h1 className="text-3xl font-black tracking-tight">Comisiones</h1></div>{query.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : query.error ? <p className="text-sm text-red-600">{String(query.error)}</p> : <div className="space-y-3">{(query.data ?? []).map((c) => <Card key={c.id}><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{c.vendor.businessName}</p><Badge>{c.status}</Badge></div><p className="text-sm text-muted-foreground">{c.order.store.name} · Pedido #{c.order.id.slice(0,8)}</p><p className="text-xs text-muted-foreground">Tasa {(Number(c.rate) * 100).toFixed(1)}% sobre {money(Number(c.baseAmount), c.order.currency)}</p></div><p className="text-xl font-black">{money(Number(c.amount), c.order.currency)}</p></CardContent></Card>)}</div>}</div>;
}

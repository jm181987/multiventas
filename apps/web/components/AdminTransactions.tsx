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
  feeAmount: string | number;
  createdAt: string;
  order: { id: string; currency: string; store: { name: string }; buyer: { name: string; email: string } };
};

export function AdminTransactions() {
  const query = useQuery({ queryKey: ['admin-transactions'], queryFn: () => authApi<Payment[]>('/admin/transactions') });
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Pagos</p><h1 className="text-3xl font-black tracking-tight">Transacciones</h1></div>{query.isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : query.error ? <p className="text-sm text-red-600">{String(query.error)}</p> : <div className="space-y-3">{(query.data ?? []).map((p) => <Card key={p.id}><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">#{p.id.slice(0,8).toUpperCase()}</p><Badge>{p.status}</Badge><Badge>{p.provider}</Badge></div><p className="mt-1 font-medium">{p.order.store.name}</p><p className="text-sm text-muted-foreground">{p.order.buyer.name} · {p.order.buyer.email}</p></div><div className="lg:text-right"><p className="text-xl font-black">{money(Number(p.amount), p.order.currency)}</p><p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString('es-UY')}</p></div></CardContent></Card>)}</div>}</div>;
}

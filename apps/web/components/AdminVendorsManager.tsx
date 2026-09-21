'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, ShieldAlert, Store, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Vendor = {
  id: string;
  businessName: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  kycStatus: string;
  createdAt: string;
  user: { name: string; email: string };
  stores: Array<{ id: string; name: string; slug: string; status: string }>;
};

export function AdminVendorsManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | Vendor['status']>('PENDING');

  const query = useQuery({ queryKey: ['admin-vendors'], queryFn: () => authApi<Vendor[]>('/vendors') });
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor['status'] }) => authApi(`/vendors/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        kycStatus: status === 'APPROVED' ? 'VERIFIED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING',
      }),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-vendors'] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const vendors = query.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((vendor) => {
      const matches = !q || vendor.businessName.toLowerCase().includes(q) || vendor.user.name.toLowerCase().includes(q) || vendor.user.email.toLowerCase().includes(q);
      return matches && (filter === 'ALL' || vendor.status === filter);
    });
  }, [filter, search, vendors]);

  const pending = vendors.filter((v) => v.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Onboarding</p>
        <h1 className="text-3xl font-black tracking-tight">Vendedores</h1>
        <p className="mt-1 text-muted-foreground">{pending} solicitud{pending === 1 ? '' : 'es'} pendiente{pending === 1 ? '' : 's'} de revisión.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comercio, nombre o email…" /></div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="PENDING">Pendientes</option><option value="APPROVED">Aprobados</option><option value="SUSPENDED">Suspendidos</option><option value="REJECTED">Rechazados</option><option value="ALL">Todos</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando vendedores…</div> : query.error ? <div className="p-8 text-sm text-red-600">{String(query.error)}</div> : !filtered.length ? <div className="p-12 text-center text-sm text-muted-foreground">No hay vendedores con este filtro.</div> : (
            <div className="divide-y">
              {filtered.map((vendor) => (
                <div key={vendor.id} className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><p className="text-lg font-black">{vendor.businessName}</p><Badge>{vendor.status}</Badge><Badge>{vendor.kycStatus}</Badge></div>
                      <p className="mt-1 font-medium">{vendor.user.name}</p>
                      <p className="text-sm text-muted-foreground">{vendor.user.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">{vendor.stores.map((store) => <span key={store.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"><Store className="size-3" />{store.name} · {store.status}</span>)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {vendor.status !== 'APPROVED' && <Button disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'APPROVED' })}><CheckCircle2 className="mr-1 size-4" /> Aprobar</Button>}
                      {vendor.status === 'PENDING' && <Button variant="outline" className="text-red-600" disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'REJECTED' })}><XCircle className="mr-1 size-4" /> Rechazar</Button>}
                      {vendor.status === 'APPROVED' && <Button variant="outline" className="text-amber-700" disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'SUSPENDED' })}><ShieldAlert className="mr-1 size-4" /> Suspender</Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

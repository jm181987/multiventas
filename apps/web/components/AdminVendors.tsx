'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search, ShieldAlert, Store, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Vendor = {
  id: string;
  businessName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  kycStatus: string;
  createdAt: string;
  user: { email: string; name: string };
  stores: Array<{ id: string; name: string; slug: string; status: string }>;
};

export function AdminVendors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | Vendor['status']>('ALL');
  const query = useQuery({ queryKey: ['admin-vendors'], queryFn: () => authApi<Vendor[]>('/vendors') });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor['status'] }) =>
      authApi('/vendors/' + id + '/review', {
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

  const vendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((vendor) => {
      const matchesSearch = !q || vendor.businessName.toLowerCase().includes(q) || vendor.user.email.toLowerCase().includes(q) || vendor.user.name.toLowerCase().includes(q);
      return matchesSearch && (status === 'ALL' || vendor.status === status);
    });
  }, [query.data, search, status]);

  const pending = query.data?.filter((v) => v.status === 'PENDING').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cuentas comerciales</p>
        <h1 className="text-3xl font-black tracking-tight">Vendedores</h1>
        <p className="mt-1 text-muted-foreground">{pending} solicitudes pendientes de revisión.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vendedor o email…" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobados</option>
              <option value="SUSPENDED">Suspendidos</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando vendedores…</p> : query.error ? <p className="p-6 text-sm text-red-600">{String(query.error)}</p> : (
            <div className="divide-y">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{vendor.businessName}</p>
                      <Badge>{vendor.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{vendor.user.name} · {vendor.user.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">KYC: {vendor.kycStatus} · Alta {new Date(vendor.createdAt).toLocaleDateString('es-UY')}</p>
                  </div>
                  <div className="space-y-1">
                    {vendor.stores.length ? vendor.stores.map((store) => (
                      <p key={store.id} className="flex items-center gap-2 text-sm"><Store className="size-4 text-muted-foreground" />{store.name} <span className="text-xs text-muted-foreground">({store.status})</span></p>
                    )) : <p className="text-sm text-muted-foreground">Sin tiendas</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {vendor.status !== 'APPROVED' && <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'APPROVED' })}><Check className="mr-1 size-4" /> Aprobar</Button>}
                    {vendor.status === 'PENDING' && <Button variant="outline" size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'REJECTED' })}><X className="mr-1 size-4" /> Rechazar</Button>}
                    {vendor.status === 'APPROVED' && <Button variant="outline" size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: vendor.id, status: 'SUSPENDED' })}><ShieldAlert className="mr-1 size-4" /> Suspender</Button>}
                  </div>
                </div>
              ))}
              {!vendors.length && <p className="p-6 text-sm text-muted-foreground">No hay vendedores con esos filtros.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, LifeBuoy, MessageSquareWarning, Store, UserRound } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type SupportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

type SupportCase = {
  id: string;
  status: SupportStatus;
  subject: string;
  description: string;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  creator: { id: string; name: string; email: string };
  order: {
    id: string;
    status: string;
    total: string | number;
    currency: string;
    createdAt: string;
    store: { id: string; name: string; slug: string };
    buyer: { id: string; name: string; email: string };
    vendor: {
      id: string;
      businessName: string;
      user: { id: string; name: string; email: string };
    };
  };
};

const statusLabel: Record<SupportStatus, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

const statusClass: Record<SupportStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_REVIEW: 'bg-indigo-100 text-indigo-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-200 text-slate-700',
};

export function AdminSupportCases() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | SupportStatus>('OPEN');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['admin-support-cases', filter],
    queryFn: () => authApi<SupportCase[]>(
      '/admin/support-cases' + (filter === 'ALL' ? '' : '?status=' + filter),
    ),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportStatus }) =>
      authApi('/admin/support-cases/' + id, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNote: notes[id]?.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-support-cases'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar el caso'),
  });

  const cases = query.data ?? [];
  const openCount = useMemo(
    () => cases.filter((item) => item.status === 'OPEN' || item.status === 'IN_REVIEW').length,
    [cases],
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Postventa</p>
          <h1 className="text-3xl font-black tracking-tight">Soporte de pedidos</h1>
          <p className="mt-1 text-muted-foreground">
            Gestioná incidencias asociadas a pedidos sin asumir la operación logística del vendedor.
          </p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm">
          <span className="text-muted-foreground">En atención</span>
          <span className="ml-2 text-xl font-black">{openCount}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'ALL'] as const).map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status === 'ALL' ? 'Todos' : statusLabel[status]}
          </Button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {query.isLoading ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Cargando casos…</CardContent></Card>
      ) : query.error ? (
        <Card><CardContent className="p-8 text-sm text-red-600">{String(query.error)}</CardContent></Card>
      ) : !cases.length ? (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-12 text-center">
            <LifeBuoy className="size-10 text-slate-300" />
            <div>
              <p className="font-bold">No hay casos en este estado</p>
              <p className="text-sm text-muted-foreground">Las incidencias nuevas aparecerán acá.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((supportCase) => (
            <Card key={supportCase.id} className="overflow-hidden">
              <CardHeader className="border-b bg-slate-50/60">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="min-w-0 break-words text-lg font-black">{supportCase.subject}</h2>
                      <Badge className={statusClass[supportCase.status]}>{statusLabel[supportCase.status]}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Caso #{supportCase.id.slice(0, 8).toUpperCase()} · Pedido #{supportCase.order.id.slice(0, 8).toUpperCase()} · {new Date(supportCase.createdAt).toLocaleString('es-UY')}
                    </p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xs text-muted-foreground">Total del pedido</p>
                    <p className="text-xl font-black">{money(Number(supportCase.order.total), supportCase.order.currency)}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <MessageSquareWarning className="size-4 text-amber-600" /> Descripción
                    </div>
                    <p className="mt-2 whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm leading-6 text-slate-700">
                      {supportCase.description}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="flex items-center gap-2 font-bold"><UserRound className="size-4" /> Solicitante</div>
                        <p className="mt-1">{supportCase.creator.name}</p>
                        <p className="break-all text-xs text-muted-foreground">{supportCase.creator.email}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="flex items-center gap-2 font-bold"><Store className="size-4" /> Tienda</div>
                        <p className="mt-1">{supportCase.order.store.name}</p>
                        <p className="text-xs text-muted-foreground">{supportCase.order.vendor.businessName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border bg-white p-4 text-sm">
                      <p className="font-bold">Comprador</p>
                      <p className="mt-1">{supportCase.order.buyer.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{supportCase.order.buyer.email}</p>

                      <p className="mt-4 font-bold">Vendedor</p>
                      <p className="mt-1">{supportCase.order.vendor.user.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{supportCase.order.vendor.user.email}</p>

                      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />
                        Pedido: {supportCase.order.status}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <label className="block text-sm font-bold">
                    Nota para el usuario
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-200"
                      maxLength={3000}
                      placeholder="Explicación o resolución que verá el usuario dentro del pedido."
                      value={notes[supportCase.id] ?? supportCase.adminNote ?? ''}
                      onChange={(e) => setNotes({ ...notes, [supportCase.id]: e.target.value })}
                    />
                  </label>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    {supportCase.status !== 'IN_REVIEW' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: supportCase.id, status: 'IN_REVIEW' })}
                      >
                        Marcar en revisión
                      </Button>
                    )}
                    {supportCase.status !== 'RESOLVED' && (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: supportCase.id, status: 'RESOLVED' })}
                      >
                        <CheckCircle2 className="mr-1.5 size-4" /> Resolver
                      </Button>
                    )}
                    {supportCase.status !== 'CLOSED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: supportCase.id, status: 'CLOSED' })}
                      >
                        Cerrar
                      </Button>
                    )}
                    {(supportCase.status === 'RESOLVED' || supportCase.status === 'CLOSED') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: supportCase.id, status: 'OPEN' })}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

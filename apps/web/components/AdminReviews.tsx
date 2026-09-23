'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, MessageSquareText, ShieldCheck, Star, XCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ReviewStars } from '@/components/ReviewStars';

type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';

type AdminReview = {
  id: string;
  rating: number;
  comment?: string | null;
  status: ReviewStatus;
  createdAt: string;
  orderItemId?: string | null;
  buyer: { id: string; name: string; email: string };
  product: { id: string; title: string; slug: string };
  store: { id: string; name: string; slug: string };
  orderItem?: { id: string; orderId: string } | null;
};

type ReviewResponse = {
  items: AdminReview[];
  total: number;
  page: number;
  limit: number;
};

const statusLabel: Record<ReviewStatus, string> = {
  PENDING: 'Pendiente',
  PUBLISHED: 'Publicada',
  REJECTED: 'Rechazada',
};

const statusClass: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
};

export function AdminReviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | ReviewStatus>('PENDING');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => authApi<ReviewResponse>('/admin/reviews' + (filter === 'ALL' ? '' : '?status=' + filter)),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PUBLISHED' | 'REJECTED' }) =>
      authApi('/admin/reviews/' + id, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo moderar la reseña'),
  });

  const items = query.data?.items ?? [];
  const counts = useMemo(() => ({
    shown: items.length,
    total: query.data?.total ?? 0,
  }), [items.length, query.data?.total]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Confianza</p>
          <h1 className="text-3xl font-black tracking-tight">Moderación de reseñas</h1>
          <p className="mt-1 text-muted-foreground">Publicá opiniones verificadas y descartá contenido inapropiado.</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm">
          <span className="text-muted-foreground">Resultados</span>
          <span className="ml-2 text-xl font-black">{counts.total}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['PENDING', 'PUBLISHED', 'REJECTED', 'ALL'] as const).map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status === 'ALL' ? 'Todas' : statusLabel[status]}
          </Button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-5" />
            <div>
              <h2 className="text-xl font-bold">Opiniones</h2>
              <p className="text-sm text-muted-foreground">Solo pedidos entregados pueden generar una reseña.</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {query.isLoading ? (
            <p className="p-8 text-sm text-muted-foreground">Cargando reseñas…</p>
          ) : query.error ? (
            <p className="p-8 text-sm text-red-600">{String(query.error)}</p>
          ) : !items.length ? (
            <div className="grid place-items-center gap-3 p-12 text-center">
              <ShieldCheck className="size-10 text-muted-foreground" />
              <div>
                <p className="font-bold">No hay reseñas en este estado</p>
                <p className="text-sm text-muted-foreground">Cuando haya opiniones para revisar aparecerán acá.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((review) => (
                <div key={review.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ReviewStars rating={review.rating} />
                        <Badge className={statusClass[review.status]}>{statusLabel[review.status]}</Badge>
                        {review.orderItemId && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <ShieldCheck className="size-3.5" /> Compra verificada
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {review.comment || <span className="italic text-muted-foreground">Sin comentario escrito.</span>}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span><strong className="text-foreground">{review.buyer.name}</strong> · {review.buyer.email}</span>
                        <span>{new Date(review.createdAt).toLocaleString('es-UY')}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <Link href={'/productos/' + review.product.id} target="_blank" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline">
                          {review.product.title} <ExternalLink className="size-3.5" />
                        </Link>
                        <Link href={'/tienda/' + review.store.slug} target="_blank" className="inline-flex items-center gap-1 text-muted-foreground hover:underline">
                          {review.store.name} <ExternalLink className="size-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {review.status !== 'REJECTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          disabled={moderate.isPending}
                          onClick={() => moderate.mutate({ id: review.id, status: 'REJECTED' })}
                        >
                          <XCircle className="mr-1.5 size-4" /> Rechazar
                        </Button>
                      )}
                      {review.status !== 'PUBLISHED' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={moderate.isPending}
                          onClick={() => moderate.mutate({ id: review.id, status: 'PUBLISHED' })}
                        >
                          <CheckCircle2 className="mr-1.5 size-4" /> Publicar
                        </Button>
                      )}
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

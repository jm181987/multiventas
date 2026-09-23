'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Star, X } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

type ExistingReview = {
  id: string;
  rating: number;
  comment?: string | null;
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED';
};

export function ProductReviewAction({
  orderItemId,
  productTitle,
  review,
}: {
  orderItemId: string;
  productTitle: string;
  review?: ExistingReview | null;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => authApi('/reviews', {
      method: 'POST',
      body: JSON.stringify({ orderItemId, rating, comment: comment.trim() || undefined }),
    }),
    onSuccess: () => {
      setOpen(false);
      setError('');
      qc.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo enviar la reseña'),
  });

  if (review) {
    const label = review.status === 'PUBLISHED'
      ? 'Opinión publicada'
      : review.status === 'REJECTED'
        ? 'Opinión revisada'
        : 'Opinión en moderación';

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
          <CheckCircle2 className="size-3.5" /> {label}
        </span>
        <span className="inline-flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={'size-3.5 ' + (index < review.rating ? 'fill-current' : 'text-slate-300')} />
          ))}
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setOpen(true)}>
        <Star className="mr-1.5 size-4" /> Dejar opinión
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">¿Qué te pareció {productTitle}?</p>
          <p className="text-xs text-muted-foreground">Tu reseña aparecerá como compra verificada después de moderación.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-white">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-1" aria-label={'Calificación: ' + rating + ' de 5'}>
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          return (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={value + ' estrellas'}>
              <Star className={'size-7 transition ' + (value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300')} />
            </button>
          );
        })}
      </div>

      <textarea
        className="mt-3 min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
        maxLength={2000}
        placeholder="Contá brevemente cómo fue tu experiencia (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="button" size="sm" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? 'Enviando…' : 'Enviar reseña'}
        </Button>
      </div>
    </div>
  );
}

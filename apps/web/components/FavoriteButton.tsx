'use client';

import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, hasAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function FavoriteButton({
  productId,
  className = '',
  withLabel = false,
}: {
  productId: string;
  className?: string;
  withLabel?: boolean;
}) {
  const qc = useQueryClient();
  const authenticated = hasAuth();
  const query = useQuery({
    queryKey: ['favorite-ids'],
    queryFn: () => authApi<string[]>('/favorites/ids'),
    enabled: authenticated,
    staleTime: 30_000,
  });

  const active = query.data?.includes(productId) ?? false;

  const mutation = useMutation({
    mutationFn: () => authApi('/favorites/' + productId, {
      method: active ? 'DELETE' : 'POST',
    }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['favorite-ids'] });
      const previous = qc.getQueryData<string[]>(['favorite-ids']) ?? [];
      qc.setQueryData<string[]>(
        ['favorite-ids'],
        active ? previous.filter((id) => id !== productId) : Array.from(new Set(previous.concat(productId))),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) qc.setQueryData(['favorite-ids'], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favorite-ids'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={active}
      className={'gap-1.5 ' + className}
      disabled={mutation.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!hasAuth()) {
          location.href = '/login?next=' + encodeURIComponent(location.pathname);
          return;
        }
        mutation.mutate();
      }}
    >
      <Heart className={'size-4 ' + (active ? 'fill-rose-500 text-rose-500' : '')} />
      {withLabel && (active ? 'Guardado' : 'Guardar')}
    </Button>
  );
}

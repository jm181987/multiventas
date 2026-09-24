'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Clock3 } from 'lucide-react';
import { authApi, publicApi } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { useAuthSession } from '@/components/auth-provider';
import { getRecentProductIds } from '@/components/ProductViewTracker';

export function PersonalizedRecommendations({
  excludeProductId,
  accentColor,
}: {
  excludeProductId?: string;
  accentColor?: string;
}) {
  const { user } = useAuthSession();
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentProductIds().filter((id) => id !== excludeProductId));
  }, [excludeProductId]);

  const personalized = useQuery({
    queryKey: ['recommendations-personalized', user?.id],
    queryFn: () => authApi<Product[]>('/recommendations/personalized'),
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const recent = useQuery({
    queryKey: ['recommendations-recent', recentIds.join(',')],
    queryFn: () => publicApi<Product[]>('/recommendations/recent', {
      method: 'POST',
      body: JSON.stringify({ ids: recentIds }),
    }),
    enabled: recentIds.length > 0,
    staleTime: 60_000,
  });

  const forYou = useMemo(
    () => (personalized.data ?? []).filter((product) => product.id !== excludeProductId).slice(0, 8),
    [personalized.data, excludeProductId],
  );

  const recentlyViewed = useMemo(
    () => (recent.data ?? []).filter((product) => product.id !== excludeProductId).slice(0, 8),
    [recent.data, excludeProductId],
  );

  if (!forYou.length && !recentlyViewed.length) return null;

  return (
    <div className="space-y-12">
      {!!forYou.length && (
        <section className="border-t pt-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Para vos</p>
              <h2 className="text-3xl font-black">Basado en lo que te interesa</h2>
            </div>
          </div>
          <ProductGrid products={forYou} accentColor={accentColor} />
        </section>
      )}

      {!!recentlyViewed.length && (
        <section className="border-t pt-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
              <Clock3 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Historial</p>
              <h2 className="text-3xl font-black">Vistos recientemente</h2>
            </div>
          </div>
          <ProductGrid products={recentlyViewed} accentColor={accentColor} />
        </section>
      )}
    </div>
  );
}

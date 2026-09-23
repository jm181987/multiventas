'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthSession } from '@/components/auth-provider';
import { Product } from '@/lib/types';
import { ProductGrid } from '@/components/ProductGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type FavoriteRow = {
  id: string;
  createdAt: string;
  product: Product;
};

export function FavoritesView() {
  const { user, loading } = useAuthSession();
  const query = useQuery({
    queryKey: ['favorites'],
    queryFn: () => authApi<FavoriteRow[]>('/favorites'),
    enabled: Boolean(user),
  });

  if (loading) return <p className="text-sm text-muted-foreground">Cargando favoritos…</p>;

  if (!user) {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-4 p-12 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-black">Guardá lo que te gusta</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ingresá para guardar productos y encontrarlos fácilmente después.</p>
          </div>
          <Link href="/login?next=%2Ffavoritos"><Button>Ingresar</Button></Link>
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Cargando favoritos…</p>;
  if (query.error) return <p className="text-sm text-red-600">No pudimos cargar tus favoritos.</p>;

  const products = (query.data ?? []).map((row) => row.product);

  if (!products.length) {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-4 p-12 text-center">
          <Heart className="size-10 text-slate-300" />
          <div>
            <h2 className="text-xl font-black">Todavía no guardaste productos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tocá el corazón de cualquier producto para agregarlo acá.</p>
          </div>
          <Link href="/productos"><Button>Explorar productos</Button></Link>
        </CardContent>
      </Card>
    );
  }

  return <ProductGrid products={products} />;
}

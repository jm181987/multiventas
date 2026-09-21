'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function DashboardResource({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['resource', endpoint], queryFn: () => authApi<any>(endpoint) });
  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="text-muted-foreground">Datos en tiempo real del marketplace.</p></div>
      <Card>
        <CardHeader><h2 className="font-bold">{query.isLoading ? 'Cargando…' : 'Resultados'}</h2></CardHeader>
        <CardContent>
          {query.error ? <p className="text-red-600">{String(query.error)}</p> : (
            <div className="overflow-x-auto">
              <pre className="min-w-[600px] whitespace-pre-wrap text-xs">{JSON.stringify(query.data ?? [], null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

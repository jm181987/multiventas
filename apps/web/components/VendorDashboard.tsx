'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function VendorDashboard() {
  const products = useQuery({ queryKey: ['vendor-products'], queryFn: () => authApi<any[]>('/vendor/products') });
  const orders = useQuery({ queryKey: ['vendor-orders'], queryFn: () => authApi<any[]>('/vendor/orders') });
  const commissions = useQuery({ queryKey: ['vendor-commissions'], queryFn: () => authApi<any[]>('/vendor/commissions') });

  const stats = [
    ['Productos', products.data?.length ?? 0],
    ['Órdenes', orders.data?.length ?? 0],
    ['Comisiones registradas', commissions.data?.length ?? 0],
  ];
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black">Dashboard vendedor</h1><p className="text-muted-foreground">Gestioná tu negocio desde un único lugar.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(([label, value]) => <Card key={String(label)}><CardHeader className="pb-2"><p className="text-sm text-muted-foreground">{label}</p></CardHeader><CardContent><p className="text-3xl font-black">{value}</p></CardContent></Card>)}
      </div>
    </div>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type CheckoutResult = {
  checkouts: Array<{
    orderId: string;
    preferenceId: string;
    initPoint: string;
    marketplaceFee: number;
  }>;
};

export function CheckoutForm() {
  const [result, setResult] = useState<CheckoutResult>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await authApi<CheckoutResult>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: {
            address: form.get('address'),
            city: form.get('city'),
            department: form.get('department'),
            postalCode: form.get('postalCode'),
          },
          notes: form.get('notes'),
        }),
      });
      setResult(data);
      if (data.checkouts.length === 1) location.href = data.checkouts[0].initPoint;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el checkout');
    } finally {
      setLoading(false);
    }
  }

  if (result?.checkouts.length && result.checkouts.length > 1) {
    return (
      <Card>
        <CardHeader><h2 className="text-xl font-bold">Pagos separados por vendedor</h2></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Mercado Pago Split 1:1 genera una transacción por vendedor. Completa cada pago:</p>
          {result.checkouts.map((checkout, index) => (
            <a key={checkout.orderId} href={checkout.initPoint} className="block">
              <Button className="w-full">Pagar orden {index + 1}</Button>
            </a>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Input name="address" placeholder="Dirección" required />
      <div className="grid gap-4 sm:grid-cols-2"><Input name="city" placeholder="Ciudad" required /><Input name="department" placeholder="Departamento" required /></div>
      <Input name="postalCode" placeholder="Código postal" />
      <Input name="notes" placeholder="Notas de entrega" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button size="lg" disabled={loading}>{loading ? 'Preparando pago…' : 'Pagar con Mercado Pago'}</Button>
    </form>
  );
}

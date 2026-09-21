'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
export default function MercadoPagoPage() {
  const [error,setError] = useState('');
  async function connect() { try { const data = await authApi<{authorizationUrl:string}>('/payments/mercadopago/connect'); location.href = data.authorizationUrl; } catch (e) { setError(String(e)); } }
  return <Card><CardHeader><h1 className="text-3xl font-black">Mercado Pago</h1><p className="text-muted-foreground">Conectá tu cuenta para recibir ventas con Split 1:1.</p></CardHeader><CardContent className="space-y-4"><Button onClick={connect}>Conectar Mercado Pago</Button>{error && <p className="text-sm text-red-600">{error}</p>}</CardContent></Card>;
}

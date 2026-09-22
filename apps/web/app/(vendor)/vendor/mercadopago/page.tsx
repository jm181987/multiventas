'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Link2, RefreshCw, ShieldCheck, Unlink, WalletCards } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type ConnectionStatus = {
  connected: boolean;
  expiresAt: string | null;
  scope: string | null;
  providerUserId: string | null;
  updatedAt: string | null;
  reconnectRequired: boolean;
  redirectUri: string | null;
};

export default function MercadoPagoPage() {
  const search = useSearchParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function loadStatus() {
    const data = await authApi<ConnectionStatus>('/payments/mercadopago/status');
    setStatus(data);
    return data;
  }

  useEffect(() => {
    const callbackError = search.get('error');
    const connected = search.get('connected');

    if (callbackError === 'authorization_denied') {
      setError('La autorización fue cancelada o rechazada en Mercado Pago.');
    } else if (callbackError === 'oauth_failed') {
      setError('Mercado Pago no pudo completar la conexión. Verifica Client ID, Client Secret y que la Redirect URL coincida exactamente.');
    } else if (connected === '1') {
      setError('');
    }

    loadStatus()
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo consultar Mercado Pago'))
      .finally(() => setLoading(false));
  }, [search]);

  async function connect() {
    setConnecting(true);
    setError('');
    try {
      const data = await authApi<{ authorizationUrl: string }>('/payments/mercadopago/connect');
      location.href = data.authorizationUrl;
    } catch (e) {
      setConnecting(false);
      setError(e instanceof Error ? e.message : 'No se pudo iniciar OAuth');
    }
  }

  async function disconnect() {
    if (!confirm('¿Desconectar esta cuenta de Mercado Pago? No podrás recibir nuevos pagos hasta reconectarla.')) return;
    setError('');
    try {
      await authApi('/payments/mercadopago/disconnect', { method: 'DELETE' });
      await loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desconectar Mercado Pago');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cobros</p>
        <h1 className="text-3xl font-black tracking-tight">Mercado Pago</h1>
        <p className="mt-1 text-muted-foreground">Conecta tu cuenta para recibir ventas con Split 1:1 de forma segura.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-start gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <WalletCards className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black">Estado de la conexión</h2>
              <p className="mt-1 text-sm text-muted-foreground">OAuth autoriza a Multiventas a cobrar en tu nombre sin conocer tu contraseña.</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Consultando Mercado Pago…</p>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="size-5" />
                <div>
                  <p className="font-bold">Cuenta conectada</p>
                  <p className="text-xs">
                    {status.providerUserId ? `Collector ID: ${status.providerUserId}` : 'Autorización activa'}
                    {status.expiresAt ? ` · vence ${new Date(status.expiresAt).toLocaleDateString('es-UY')}` : ''}
                  </p>
                </div>
              </div>

              {status.reconnectRequired && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  La autorización venció. Reconecta Mercado Pago para seguir cobrando.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={connect} disabled={connecting}>
                  <RefreshCw className="mr-2 size-4" /> {connecting ? 'Abriendo Mercado Pago…' : 'Reconectar'}
                </Button>
                <Button variant="outline" onClick={disconnect}>
                  <Unlink className="mr-2 size-4" /> Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="font-bold">Aún no conectaste Mercado Pago</p>
                <p className="mt-1 text-sm text-muted-foreground">Se abrirá el sitio oficial de Mercado Pago para que autorices la integración.</p>
              </div>
              <Button onClick={connect} disabled={connecting}>
                <Link2 className="mr-2 size-4" /> {connecting ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
              </Button>
            </div>
          )}

          {status?.redirectUri && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redirect URL que debe estar configurada en Mercado Pago</p>
              <p className="mt-1 break-all text-sm font-medium">{status.redirectUri}</p>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p>Los access tokens del vendedor se guardan cifrados y nunca se envían al navegador.</p>
          </div>

          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

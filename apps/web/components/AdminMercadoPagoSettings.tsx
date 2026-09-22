'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CreditCard, KeyRound, Percent, ShieldCheck, WalletCards } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type MpConfig = {
  provider: 'MERCADO_PAGO';
  accountEmail: string | null;
  clientId: string;
  hasClientSecret: boolean;
  feeRate: number;
  source: 'database' | 'environment';
  redirectUri: string | null;
  webhookUrl: string | null;
};

export function AdminMercadoPagoSettings() {
  const [config, setConfig] = useState<MpConfig | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [feePercent, setFeePercent] = useState('8');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await authApi<MpConfig>('/admin/mercadopago');
    setConfig(data);
    setAccountEmail(data.accountEmail ?? '');
    setClientId(data.clientId ?? '');
    setFeePercent(String(Math.round(Number(data.feeRate) * 10000) / 100));
    return data;
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const percent = Number(feePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setSaving(false);
      setError('El fee debe estar entre 0% y 100%.');
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        accountEmail: accountEmail.trim() || undefined,
        clientId: clientId.trim() || undefined,
        feeRate: percent / 100,
      };
      if (clientSecret.trim()) payload.clientSecret = clientSecret.trim();

      const updated = await authApi<MpConfig>('/admin/mercadopago', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setConfig(updated);
      setClientSecret('');
      setFeePercent(String(Math.round(Number(updated.feeRate) * 10000) / 100));
      setMessage('Configuración de Mercado Pago guardada. Se aplica inmediatamente a nuevas ventas.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando Mercado Pago…</CardContent></Card>;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-700"><WalletCards className="size-5" /></div>
          <div>
            <h2 className="text-xl font-black">Mercado Pago · Cuenta marketplace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configura la aplicación de Mercado Pago perteneciente a la cuenta que recibirá el marketplace fee.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Email de la cuenta receptora
              <Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} placeholder="cuenta@mercadopago.com" />
              <span className="block text-xs font-normal text-muted-foreground">Dato de referencia administrativa. Los fees los recibe el dueño de la aplicación configurada.</span>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Client ID de la aplicación
              <div className="relative">
                <CreditCard className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" required />
              </div>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Client Secret
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" type="password" autoComplete="new-password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={config?.hasClientSecret ? '•••••••• (dejar vacío para conservar)' : 'Client Secret'} />
              </div>
              <span className="block text-xs font-normal text-muted-foreground">Se cifra en la base de datos y nunca se devuelve al navegador.</span>
            </label>

            <label className="space-y-1 text-sm font-medium">
              Fee de la plataforma
              <div className="relative">
                <Percent className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input className="pl-9" type="number" min="0" max="100" step="0.01" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} required />
              </div>
              <span className="block text-xs font-normal text-muted-foreground">Ejemplo: 8 = 8% de cada venta.</span>
            </label>
          </div>

          <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OAuth callback</p><p className="mt-1 break-all text-sm">{config?.redirectUri || 'No configurado'}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Webhook</p><p className="mt-1 break-all text-sm">{config?.webhookUrl || 'No configurado'}</p></div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={saving}>{saving ? 'Guardando…' : 'Guardar Mercado Pago'}</Button>
            {config && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Origen actual: {config.source === 'database' ? 'panel admin' : 'variables de entorno'}</span>}
          </div>

          {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

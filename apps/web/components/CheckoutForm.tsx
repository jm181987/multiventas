'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, TicketPercent } from 'lucide-react';
import { authApi } from '@/lib/api';
import { money } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
  }
}

type CheckoutResult = {
  checkouts: Array<{
    orderId: string;
    preferenceId: string;
    initPoint: string;
    marketplaceFee: number;
    subtotal?: number;
    discountAmount?: number;
    total?: number;
    couponCode?: string | null;
  }>;
};

type CheckoutPreview = {
  groups: Array<{
    storeId: string;
    storeName: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    couponCode: string | null;
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
};

export function CheckoutForm() {
  const [result, setResult] = useState<CheckoutResult>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState<CheckoutPreview>();
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const readDeviceId = () => {
      if (window.MP_DEVICE_SESSION_ID) {
        setDeviceId(window.MP_DEVICE_SESSION_ID);
        return true;
      }
      return false;
    };

    if (!document.querySelector('script[data-mp-security="checkout"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.mercadopago.com/v2/security.js';
      script.async = true;
      script.setAttribute('view', 'checkout');
      script.dataset.mpSecurity = 'checkout';
      script.onload = () => readDeviceId();
      document.head.appendChild(script);
    }

    readDeviceId();
    const timer = window.setInterval(() => {
      attempts += 1;
      if (readDeviceId() || attempts >= 20) window.clearInterval(timer);
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code) {
      setCouponPreview(undefined);
      setError('');
      return;
    }

    setCheckingCoupon(true);
    setError('');
    try {
      const preview = await authApi<CheckoutPreview>('/orders/checkout/preview', {
        method: 'POST',
        body: JSON.stringify({ couponCode: code }),
      });
      setCouponPreview(preview);
    } catch (e) {
      setCouponPreview(undefined);
      setError(e instanceof Error ? e.message : 'El cupón no pudo validarse');
    } finally {
      setCheckingCoupon(false);
    }
  }

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
          couponCode: couponCode.trim() || undefined,
          deviceId: deviceId || undefined,
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
          <p className="text-sm text-muted-foreground">Mercado Pago Split 1:1 genera una transacción por vendedor. Completá cada pago:</p>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="city" placeholder="Ciudad" required />
        <Input name="department" placeholder="Departamento" required />
      </div>
      <Input name="postalCode" placeholder="Código postal" />
      <Input name="notes" placeholder="Notas de entrega" />

      <div className="rounded-xl border border-dashed bg-indigo-50/40 p-4">
        <label className="block text-sm font-semibold">
          ¿Tenés un cupón?
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <TicketPercent className="absolute left-3 top-3 size-4 text-indigo-500" />
              <Input
                className="pl-9 uppercase"
                placeholder="Ej: BIENVENIDA10"
                autoComplete="off"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''));
                  setCouponPreview(undefined);
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()}>
              {checkingCoupon ? 'Validando…' : 'Aplicar'}
            </Button>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">Si el carrito tiene varias tiendas, el código se aplica únicamente a la tienda que emitió la promoción.</p>

        {couponPreview && couponPreview.discountAmount > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4" /> Cupón aplicado</div>
            <div className="mt-2 flex items-center justify-between">
              <span>Descuento</span><strong>-{money(couponPreview.discountAmount, 'UYU')}</strong>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-emerald-200 pt-2">
              <span>Total con descuento</span><strong>{money(couponPreview.total, 'UYU')}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p>
          Pago seguro: los datos de tarjeta se ingresan directamente en Mercado Pago y nunca pasan por SeVende.
          {deviceId ? ' Protección antifraude del dispositivo activa.' : ' Preparando protección antifraude…'}
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button size="lg" disabled={loading}>{loading ? 'Preparando pago…' : 'Pagar con Mercado Pago'}</Button>
    </form>
  );
}

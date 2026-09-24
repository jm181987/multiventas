'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Download, Gift, MapPin, ShieldCheck, TicketPercent, Truck } from 'lucide-react';
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

type DeliveryType = 'SHIPPING_PAID' | 'SHIPPING_FREE' | 'PICKUP' | 'DIGITAL';

type DeliveryOption = {
  type: DeliveryType;
  fee: number;
  details?: string | null;
};

type CheckoutResult = {
  checkouts: Array<{
    orderId: string;
    preferenceId: string;
    initPoint: string;
    marketplaceFee: number;
    subtotal?: number;
    shippingAmount?: number;
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
    shippingAmount: number;
    discountAmount: number;
    total: number;
    couponCode: string | null;
    items: Array<{
      productId: string;
      title: string;
      quantity: number;
      deliveryOptions: DeliveryOption[];
      selectedDelivery: {
        type: DeliveryType | null;
        fee: number;
        details?: string | null;
        legacy?: boolean;
        requiresSelection?: boolean;
      };
    }>;
  }>;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  requiresShippingAddress: boolean;
  requiresDeliverySelection: boolean;
};

const deliveryLabel: Record<DeliveryType, string> = {
  SHIPPING_PAID: 'Envío pago',
  SHIPPING_FREE: 'Envío gratis',
  PICKUP: 'Retiro en local',
  DIGITAL: 'Entrega digital',
};

function DeliveryIcon({ type }: { type: DeliveryType }) {
  if (type === 'SHIPPING_PAID') return <Truck className="size-4" />;
  if (type === 'SHIPPING_FREE') return <Gift className="size-4" />;
  if (type === 'PICKUP') return <MapPin className="size-4" />;
  return <Download className="size-4" />;
}

export function CheckoutForm() {
  const [result, setResult] = useState<CheckoutResult>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [preview, setPreview] = useState<CheckoutPreview>();
  const [checkingPreview, setCheckingPreview] = useState(true);
  const [deliverySelections, setDeliverySelections] = useState<Record<string, string>>({});
  const [savedAddress, setSavedAddress] = useState({ address: '', city: '', department: '', postalCode: '' });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sv-checkout-address');
      if (raw) setSavedAddress((current) => ({ ...current, ...JSON.parse(raw) }));
    } catch {}
  }, []);

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

  async function refreshPreview(code: string, selections: Record<string, string>, seedDefaults = false) {
    setCheckingPreview(true);
    setError('');
    try {
      const data = await authApi<CheckoutPreview>('/orders/checkout/preview', {
        method: 'POST',
        body: JSON.stringify({
          couponCode: code.trim() || undefined,
          deliverySelections: selections,
        }),
      });
      setPreview(data);

      if (seedDefaults) {
        const defaults: Record<string, string> = {};
        for (const group of data.groups) {
          for (const item of group.items) {
            if (item.selectedDelivery?.type) defaults[item.productId] = item.selectedDelivery.type;
          }
        }
        setDeliverySelections(defaults);
      }

      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo calcular el checkout');
      return undefined;
    } finally {
      setCheckingPreview(false);
    }
  }

  useEffect(() => {
    let remembered: Record<string, string> = {};
    try { remembered = JSON.parse(localStorage.getItem('sv-checkout-delivery') || '{}'); } catch {}
    setDeliverySelections(remembered);
    void refreshPreview('', remembered, Object.keys(remembered).length === 0);
  }, []);

  async function applyCoupon() {
    await refreshPreview(couponCode, deliverySelections);
  }

  async function changeDelivery(productId: string, type: DeliveryType) {
    const next = { ...deliverySelections, [productId]: type };
    setDeliverySelections(next);
    await refreshPreview(couponCode, next);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const shippingAddress = preview?.requiresShippingAddress ? {
        address: form.get('address'),
        city: form.get('city'),
        department: form.get('department'),
        postalCode: form.get('postalCode'),
      } : undefined;

      if (shippingAddress) {
        try { localStorage.setItem('sv-checkout-address', JSON.stringify(shippingAddress)); } catch {}
      }
      try { localStorage.setItem('sv-checkout-delivery', JSON.stringify(deliverySelections)); } catch {}

      const data = await authApi<CheckoutResult>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress,
          notes: form.get('notes'),
          couponCode: couponCode.trim() || undefined,
          deliverySelections,
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
          <p className="text-sm text-muted-foreground">Cada vendedor recibe su pago por separado. Completá cada operación:</p>
          {result.checkouts.map((checkout, index) => (
            <a key={checkout.orderId} href={checkout.initPoint} className="block">
              <Button className="w-full">Pagar orden {index + 1} · {money(checkout.total ?? 0, 'UYU')}</Button>
            </a>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Card>
        <CardHeader className="border-b">
          <h2 className="text-xl font-black">Cómo querés recibir tu compra</h2>
          <p className="text-sm text-muted-foreground">La entrega, retiro o envío digital es gestionado directamente por cada vendedor.</p>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {checkingPreview && !preview ? (
            <p className="text-sm text-muted-foreground">Cargando opciones de entrega…</p>
          ) : (
            preview?.groups.map((group) => (
              <div key={group.storeId} className="space-y-3">
                <div>
                  <p className="font-black">{group.storeName}</p>
                  <p className="text-xs text-muted-foreground">Elegí una opción para cada producto.</p>
                </div>

                {group.items.map((item) => (
                  <div key={item.productId} className="rounded-xl border bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Cantidad {item.quantity}</p>
                      </div>
                    </div>

                    {item.deliveryOptions.length ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {item.deliveryOptions.map((option) => {
                          const checked = deliverySelections[item.productId] === option.type
                            || (!deliverySelections[item.productId] && item.selectedDelivery.type === option.type);
                          return (
                            <label
                              key={option.type}
                              className={'cursor-pointer rounded-xl border p-3 transition ' + (checked ? 'border-indigo-400 bg-indigo-50' : 'bg-white hover:border-slate-300')}
                            >
                              <span className="flex items-start gap-2">
                                <input
                                  type="radio"
                                  name={'delivery-' + item.productId}
                                  checked={checked}
                                  onChange={() => void changeDelivery(item.productId, option.type)}
                                  className="mt-1"
                                />
                                <span className="min-w-0">
                                  <span className="flex items-center gap-1.5 font-bold">
                                    <DeliveryIcon type={option.type} />
                                    {deliveryLabel[option.type]}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {option.type === 'SHIPPING_PAID' ? money(option.fee, 'UYU') : 'Sin costo adicional'}
                                  </span>
                                  {option.details && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.details}</span>}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg bg-white p-3 text-sm text-muted-foreground">Entrega a coordinar con el vendedor.</p>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {preview?.requiresShippingAddress && (
        <Card>
          <CardHeader className="border-b">
            <h2 className="text-xl font-black">Dirección de envío</h2>
            <p className="text-sm text-muted-foreground">Solo se solicita porque elegiste envío para al menos un producto.</p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-5">
            <Input name="address" placeholder="Dirección" defaultValue={savedAddress.address} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="city" placeholder="Ciudad" defaultValue={savedAddress.city} required />
              <Input name="department" placeholder="Departamento" defaultValue={savedAddress.department} required />
            </div>
            <Input name="postalCode" placeholder="Código postal" defaultValue={savedAddress.postalCode} />
          </CardContent>
        </Card>
      )}

      <Input name="notes" placeholder="Notas para el vendedor" />

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
                onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              />
            </div>
            <Button type="button" variant="outline" onClick={applyCoupon} disabled={checkingPreview || !couponCode.trim()}>
              {checkingPreview ? 'Calculando…' : 'Aplicar'}
            </Button>
          </div>
        </label>

        {preview && preview.discountAmount > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4" /> Cupón aplicado</div>
            <div className="mt-2 flex items-center justify-between">
              <span>Descuento</span><strong>-{money(preview.discountAmount, 'UYU')}</strong>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <Card>
          <CardContent className="space-y-2 pt-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Productos</span><span>{money(preview.subtotal, 'UYU')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>{preview.shippingAmount > 0 ? money(preview.shippingAmount, 'UYU') : 'Sin costo'}</span></div>
            {preview.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Descuento</span><span>-{money(preview.discountAmount, 'UYU')}</span></div>}
            <div className="flex justify-between border-t pt-3 text-lg font-black"><span>Total</span><span>{money(preview.total, 'UYU')}</span></div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p>
          Pago seguro: los datos de tarjeta se ingresan directamente en Mercado Pago. SeVende facilita la compra, pero no presta ni gestiona el servicio logístico.
          {deviceId ? ' Protección antifraude del dispositivo activa.' : ' Preparando protección antifraude…'}
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {preview?.requiresDeliverySelection && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          Elegí una forma de entrega para todos los productos antes de continuar.
        </p>
      )}

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur">
        {preview && <div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Total a pagar</span><strong className="text-lg">{money(preview.total, 'UYU')}</strong></div>}
        <Button className="w-full" size="lg" disabled={loading || checkingPreview || !preview || preview.requiresDeliverySelection}>
          {loading ? 'Preparando pago…' : 'Pagar con Mercado Pago'}
        </Button>
      </div>
    </form>
  );
}

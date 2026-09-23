'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Copy, Percent, Plus, Store, Tag, Trash2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type StoreOption = { id: string; name: string; slug: string };
type Promotion = {
  id: string;
  storeId: string;
  name: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number | string;
  minOrderAmount: number | string;
  maxDiscountAmount: number | string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  isActive: boolean;
  uses: number;
  store: StoreOption;
};

const initialForm = {
  storeId: '',
  name: '',
  code: '',
  type: 'PERCENT' as 'PERCENT' | 'FIXED',
  value: '10',
  minOrderAmount: '0',
  maxDiscountAmount: '',
  startsAt: '',
  endsAt: '',
  maxUses: '',
};

export function PromotionsManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const stores = useQuery({
    queryKey: ['vendor-stores'],
    queryFn: () => authApi<StoreOption[]>('/vendor/stores'),
  });
  const promotions = useQuery({
    queryKey: ['vendor-promotions'],
    queryFn: () => authApi<Promotion[]>('/vendor/promotions'),
  });

  const firstStore = stores.data?.[0]?.id ?? '';
  const selectedStore = form.storeId || firstStore;

  const create = useMutation({
    mutationFn: () => authApi('/vendor/promotions', {
      method: 'POST',
      body: JSON.stringify({
        storeId: selectedStore,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount || 0),
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      }),
    }),
    onSuccess: () => {
      setForm({ ...initialForm, storeId: selectedStore });
      setError('');
      qc.invalidateQueries({ queryKey: ['vendor-promotions'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo crear la promoción'),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authApi('/vendor/promotions/' + id, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-promotions'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => authApi('/vendor/promotions/' + id, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-promotions'] }),
  });

  const activeCount = useMemo(() => (promotions.data ?? []).filter((item) => item.isActive).length, [promotions.data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!selectedStore) return setError('Necesitás una tienda antes de crear promociones.');
    create.mutate();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(''), 1200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-[#6366F1]">Crecimiento</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Promociones y cupones</h1>
          <p className="mt-1 text-muted-foreground">Creá códigos para impulsar conversiones sin tocar el precio base de tus productos.</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-sm">
          <span className="text-muted-foreground">Activas</span>
          <span className="ml-2 text-xl font-black text-[#10B981]">{activeCount}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit">
          <CardHeader className="border-b bg-slate-50/60">
            <h2 className="text-xl font-black">Nueva promoción</h2>
            <p className="text-sm text-muted-foreground">El cliente ingresa el código durante el checkout.</p>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-1 text-sm font-medium">
                Tienda
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedStore}
                  onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                  required
                >
                  {(stores.data ?? []).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>

              <label className="block space-y-1 text-sm font-medium">
                Nombre interno
                <Input placeholder="Ej: Lanzamiento septiembre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>

              <label className="block space-y-1 text-sm font-medium">
                Código
                <Input
                  placeholder="BIENVENIDA10"
                  className="uppercase"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.replace(/s/g, '').toUpperCase() })}
                  required
                />
              </label>

              <div className="grid grid-cols-[1fr_120px] gap-3">
                <label className="space-y-1 text-sm font-medium">
                  Tipo
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENT' | 'FIXED' })}>
                    <option value="PERCENT">Porcentaje</option>
                    <option value="FIXED">Monto fijo</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  {form.type === 'PERCENT' ? 'Descuento %' : 'Monto'}
                  <Input type="number" min="0.01" max={form.type === 'PERCENT' ? '100' : undefined} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="space-y-1 text-sm font-medium">
                  Compra mínima
                  <Input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Tope de descuento
                  <Input type="number" min="0" step="0.01" placeholder="Sin tope" value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="space-y-1 text-sm font-medium">
                  Inicio
                  <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Fin
                  <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </label>
              </div>

              <label className="block space-y-1 text-sm font-medium">
                Límite de usos
                <Input type="number" min="1" placeholder="Ilimitado" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              </label>

              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Button className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110" disabled={create.isPending || !selectedStore}>
                <Plus className="mr-2 size-4" /> {create.isPending ? 'Creando…' : 'Crear promoción'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {promotions.isLoading ? (
            <Card><CardContent className="p-8 text-sm text-muted-foreground">Cargando promociones…</CardContent></Card>
          ) : !(promotions.data ?? []).length ? (
            <Card><CardContent className="grid place-items-center gap-3 p-12 text-center"><Tag className="size-10 text-muted-foreground" /><div><p className="font-bold">Todavía no creaste cupones</p><p className="text-sm text-muted-foreground">Tu primera promoción aparecerá acá.</p></div></CardContent></Card>
          ) : (
            (promotions.data ?? []).map((promotion) => {
              const value = promotion.type === 'PERCENT' ? Number(promotion.value) + '%' : '$ ' + Number(promotion.value).toFixed(2);
              const expired = promotion.endsAt ? new Date(promotion.endsAt).getTime() <= Date.now() : false;
              const exhausted = promotion.maxUses ? promotion.uses >= promotion.maxUses : false;
              const effective = promotion.isActive && !expired && !exhausted;
              return (
                <Card key={promotion.id} className="overflow-hidden">
                  <div className={'h-1.5 ' + (effective ? 'bg-[#10B981]' : 'bg-slate-300')} />
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-black">{promotion.name}</h3>
                          <Badge>{effective ? 'Activa' : expired ? 'Vencida' : exhausted ? 'Agotada' : 'Pausada'}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Store className="size-3.5" /> {promotion.store.name}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1"><Percent className="size-3.5" /> {value}</span>
                          <span>·</span>
                          <span>{promotion.uses}{promotion.maxUses ? ' / ' + promotion.maxUses : ''} usos</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggle.mutate({ id: promotion.id, isActive: !promotion.isActive })}>
                          {promotion.isActive ? 'Pausar' : 'Activar'}
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { if (confirm('¿Eliminar esta promoción?')) remove.mutate(promotion.id); }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyCode(promotion.code)}
                      className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
                    >
                      <div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código</p><p className="font-mono text-lg font-black tracking-wider">{promotion.code}</p></div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"><Copy className="size-3.5" /> {copied === promotion.code ? 'Copiado' : 'Copiar'}</span>
                    </button>

                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold text-slate-900">Compra mínima</p><p>$ {Number(promotion.minOrderAmount).toFixed(2)}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold text-slate-900">Tope</p><p>{promotion.maxDiscountAmount ? '$ ' + Number(promotion.maxDiscountAmount).toFixed(2) : 'Sin tope'}</p></div>
                      <div className="rounded-lg bg-slate-50 p-3"><p className="font-semibold text-slate-900">Vigencia</p><p className="inline-flex items-center gap-1"><CalendarClock className="size-3" /> {promotion.endsAt ? new Date(promotion.endsAt).toLocaleDateString('es-UY') : 'Sin vencimiento'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

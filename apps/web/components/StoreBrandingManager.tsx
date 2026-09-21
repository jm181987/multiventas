'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, ImagePlus, Palette, Save, Store as StoreIcon, Trash2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Store } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type EditableStore = Store & {
  description?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  primaryColor?: string | null;
};

export function StoreBrandingManager() {
  const [stores, setStores] = useState<EditableStore[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#111827');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(() => stores.find((store) => store.id === selectedId) ?? stores[0], [selectedId, stores]);

  async function loadStores(preferredId?: string) {
    const data = await authApi<EditableStore[]>('/vendor/stores');
    setStores(data);
    const nextId = preferredId && data.some((store) => store.id === preferredId) ? preferredId : data[0]?.id ?? '';
    setSelectedId(nextId);
    return data.find((store) => store.id === nextId) ?? data[0];
  }

  useEffect(() => {
    loadStores()
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la tienda'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name ?? '');
    setDescription(selected.description ?? '');
    setPrimaryColor(selected.primaryColor || '#111827');
    setMessage('');
    setError('');
  }, [selected?.id, selected?.name, selected?.description, selected?.primaryColor]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await authApi(`/vendor/stores/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          primaryColor,
        }),
      });
      await loadStores(selected.id);
      setMessage('Identidad visual guardada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la tienda');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAsset(kind: 'logo' | 'cover', file?: File) {
    if (!selected || !file) return;
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida.');
    setUploading(kind);
    setMessage('');
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      await authApi(`/vendor/stores/${selected.id}/${kind}`, { method: 'PATCH', body });
      await loadStores(selected.id);
      setMessage(kind === 'logo' ? 'Logo actualizado.' : 'Portada actualizada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(null);
    }
  }

  async function removeAsset(kind: 'logo' | 'cover') {
    if (!selected) return;
    setUploading(kind);
    setMessage('');
    setError('');
    try {
      await authApi(`/vendor/stores/${selected.id}/${kind}/remove`, { method: 'POST' });
      await loadStores(selected.id);
      setMessage(kind === 'logo' ? 'Logo eliminado.' : 'Portada eliminada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la imagen');
    } finally {
      setUploading(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando configuración…</p>;
  if (!stores.length) return <Card><CardContent className="p-8">Todavía no tienes una tienda creada.</CardContent></Card>;
  if (!selected) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Marca</p>
        <h1 className="text-3xl font-black tracking-tight">Identidad visual</h1>
        <p className="mt-1 text-muted-foreground">Personaliza cómo se ve cada una de tus tiendas.</p>
      </div>

      {stores.length > 1 && (
        <label className="block max-w-md space-y-1 text-sm font-medium">
          Tienda
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selected.id} onChange={(e) => setSelectedId(e.target.value)}>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
      )}

      <Card className="overflow-hidden">
        <div className="relative h-52 bg-muted" style={{ backgroundColor: primaryColor }}>
          {selected.coverUrl && <img src={selected.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-5 text-white">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white text-zinc-900 shadow-lg">
              {selected.logoUrl ? <img src={selected.logoUrl} alt={name || selected.name} className="h-full w-full object-cover" /> : <StoreIcon className="size-9" />}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black">{name || selected.name}</h2>
              <p className="line-clamp-2 text-sm text-white/85">{description || 'Tu descripción aparecerá aquí.'}</p>
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Vista previa de la cabecera pública de tu tienda.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Datos y color</h2></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <label className="block space-y-1 text-sm font-medium">Nombre de la tienda
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="block space-y-1 text-sm font-medium">Descripción
                <textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <div className="space-y-1">
                <p className="text-sm font-medium">Color principal</p>
                <div className="flex items-center gap-3">
                  <input type="color" className="h-11 w-16 cursor-pointer rounded border bg-transparent p-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <div className="relative flex-1">
                    <Palette className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input className="pl-9 uppercase" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} pattern="#[0-9A-Fa-f]{6}" />
                  </div>
                </div>
              </div>
              {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Button disabled={saving}><Save className="mr-2 size-4" />{saving ? 'Guardando…' : 'Guardar identidad'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-xl font-bold">Logo y portada</h2></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div><p className="font-semibold">Logo</p><p className="text-xs text-muted-foreground">Recomendado: imagen cuadrada, hasta 5 MB.</p></div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <Camera className="size-4" /> {uploading === 'logo' ? 'Subiendo…' : 'Subir logo'}
                  <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => uploadAsset('logo', e.target.files?.[0])} />
                </label>
                {selected.logoUrl && <Button type="button" variant="ghost" className="text-red-600" disabled={!!uploading} onClick={() => removeAsset('logo')}><Trash2 className="mr-2 size-4" /> Quitar</Button>}
              </div>
            </div>

            <div className="border-t pt-6 space-y-3">
              <div><p className="font-semibold">Portada</p><p className="text-xs text-muted-foreground">Recomendado: formato horizontal, hasta 8 MB.</p></div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <ImagePlus className="size-4" /> {uploading === 'cover' ? 'Subiendo…' : 'Subir portada'}
                  <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => uploadAsset('cover', e.target.files?.[0])} />
                </label>
                {selected.coverUrl && <Button type="button" variant="ghost" className="text-red-600" disabled={!!uploading} onClick={() => removeAsset('cover')}><Trash2 className="mr-2 size-4" /> Quitar</Button>}
              </div>
            </div>

            <a href={`/tienda/${selected.slug}`} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold underline">Ver tienda pública</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

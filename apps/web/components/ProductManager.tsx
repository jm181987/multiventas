'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Boxes, Download, Gift, ImagePlus, MapPin, PackagePlus, Pencil, Search, Trash2, Truck, X } from 'lucide-react';
import { authApi, publicApi } from '@/lib/api';
import { Product, ProductImage, Store } from '@/lib/types';
import { money } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type VendorProduct = Product & { storeId: string; status: ProductStatus; store: Store };
type CategoryNode = { id: string; name: string; slug: string; children?: CategoryNode[] };

type FormState = {
  storeId: string;
  categoryId: string;
  sku: string;
  slug: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  stock: string;
  status: ProductStatus;
  shippingPaid: boolean;
  shippingFee: string;
  shippingPaidDetails: string;
  shippingFree: boolean;
  shippingFreeDetails: string;
  pickup: boolean;
  pickupDetails: string;
  digital: boolean;
  digitalDetails: string;
};

const emptyForm: FormState = {
  storeId: '',
  categoryId: '',
  sku: '',
  slug: '',
  title: '',
  description: '',
  price: '',
  currency: 'UYU',
  stock: '0',
  status: 'DRAFT',
  shippingPaid: false,
  shippingFee: '',
  shippingPaidDetails: '',
  shippingFree: false,
  shippingFreeDetails: '',
  pickup: false,
  pickupDetails: '',
  digital: false,
  digitalDetails: '',
};

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function flattenCategories(nodes: CategoryNode[], prefix = ''): Array<{ id: string; name: string }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: `${prefix}${node.name}` },
    ...flattenCategories(node.children ?? [], `${prefix}— `),
  ]);
}

function statusLabel(status: ProductStatus) {
  if (status === 'ACTIVE') return 'Publicado';
  if (status === 'ARCHIVED') return 'Archivado';
  return 'Borrador';
}

function ProductImages({ product, onChanged }: { product: VendorProduct; onChanged: () => void }) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function addUrl(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    try {
      await authApi(`/vendor/products/${product.id}/images`, {
        method: 'POST',
        body: JSON.stringify({ url: url.trim(), alt: alt.trim() || product.title }),
      });
      setUrl('');
      setAlt('');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar la imagen');
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Selecciona un archivo de imagen');
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('alt', product.title);
      await authApi(`/vendor/products/${product.id}/images/upload`, { method: 'POST', body });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  async function remove(image: ProductImage) {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await authApi(`/vendor/products/${product.id}/images/${image.id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la imagen');
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <h3 className="font-bold">Imágenes</h3>
        <p className="text-xs text-muted-foreground">Sube imágenes o agrega una URL externa.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {product.images?.map((image) => (
          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-white">
            <img src={image.url} alt={image.alt ?? product.title} className="h-full w-full object-cover" />
            <button type="button" className="absolute right-2 top-2 rounded-md bg-white/90 p-2 shadow" onClick={() => remove(image)} aria-label="Eliminar imagen">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!product.images?.length && <div className="grid aspect-square place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">Sin imágenes</div>}
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-semibold hover:bg-muted">
        <ImagePlus className="size-4" /> {uploading ? 'Subiendo…' : 'Subir imagen'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      <form onSubmit={addUrl} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://.../imagen.jpg" />
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Texto alternativo" />
        <Button type="submit" variant="outline">Agregar URL</Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ProductManager() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ['vendor-products'], queryFn: () => authApi<VendorProduct[]>('/vendor/products') });
  const stores = useQuery({ queryKey: ['vendor-stores'], queryFn: () => authApi<Store[]>('/vendor/stores') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => publicApi<CategoryNode[]>('/categories') });

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ProductStatus>('ALL');
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const categoryOptions = useMemo(() => flattenCategories(categories.data ?? []), [categories.data]);
  const selected = editingId && editingId !== 'new' ? products.data?.find((product) => product.id === editingId) : undefined;

  useEffect(() => {
    if (editingId === 'new') {
      setForm({ ...emptyForm, storeId: stores.data?.[0]?.id ?? '' });
      setSlugTouched(false);
      setError('');
      return;
    }
    if (selected) {
      setForm({
        storeId: selected.storeId ?? selected.store.id,
        categoryId: selected.category?.id ?? selected.categoryId ?? '',
        sku: selected.sku ?? '',
        slug: selected.slug,
        title: selected.title,
        description: selected.description ?? '',
        price: String(selected.price),
        currency: selected.currency ?? 'UYU',
        stock: String(selected.stock),
        status: selected.status,
        shippingPaid: Boolean(selected.deliveryOptions?.some((option) => option.type === 'SHIPPING_PAID')),
        shippingFee: String(selected.deliveryOptions?.find((option) => option.type === 'SHIPPING_PAID')?.fee ?? ''),
        shippingPaidDetails: selected.deliveryOptions?.find((option) => option.type === 'SHIPPING_PAID')?.details ?? '',
        shippingFree: Boolean(selected.deliveryOptions?.some((option) => option.type === 'SHIPPING_FREE')),
        shippingFreeDetails: selected.deliveryOptions?.find((option) => option.type === 'SHIPPING_FREE')?.details ?? '',
        pickup: Boolean(selected.deliveryOptions?.some((option) => option.type === 'PICKUP')),
        pickupDetails: selected.deliveryOptions?.find((option) => option.type === 'PICKUP')?.details ?? '',
        digital: Boolean(selected.deliveryOptions?.some((option) => option.type === 'DIGITAL')),
        digitalDetails: selected.deliveryOptions?.find((option) => option.type === 'DIGITAL')?.details ?? '',
      });
      setSlugTouched(true);
      setError('');
    }
  }, [editingId, selected, stores.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const deliveryOptions = [
        ...(form.shippingPaid ? [{ type: 'SHIPPING_PAID', fee: Number(form.shippingFee), details: form.shippingPaidDetails.trim() || undefined }] : []),
        ...(form.shippingFree ? [{ type: 'SHIPPING_FREE', fee: 0, details: form.shippingFreeDetails.trim() || undefined }] : []),
        ...(form.pickup ? [{ type: 'PICKUP', fee: 0, details: form.pickupDetails.trim() || undefined }] : []),
        ...(form.digital ? [{ type: 'DIGITAL', fee: 0, details: form.digitalDetails.trim() || undefined }] : []),
      ];
      const payload = {
        storeId: form.storeId,
        categoryId: form.categoryId || undefined,
        sku: form.sku.trim() || undefined,
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        currency: form.currency,
        stock: Number(form.stock),
        status: form.status,
        deliveryOptions,
      };
      if (editingId === 'new') {
        const { status: _status, ...createPayload } = payload;
        return authApi<VendorProduct>('/vendor/products', { method: 'POST', body: JSON.stringify(createPayload) });
      }
      if (!editingId) throw new Error('No hay producto seleccionado');
      const { storeId: _storeId, currency: _currency, ...updatePayload } = payload;
      return authApi<VendorProduct>(`/vendor/products/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updatePayload,
          categoryId: form.categoryId || null,
          sku: form.sku.trim() || null,
          description: form.description.trim() || null,
        }),
      });
    },
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['vendor-products'] });
      setEditingId(saved.id);
      setError('');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar el producto'),
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      authApi(`/vendor/products/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-products'] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => authApi(`/vendor/products/${id}/archive`, { method: 'POST' }),
    onSuccess: async () => {
      setEditingId(null);
      await qc.invalidateQueries({ queryKey: ['vendor-products'] });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data ?? []).filter((product) => {
      const matchesSearch = !q || product.title.toLowerCase().includes(q) || product.sku?.toLowerCase().includes(q) || product.slug.toLowerCase().includes(q);
      return matchesSearch && (filterStatus === 'ALL' || product.status === filterStatus);
    });
  }, [filterStatus, products.data, search]);

  const counts = useMemo(() => ({
    all: products.data?.length ?? 0,
    active: products.data?.filter((p) => p.status === 'ACTIVE').length ?? 0,
    draft: products.data?.filter((p) => p.status === 'DRAFT').length ?? 0,
    stock: products.data?.reduce((sum, p) => sum + p.stock, 0) ?? 0,
  }), [products.data]);

  function updateTitle(title: string) {
    setForm((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.storeId) return setError('Primero necesitas una tienda.');
    if (!form.title.trim()) return setError('Ingresa un nombre para el producto.');
    if (!form.slug.trim()) return setError('Ingresa un slug válido.');
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) return setError('Ingresa un precio válido.');
    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) return setError('Ingresa un stock válido.');
    if (![form.shippingPaid, form.shippingFree, form.pickup, form.digital].some(Boolean)) {
      return setError('Seleccioná al menos una forma de entrega.');
    }
    if (form.shippingPaid && (!Number.isFinite(Number(form.shippingFee)) || Number(form.shippingFee) <= 0)) {
      return setError('Ingresá un costo válido para el envío pago.');
    }
    if (form.pickup && !form.pickupDetails.trim()) {
      return setError('Indicá la dirección o instrucciones para el retiro en local.');
    }
    if (form.digital && !form.digitalDetails.trim()) {
      return setError('Indicá cómo se realizará la entrega digital.');
    }
    saveMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Catálogo</p>
          <h1 className="text-3xl font-black tracking-tight">Gestión de productos</h1>
          <p className="mt-1 text-muted-foreground">Crea, publica y controla precio, stock e imágenes desde un solo lugar.</p>
        </div>
        <Button onClick={() => setEditingId('new')}><PackagePlus className="mr-2 size-4" /> Nuevo producto</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total', counts.all], ['Publicados', counts.active], ['Borradores', counts.draft], ['Unidades en stock', counts.stock],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></CardContent></Card>
        ))}
      </div>

      {editingId && (
        <Card className="overflow-hidden border-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
            <div><h2 className="text-xl font-black">{editingId === 'new' ? 'Nuevo producto' : 'Editar producto'}</h2><p className="text-sm text-muted-foreground">{editingId === 'new' ? 'Completa los datos básicos. Podrás agregar imágenes después de guardar.' : selected?.title}</p></div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="size-4" /></Button>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">Nombre<Input value={form.title} onChange={(e) => updateTitle(e.target.value)} required /></label>
                <label className="space-y-1 text-sm font-medium">Slug<Input value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: slugify(e.target.value) }); }} required /></label>
                <label className="space-y-1 text-sm font-medium">SKU<Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" /></label>
                <label className="space-y-1 text-sm font-medium">Tienda
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} disabled={editingId !== 'new'}>
                    <option value="">Selecciona una tienda</option>{(stores.data ?? []).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">Categoría
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Sin categoría</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">Estado
                  <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>
                    <option value="DRAFT">Borrador</option><option value="ACTIVE">Publicado</option><option value="ARCHIVED">Archivado</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">Precio
                  <div className="flex gap-2"><Input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={editingId !== 'new'}><option value="UYU">UYU</option><option value="USD">USD</option></select></div>
                </label>
                <label className="space-y-1 text-sm font-medium">Stock<Input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
              </div>
              <label className="block space-y-1 text-sm font-medium">Descripción<textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>

              <div className="space-y-3 rounded-2xl border bg-slate-50/60 p-4">
                <div>
                  <h3 className="font-black">Formas de entrega</h3>
                  <p className="text-xs text-muted-foreground">SeVende cobra el importe configurado, pero la entrega es gestionada por tu tienda. Podés activar más de una opción.</p>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="rounded-xl border bg-white p-4">
                    <span className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.shippingPaid} onChange={(e) => setForm({ ...form, shippingPaid: e.target.checked })} /><Truck className="size-4 text-indigo-600" /> Envío pago</span>
                    {form.shippingPaid && <div className="mt-3 space-y-2"><Input type="number" min="0.01" step="0.01" placeholder="Costo fijo de envío" value={form.shippingFee} onChange={(e) => setForm({ ...form, shippingFee: e.target.value })} /><Input placeholder="Zona o instrucciones (opcional)" value={form.shippingPaidDetails} onChange={(e) => setForm({ ...form, shippingPaidDetails: e.target.value })} /></div>}
                  </label>

                  <label className="rounded-xl border bg-white p-4">
                    <span className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.shippingFree} onChange={(e) => setForm({ ...form, shippingFree: e.target.checked })} /><Gift className="size-4 text-emerald-600" /> Envío gratis</span>
                    {form.shippingFree && <Input className="mt-3" placeholder="Zona o condiciones (opcional)" value={form.shippingFreeDetails} onChange={(e) => setForm({ ...form, shippingFreeDetails: e.target.value })} />}
                  </label>

                  <label className="rounded-xl border bg-white p-4">
                    <span className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.checked })} /><MapPin className="size-4 text-violet-600" /> Retiro en local</span>
                    {form.pickup && <Input className="mt-3" placeholder="Dirección e instrucciones de retiro" value={form.pickupDetails} onChange={(e) => setForm({ ...form, pickupDetails: e.target.value })} />}
                  </label>

                  <label className="rounded-xl border bg-white p-4">
                    <span className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.digital} onChange={(e) => setForm({ ...form, digital: e.target.checked })} /><Download className="size-4 text-cyan-600" /> Entrega digital</span>
                    {form.digital && <Input className="mt-3" placeholder="Ej: se envía por email dentro de 24 h" value={form.digitalDetails} onChange={(e) => setForm({ ...form, digitalDetails: e.target.value })} />}
                  </label>
                </div>
              </div>

              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Guardando…' : 'Guardar producto'}</Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                {selected && <Button type="button" variant="ghost" className="ml-auto text-red-600" onClick={() => { if (confirm('¿Eliminar este producto del catálogo?')) archive.mutate(selected.id); }}><Trash2 className="mr-2 size-4" /> Eliminar</Button>}
              </div>
            </form>
            {selected && <div className="mt-6"><ProductImages product={selected} onChanged={() => qc.invalidateQueries({ queryKey: ['vendor-products'] })} /></div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU o slug…" /></div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}>
              <option value="ALL">Todos los estados</option><option value="ACTIVE">Publicados</option><option value="DRAFT">Borradores</option><option value="ARCHIVED">Archivados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando productos…</div> : products.error ? <div className="p-8 text-sm text-red-600">{String(products.error)}</div> : !filtered.length ? (
            <div className="grid place-items-center gap-3 p-12 text-center"><Boxes className="size-10 text-muted-foreground" /><div><p className="font-bold">No hay productos para mostrar</p><p className="text-sm text-muted-foreground">Crea tu primer producto o cambia los filtros.</p></div><Button onClick={() => setEditingId('new')}>Crear producto</Button></div>
          ) : (
            <div className="divide-y">
              {filtered.map((product) => (
                <div key={product.id} className="grid gap-4 p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center">
                  <div className="size-16 overflow-hidden rounded-lg border bg-muted">{product.images?.[0] ? <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">Sin foto</div>}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{product.title}</p><Badge>{statusLabel(product.status)}</Badge>{product.stock === 0 && <Badge>Sin stock</Badge>}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{product.store?.name} · {product.sku || 'Sin SKU'} · Stock {product.stock}</p>
                    <p className="mt-1 font-black">{money(Number(product.price), product.currency)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(product.id)}><Pencil className="mr-1 size-4" /> Editar</Button>
                    {product.status === 'ACTIVE' ? <Button variant="ghost" size="sm" onClick={() => quickStatus.mutate({ id: product.id, status: 'DRAFT' })}><Archive className="mr-1 size-4" /> Pausar</Button> : <Button size="sm" onClick={() => quickStatus.mutate({ id: product.id, status: 'ACTIVE' })}>Publicar</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

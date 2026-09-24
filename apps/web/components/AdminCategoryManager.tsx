'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, X } from 'lucide-react';
import { authApi, publicApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type CategoryNode = { id: string; name: string; slug: string; sortOrder: number; isActive: boolean; parentId?: string | null; children?: CategoryNode[] };
type FlatCategory = CategoryNode & { depth: number };

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function flatten(nodes: CategoryNode[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [{ ...node, depth }, ...flatten(node.children ?? [], depth + 1)]);
}

export function AdminCategoryManager() {
  const qc = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => publicApi<CategoryNode[]>('/categories') });
  const flat = useMemo(() => flatten(categories.data ?? []), [categories.data]);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');

  function reset() { setEditing(null); setCreating(false); setName(''); setSlug(''); setParentId(''); setSortOrder('0'); setIsActive(true); setError(''); }
  function startCreate(parent = '') { reset(); setCreating(true); setParentId(parent); }
  function startEdit(category: CategoryNode) { setCreating(false); setEditing(category); setName(category.name); setSlug(category.slug); setParentId(category.parentId ?? ''); setSortOrder(String(category.sortOrder ?? 0)); setIsActive(category.isActive); setError(''); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name: name.trim(), slug: slug.trim(), parentId: parentId || undefined, sortOrder: Number(sortOrder) || 0, isActive };
      if (editing) return authApi(`/admin/categories/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      return authApi('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['categories'] }); reset(); },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo guardar la categoría'),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Ingresá un nombre.');
    if (!slug.trim()) return setError('Ingresá un slug.');
    save.mutate();
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Catálogo</p><h1 className="text-3xl font-black tracking-tight">Categorías</h1><p className="mt-1 text-muted-foreground">Organizá las categorías y subcategorías disponibles para los productos.</p></div>
      <Button onClick={() => startCreate()}><Plus className="mr-2 size-4" /> Nueva categoría</Button>
    </div>

    {(creating || editing) && <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between border-b"><div><h2 className="text-xl font-black">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2><p className="text-sm text-muted-foreground">Podés crear categorías principales o elegir una categoría padre.</p></div><Button type="button" variant="ghost" size="sm" onClick={reset}><X className="size-4" /></Button></CardHeader>
      <CardContent className="pt-6"><form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Nombre<Input value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} /></label>
          <label className="space-y-1 text-sm font-medium">Slug<Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></label>
          <label className="space-y-1 text-sm font-medium">Categoría padre<select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Categoría principal</option>{flat.filter((c) => c.id !== editing?.id).map((c) => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}</select></label>
          <label className="space-y-1 text-sm font-medium">Orden<Input type="number" min="0" step="1" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></label>
        </div>
        {editing && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Categoría activa</label>}
        {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar categoría'}</Button><Button type="button" variant="outline" onClick={reset}>Cancelar</Button></div>
      </form></CardContent>
    </Card>}

    <Card><CardHeader className="border-b"><h2 className="font-black">Estructura del catálogo</h2></CardHeader><CardContent className="p-0">
      {categories.isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando categorías…</p> : categories.error ? <p className="p-6 text-sm text-red-600">No se pudieron cargar las categorías.</p> : !flat.length ? <div className="grid place-items-center gap-3 p-10 text-center"><Tags className="size-10 text-muted-foreground" /><p className="font-bold">Todavía no hay categorías</p><Button onClick={() => startCreate()}>Crear la primera</Button></div> :
      <div className="divide-y">{flat.map((category) => <div key={category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" style={{ paddingLeft: `${16 + category.depth * 24}px` }}><div><p className="font-bold">{category.name}</p><p className="text-xs text-muted-foreground">/{category.slug} · Orden {category.sortOrder ?? 0}{category.depth ? ' · Subcategoría' : ' · Principal'}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => startCreate(category.id)}><Plus className="mr-1 size-4" /> Subcategoría</Button><Button size="sm" variant="ghost" onClick={() => startEdit(category)}><Pencil className="mr-1 size-4" /> Editar</Button></div></div>)}</div>}
    </CardContent></Card>
  </div>;
}

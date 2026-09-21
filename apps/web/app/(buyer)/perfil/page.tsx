'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Mail, Phone, Save, ShieldCheck, Trash2, UserCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthSession } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ProfileData = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  roles: string[];
  status: string;
  createdAt: string;
};

export default function ProfilePage() {
  const { user, loading: sessionLoading, restore } = useAuthSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadProfile() {
    const data = await authApi<ProfileData>('/users/me');
    setProfile(data);
    setName(data.name ?? '');
    setPhone(data.phone ?? '');
    return data;
  }

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace('/login?next=/perfil');
      return;
    }
    let active = true;
    loadProfile()
      .catch((e) => active && setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [router, sessionLoading, user]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await authApi('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      await loadProfile();
      await restore();
      setMessage('Perfil actualizado correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Selecciona una imagen válida.');
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      await authApi('/users/me/avatar', { method: 'PATCH', body });
      await loadProfile();
      await restore();
      setMessage('Foto de perfil actualizada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setError('');
    try {
      await authApi('/users/me/avatar', { method: 'DELETE' });
      await loadProfile();
      await restore();
      setMessage('Foto de perfil eliminada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar la foto');
    } finally {
      setUploading(false);
    }
  }

  if (sessionLoading || loading) {
    return <main className="mx-auto max-w-4xl px-4 py-10"><p className="text-sm text-muted-foreground">Cargando tu perfil…</p></main>;
  }
  if (!user || !profile) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cuenta</p>
        <h1 className="text-3xl font-black tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-muted-foreground">Personaliza tus datos y tu foto de perfil.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader><h2 className="text-xl font-bold">Datos personales</h2></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block space-y-1 text-sm font-medium">Nombre
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label className="block space-y-1 text-sm font-medium">Email
                <div className="relative">
                  <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input className="pl-9" value={profile.email} disabled />
                </div>
              </label>
              <label className="block space-y-1 text-sm font-medium">Teléfono
                <div className="relative">
                  <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+598..." />
                </div>
              </label>
              {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
              {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <Button disabled={saving}><Save className="mr-2 size-4" />{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><h2 className="text-lg font-bold">Foto de perfil</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="mx-auto size-32 overflow-hidden rounded-full border bg-muted">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center"><UserCircle className="size-16 text-muted-foreground" /></div>
              )}
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted">
              <Camera className="size-4" /> {uploading ? 'Subiendo…' : 'Cambiar foto'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            </label>
            {profile.avatarUrl && (
              <Button type="button" variant="ghost" className="w-full text-red-600" disabled={uploading} onClick={removeAvatar}>
                <Trash2 className="mr-2 size-4" /> Eliminar foto
              </Button>
            )}
            <div className="border-t pt-4">
              <p className="font-bold">{profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">{profile.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4" /> Cuenta {profile.status === 'ACTIVE' ? 'activa' : profile.status.toLowerCase()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

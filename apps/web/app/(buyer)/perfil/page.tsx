'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Save, ShieldCheck, UserCircle } from 'lucide-react';
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace('/login?next=/perfil');
      return;
    }

    let active = true;
    authApi<ProfileData>('/users/me')
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setName(data.name ?? '');
        setPhone(data.phone ?? '');
      })
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
      const refreshed = await authApi<ProfileData>('/users/me');
      setProfile(refreshed);
      setName(refreshed.name ?? '');
      setPhone(refreshed.phone ?? '');
      await restore();
      setMessage('Perfil actualizado correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
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
        <p className="mt-1 text-muted-foreground">Tus datos personales y acceso al marketplace.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
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
          <CardHeader><div className="grid size-12 place-items-center rounded-full bg-muted"><UserCircle className="size-7" /></div></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="font-bold">{profile.name}</p><p className="text-sm text-muted-foreground">{profile.email}</p></div>
            <div className="flex flex-wrap gap-2">{profile.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="size-4" /> Cuenta {profile.status === 'ACTIVE' ? 'activa' : profile.status.toLowerCase()}</div>
            <p className="text-xs text-muted-foreground">Miembro desde {new Date(profile.createdAt).toLocaleDateString('es-UY')}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

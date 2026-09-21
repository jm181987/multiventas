'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveAuth } from '@/lib/api';
import { useAuthSession } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function safeNext(value?: string) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const [error, setError] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const { user, loading } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const requested = safeNext(searchParams.next);
      router.replace(requested ?? (user.roles.includes('ADMIN') ? '/admin' : user.roles.includes('VENDOR') ? '/vendor' : '/'));
    }
  }, [loading, router, searchParams.next, user]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoadingSubmit(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? 'Email o contraseña incorrectos' : 'No se pudo iniciar sesión');
        return;
      }
      const data = await res.json();
      saveAuth(data);
      const requested = safeNext(searchParams.next);
      location.href = requested ?? (data.user.roles.includes('ADMIN') ? '/admin' : data.user.roles.includes('VENDOR') ? '/vendor' : '/');
    } catch {
      setError('No se pudo conectar con el servidor. Intenta nuevamente.');
    } finally {
      setLoadingSubmit(false);
    }
  }

  if (loading || user) {
    return <main className="grid min-h-[calc(100vh-4rem)] place-items-center"><p className="text-sm text-muted-foreground">Restaurando tu sesión…</p></main>;
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-md"><CardHeader><h1 className="text-2xl font-black">Ingresar</h1><p className="text-sm text-muted-foreground">Tu sesión se mantendrá iniciada en este dispositivo.</p></CardHeader><CardContent>
        <form onSubmit={submit} className="space-y-4"><Input name="email" type="email" placeholder="Email" required /><Input name="password" type="password" placeholder="Contraseña" required />{error && <p className="text-sm text-red-600">{error}</p>}<Button className="w-full" disabled={loadingSubmit}>{loadingSubmit ? 'Ingresando…' : 'Ingresar'}</Button></form>
        <p className="mt-5 text-sm text-muted-foreground">¿No tenés cuenta? <Link href="/registro" className="font-semibold text-foreground">Registrate</Link></p>
      </CardContent></Card>
    </main>
  );
}

'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
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
      location.href = data.user.roles.includes('ADMIN') ? '/admin' : data.user.roles.includes('VENDOR') ? '/vendor' : '/';
    } catch {
      setError('No se pudo conectar con el servidor. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-muted/40 px-4">
      <Card className="w-full max-w-md"><CardHeader><h1 className="text-2xl font-black">Ingresar</h1></CardHeader><CardContent>
        <form onSubmit={submit} className="space-y-4"><Input name="email" type="email" placeholder="Email" required /><Input name="password" type="password" placeholder="Contraseña" required />{error && <p className="text-sm text-red-600">{error}</p>}<Button className="w-full" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</Button></form>
        <p className="mt-5 text-sm text-muted-foreground">¿No tenés cuenta? <Link href="/registro" className="font-semibold text-foreground">Registrate</Link></p>
      </CardContent></Card>
    </main>
  );
}

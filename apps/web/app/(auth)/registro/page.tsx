'use client';

import { FormEvent, useState } from 'react';
import { saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function RegisterPage({ searchParams }: { searchParams: { tipo?: string } }) {
  const [vendor, setVendor] = useState(searchParams.tipo === 'vendedor');
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: any = { email: form.get('email'), password: form.get('password'), name: form.get('name') };
    if (vendor) Object.assign(body, { businessName: form.get('businessName'), storeName: form.get('storeName'), storeSlug: form.get('storeSlug') });
    const res = await fetch(`${API}/auth/register/${vendor ? 'vendor' : 'buyer'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { setError(await res.text()); return; }
    const data = await res.json(); saveAuth(data); location.href = vendor ? '/vendor' : '/';
  }
  return <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-muted/40 px-4 py-10"><Card className="w-full max-w-lg"><CardHeader><h1 className="text-2xl font-black">Crear cuenta</h1><div className="mt-3 flex gap-2"><Button type="button" variant={!vendor ? 'default' : 'outline'} onClick={() => setVendor(false)}>Comprar</Button><Button type="button" variant={vendor ? 'default' : 'outline'} onClick={() => setVendor(true)}>Vender</Button></div></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><Input name="name" placeholder="Nombre" required /><Input name="email" type="email" placeholder="Email" required /><Input name="password" type="password" minLength={8} placeholder="Contraseña (mín. 8)" required />{vendor && <><Input name="businessName" placeholder="Razón/nombre comercial" required /><Input name="storeName" placeholder="Nombre de la tienda" required /><Input name="storeSlug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="slug-de-tienda" required /></>}{error && <p className="text-xs text-red-600">{error}</p>}<Button className="w-full">Crear cuenta</Button></form></CardContent></Card></main>;
}

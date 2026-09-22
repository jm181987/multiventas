'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, ShoppingBag, Store, UserCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/store/cart';
import { CartDrawer } from './CartDrawer';
import { useAuthSession } from '@/components/auth-provider';

export function SiteHeader() {
  const toggle = useCartUi((s) => s.toggle);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, logout } = useAuthSession();

  const links: Array<[string, string]> = [['/productos', 'Productos'], ['/tiendas', 'Tiendas']];
  if (user) links.push(['/mis-pedidos', 'Mis pedidos']);
  if (user?.roles.includes('VENDOR')) links.push(['/vendor', 'Mi tienda']);
  else if (!user) links.push(['/registro?tipo=vendedor', 'Vender']);
  if (user?.roles.includes('ADMIN')) links.push(['/admin', 'Administración']);

  async function signOut() {
    await logout();
    setMobileOpen(false);
    location.href = '/';
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight" onClick={() => setMobileOpen(false)}>
            <span className="grid size-9 place-items-center rounded-xl bg-black text-white"><Store className="size-5" /></span>
            <span>Multiventas</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-5 text-sm md:flex">
            {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>

          <Button variant="outline" size="sm" onClick={toggle} aria-label="Abrir carrito">
            <ShoppingBag className="mr-2 size-4" /> <span className="hidden sm:inline">Carrito</span>
          </Button>

          {!loading && !user && (
            <Link href="/login" className="hidden md:block"><Button size="sm">Ingresar</Button></Link>
          )}

          {!loading && user && (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/perfil" className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" /> : <UserCircle className="size-4" />}
                <span className="max-w-28 truncate">{user.name ?? user.email}</span>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label="Cerrar sesión"><LogOut className="size-4" /></Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <nav className="border-t bg-white px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col">
              {links.map(([href, label]) => (
                <Link key={href} href={href} className="py-3 text-sm font-medium" onClick={() => setMobileOpen(false)}>{label}</Link>
              ))}
              {user ? (
                <>
                  <Link href="/perfil" className="py-3 text-sm font-medium" onClick={() => setMobileOpen(false)}>Mi perfil</Link>
                  <button className="py-3 text-left text-sm font-medium text-red-600" onClick={signOut}>Cerrar sesión</button>
                </>
              ) : !loading ? (
                <Link href="/login" className="py-3 text-sm font-semibold" onClick={() => setMobileOpen(false)}>Ingresar</Link>
              ) : null}
            </div>
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}

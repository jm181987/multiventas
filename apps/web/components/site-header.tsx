'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, ShoppingBag, UserCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/store/cart';
import { CartDrawer } from './CartDrawer';
import { useAuthSession } from '@/components/auth-provider';
import { NotificationBell } from '@/components/NotificationBell';
import { InstallAppButton } from '@/components/InstallAppButton';

export function SiteHeader() {
  const toggle = useCartUi((s) => s.toggle);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, logout } = useAuthSession();
  const pathname = usePathname();
  const premiumHome = pathname === '/';

  const links: Array<[string, string]> = [['/productos', 'Productos'], ['/tiendas', 'Tiendas']];
  if (user) links.push(['/favoritos', 'Favoritos'], ['/mis-pedidos', 'Mis pedidos']);
  if (user?.roles.includes('VENDOR')) links.push(['/vendor', 'Mi tienda']);
  else if (!user) links.push(['/registro?tipo=vendedor', 'Vender']);
  if (user?.roles.includes('ADMIN')) links.push(['/admin', 'Administración']);

  async function signOut() {
    await logout();
    setMobileOpen(false);
    location.href = '/';
  }

  const headerClass = premiumHome
    ? 'border-white/[.08] bg-[#070A12]/90 text-white'
    : 'border-border bg-white/90 text-foreground';

  const navClass = premiumHome
    ? 'text-[#CBD5E1] transition hover:text-white'
    : 'transition hover:text-foreground';

  return (
    <>
      <header className={`safe-area-top sticky top-0 z-40 border-b backdrop-blur-xl ${headerClass}`}>
        <div className="mx-auto flex h-16 max-w-7xl min-w-0 items-center gap-1.5 px-3 sm:gap-3 sm:px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight" onClick={() => setMobileOpen(false)} aria-label="SeVende - Inicio">
            <img src="/knj-logo.webp" alt="KNJ" className="h-9 w-auto max-w-[92px] object-contain sm:h-11 sm:max-w-none" />
            <span className="hidden text-lg sm:inline">SeVende</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-5 text-sm md:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={navClass}>{label}</Link>
            ))}
          </nav>
          <InstallAppButton
            compact
            className={`grid size-9 shrink-0 place-items-center rounded-md border transition md:hidden ${
              premiumHome
                ? 'border-white/[.12] bg-white/[.04] text-white hover:bg-white/[.08]'
                : 'bg-white hover:bg-muted'
            }`}
          />

          <NotificationBell dark={premiumHome} />

          <Button
            variant="outline"
            size="sm"
            onClick={toggle}
            aria-label="Abrir carrito"
            className={`shrink-0 ${premiumHome ? 'border-white/[.12] bg-white/[.04] text-white hover:bg-white/[.08]' : ''}`}
          >
            <ShoppingBag className="size-4 sm:mr-2" /> <span className="hidden sm:inline">Carrito</span>
          </Button>

          {!loading && !user && (
            <Link href="/login" className="hidden md:block">
              <Button
                size="sm"
                className={premiumHome ? 'bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white hover:brightness-110' : undefined}
              >
                Ingresar
              </Button>
            </Link>
          )}

          {!loading && user && (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/perfil"
                className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm ${
                  premiumHome ? 'border-white/[.12] bg-white/[.04]' : ''
                }`}
              >
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-6 rounded-full object-cover" /> : <UserCircle className="size-4" />}
                <span className="max-w-28 truncate">{user.name ?? user.email}</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                aria-label="Cerrar sesión"
                className={premiumHome ? 'text-white hover:bg-white/[.08]' : undefined}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`md:hidden ${premiumHome ? 'text-white hover:bg-white/[.08]' : ''}`}
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <nav className={`border-t px-4 py-3 md:hidden ${
            premiumHome ? 'border-white/[.08] bg-[#090D18]' : 'bg-white'
          }`}>
            <div className="mx-auto flex max-w-7xl flex-col">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={`py-3 text-sm font-medium ${premiumHome ? 'text-[#CBD5E1]' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <InstallAppButton
                className={`flex w-full items-center gap-2 py-3 text-left text-sm font-semibold ${
                  premiumHome ? 'text-[#CBD5E1]' : ''
                }`}
              />
              {user ? (
                <>
                  <Link href="/perfil" className={`py-3 text-sm font-medium ${premiumHome ? 'text-[#CBD5E1]' : ''}`} onClick={() => setMobileOpen(false)}>
                    Mi perfil
                  </Link>
                  <button className="py-3 text-left text-sm font-medium text-red-500" onClick={signOut}>Cerrar sesión</button>
                </>
              ) : !loading ? (
                <Link href="/login" className={`py-3 text-sm font-semibold ${premiumHome ? 'text-white' : ''}`} onClick={() => setMobileOpen(false)}>
                  Ingresar
                </Link>
              ) : null}
            </div>
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}

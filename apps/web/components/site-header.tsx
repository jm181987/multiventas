'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, ShoppingBag, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/store/cart';
import { CartDrawer } from './CartDrawer';

const nav = [
  ['/productos', 'Productos'],
  ['/mis-pedidos', 'Mis pedidos'],
  ['/vendor', 'Vender'],
  ['/login', 'Ingresar'],
] as const;

export function SiteHeader() {
  const toggle = useCartUi((s) => s.toggle);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight" onClick={() => setMobileOpen(false)}>
            <span className="grid size-9 place-items-center rounded-xl bg-black text-white"><Store className="size-5" /></span>
            <span>Multiventas</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm md:flex">
            {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <Button variant="outline" size="sm" onClick={toggle} aria-label="Abrir carrito">
            <ShoppingBag className="mr-2 size-4" /> Carrito
          </Button>
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
              {nav.map(([href, label]) => (
                <Link key={href} href={href} className="py-3 text-sm font-medium" onClick={() => setMobileOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}

'use client';

import Link from 'next/link';
import { Menu, ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartUi } from '@/store/cart';
import { CartDrawer } from './CartDrawer';

export function SiteHeader() {
  const toggle = useCartUi((s) => s.toggle);
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-black text-white"><Store className="size-5" /></span>
            <span>Multiventas</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm md:flex">
            <Link href="/productos">Productos</Link>
            <Link href="/mis-pedidos">Mis pedidos</Link>
            <Link href="/vendor">Vender</Link>
            <Link href="/login">Ingresar</Link>
          </nav>
          <Button variant="outline" size="sm" onClick={toggle} aria-label="Abrir carrito">
            <ShoppingBag className="mr-2 size-4" /> Carrito
          </Button>
          <Button variant="ghost" size="sm" className="md:hidden"><Menu className="size-5" /></Button>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}

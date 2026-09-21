'use client';
import { useEffect } from 'react';
import { useCartUi } from '@/store/cart';
export default function CartPage() {
  const setOpen = useCartUi((s) => s.setOpen);
  useEffect(() => setOpen(true), [setOpen]);
  return <main className="mx-auto max-w-4xl px-4 py-16"><h1 className="text-4xl font-black">Carrito</h1><p className="mt-3 text-muted-foreground">El detalle del carrito está abierto a la derecha.</p></main>;
}

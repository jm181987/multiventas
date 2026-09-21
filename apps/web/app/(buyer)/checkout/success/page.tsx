import Link from 'next/link';

export default function CheckoutSuccessPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="rounded-2xl border bg-white p-10 shadow-sm">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <h1 className="text-3xl font-black">Pago recibido</h1>
        <p className="mt-3 text-muted-foreground">Mercado Pago está procesando la confirmación de tu compra.</p>
        {searchParams.order && <p className="mt-3 text-xs text-muted-foreground">Orden: {searchParams.order}</p>}
        <Link href="/mis-pedidos" className="mt-7 inline-flex h-11 items-center rounded-md bg-black px-5 font-semibold text-white">Ver mis pedidos</Link>
      </div>
    </main>
  );
}

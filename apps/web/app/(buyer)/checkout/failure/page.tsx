import Link from 'next/link';

export default function CheckoutFailurePage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="rounded-2xl border bg-white p-10 shadow-sm">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-red-100 text-2xl">×</div>
        <h1 className="text-3xl font-black">No se completó el pago</h1>
        <p className="mt-3 text-muted-foreground">Podés revisar tus pedidos y volver a intentar cuando corresponda.</p>
        {searchParams.order && <p className="mt-3 text-xs text-muted-foreground">Orden: {searchParams.order}</p>}
        <Link href="/mis-pedidos" className="mt-7 inline-flex h-11 items-center rounded-md bg-black px-5 font-semibold text-white">Ir a mis pedidos</Link>
      </div>
    </main>
  );
}

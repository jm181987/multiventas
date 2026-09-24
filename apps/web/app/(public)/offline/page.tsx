import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-4 py-16 text-center">
      <div>
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-slate-100">
          <WifiOff className="size-8 text-slate-500" />
        </div>
        <h1 className="mt-5 text-3xl font-black">Estás sin conexión</h1>
        <p className="mt-2 leading-7 text-muted-foreground">
          SeVende no pudo conectarse en este momento. Tus datos sensibles nunca se sirven desde la caché offline.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild><Link href="/">Reintentar</Link></Button>
        </div>
      </div>
    </main>
  );
}

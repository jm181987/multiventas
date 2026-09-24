import { Download, Share, Smartphone, WifiOff } from 'lucide-react';
import { InstallAppButton } from '@/components/InstallAppButton';

export const metadata = {
  title: 'Instalar SeVende',
  description: 'Instalá SeVende en tu celular o computadora para acceder más rápido.',
  robots: { index: false, follow: false },
};

export default function InstallPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4 sm:py-12">
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-slate-950 px-5 py-8 text-white sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/knj-logo.webp" alt="KNJ" className="h-14 w-auto max-w-[100px] object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">SeVende PWA</p>
              <h1 className="mt-1 text-3xl font-black leading-tight">Instalá SeVende como app</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
            Usás el mismo SeVende, pero con acceso directo desde tu pantalla de inicio o escritorio y una experiencia más parecida a una aplicación.
          </p>
        </div>

        <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl border p-4">
            <div className="flex items-center gap-2 font-black"><Download className="size-5 text-indigo-600" /> Android y escritorio</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tocá el botón de abajo. Si tu navegador permite instalación directa, aparecerá el diálogo del sistema.
            </p>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center gap-2 font-black"><Share className="size-5 text-indigo-600" /> iPhone y iPad</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Abrí SeVende en Safari, tocá Compartir y elegí “Agregar a pantalla de inicio”.
            </p>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center gap-2 font-black"><Smartphone className="size-5 text-indigo-600" /> Siempre disponible</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              El acceso “Instalar app” queda disponible en el encabezado, menú móvil y pie de página mientras SeVende no esté instalado.
            </p>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center gap-2 font-black"><WifiOff className="size-5 text-indigo-600" /> Offline seguro</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Existe una pantalla offline básica, pero cuenta, checkout y datos sensibles nunca se sirven desde caché.
            </p>
          </div>
        </div>

        <div className="safe-area-bottom px-4 pb-5 sm:px-8">
          <InstallAppButton className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto" />
        </div>
      </section>
    </main>
  );
}

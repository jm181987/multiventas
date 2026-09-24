'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthSession } from '@/components/auth-provider';

export function DashboardShell({ kind, children }: { kind: 'vendor' | 'admin'; children: React.ReactNode }) {
  const { user, loading, authenticated } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const requiredRole = kind === 'vendor' ? 'VENDOR' : 'ADMIN';

  useEffect(() => {
    if (loading) return;
    if (!authenticated || !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user.roles.includes(requiredRole)) router.replace('/');
  }, [authenticated, loading, pathname, requiredRole, router, user]);

  if (loading || (authenticated && !user)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-xl border bg-white p-8 text-sm text-muted-foreground">Restaurando tu sesión…</div>
      </div>
    );
  }

  if (!user || !user.roles.includes(requiredRole)) return null;

  const links = kind === 'vendor'
    ? [['/vendor','Resumen'],['/vendor/analitica','Analítica'],['/vendor/productos','Productos'],['/vendor/pedidos','Pedidos'],['/vendor/promociones','Promociones'],['/vendor/configuracion','Configuración'],['/vendor/mercadopago','Mercado Pago']]
    : [['/admin','Resumen'],['/admin/vendedores','Vendedores'],['/admin/usuarios','Usuarios'],['/admin/pedidos','Pedidos'],['/admin/soporte','Soporte'],['/admin/resenas','Reseñas'],['/admin/transacciones','Transacciones'],['/admin/comisiones','Comisiones'],['/admin/configuracion','Configuración']];

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-5 px-3 py-5 sm:px-4 sm:py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:py-8">
      <aside className="h-fit min-w-0 rounded-xl border bg-white p-3 lg:sticky lg:top-24">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {kind === 'vendor' ? 'Mi tienda' : 'Administración'}
        </p>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
          {links.map(([href,label]) => (
            <Link
              key={href}
              href={href}
              className={`min-w-0 max-w-full rounded-lg px-3 py-2 text-sm leading-5 hover:bg-muted ${pathname === href ? 'bg-muted font-semibold' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

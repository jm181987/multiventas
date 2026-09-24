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
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr] lg:gap-8 lg:py-8">
      <aside className="h-fit overflow-x-auto rounded-xl border bg-white p-3 lg:sticky lg:top-24">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {kind === 'vendor' ? 'Mi tienda' : 'Administración'}
        </p>
        <nav className="flex gap-1 lg:flex-col">
          {links.map(([href,label]) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-muted ${pathname === href ? 'bg-muted font-semibold' : ''}`}
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

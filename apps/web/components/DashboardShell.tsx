import Link from 'next/link';

export function DashboardShell({ kind, children }: { kind: 'vendor' | 'admin'; children: React.ReactNode }) {
  const links = kind === 'vendor'
    ? [['/vendor','Resumen'],['/vendor/productos','Productos'],['/vendor/pedidos','Pedidos'],['/vendor/configuracion','Configuración'],['/vendor/mercadopago','Mercado Pago']]
    : [['/admin','Resumen'],['/admin/vendedores','Vendedores'],['/admin/transacciones','Transacciones'],['/admin/comisiones','Comisiones'],['/admin/configuracion','Configuración']];
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-xl border p-3">
        <p className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{kind}</p>
        <nav className="flex flex-col">{links.map(([href,label]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm hover:bg-muted">{label}</Link>)}</nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}

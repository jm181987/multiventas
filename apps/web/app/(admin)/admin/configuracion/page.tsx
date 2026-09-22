import { Database, Server, ShieldCheck } from 'lucide-react';
import { AdminMercadoPagoSettings } from '@/components/AdminMercadoPagoSettings';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AdminSettingsPage() {
  const items = [
    { icon: Database, title: 'Base de datos', text: 'PostgreSQL y migraciones se administran desde Coolify. El API solo queda listo cuando el esquema requerido está aplicado.' },
    { icon: Server, title: 'Infraestructura', text: 'Redis, MinIO, API y Web se despliegan como servicios del stack Multiventas.' },
    { icon: ShieldCheck, title: 'Administrador principal', text: 'jorgitom18@gmail.com tiene rol ADMIN mediante migración de base de datos.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Sistema</p>
        <h1 className="text-3xl font-black tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Pagos, fees y estado operativo del marketplace.</p>
      </div>

      <AdminMercadoPagoSettings />

      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <CardHeader><div className="grid size-10 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></div><h2 className="mt-3 text-lg font-bold">{title}</h2></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">{text}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

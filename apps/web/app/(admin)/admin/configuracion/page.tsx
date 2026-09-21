import { Database, KeyRound, Server, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AdminSettingsPage() {
  const items = [
    { icon: Database, title: 'Base de datos', text: 'PostgreSQL y migraciones se administran desde Coolify. El API solo se marca listo cuando el esquema requerido está aplicado.' },
    { icon: Server, title: 'Infraestructura', text: 'Redis, MinIO, API y Web se despliegan como servicios del stack Multiventas.' },
    { icon: KeyRound, title: 'Credenciales', text: 'Mercado Pago, JWT, almacenamiento y secretos permanecen como variables de entorno y no se exponen en el frontend.' },
    { icon: ShieldCheck, title: 'Administrador principal', text: 'jorgitom18@gmail.com tiene rol ADMIN mediante migración de base de datos.' },
  ];

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Sistema</p><h1 className="text-3xl font-black tracking-tight">Configuración</h1><p className="mt-1 text-muted-foreground">Estado y responsabilidades de la infraestructura administrativa.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
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

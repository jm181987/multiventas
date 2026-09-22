import { CheckCircle2, Clock3, PackageCheck, Truck, XCircle } from 'lucide-react';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const steps: Array<{ key: Exclude<OrderStatus, 'CANCELLED'>; label: string; icon: any }> = [
  { key: 'PENDING', label: 'Pedido', icon: Clock3 },
  { key: 'PAID', label: 'Pagado', icon: CheckCircle2 },
  { key: 'SHIPPED', label: 'Enviado', icon: Truck },
  { key: 'DELIVERED', label: 'Entregado', icon: PackageCheck },
];

const rank: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  PENDING: 0,
  PAID: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

export function OrderStatusTimeline({ status, accentColor = '#18181b' }: { status: OrderStatus; accentColor?: string | null }) {
  const color = accentColor || '#18181b';
  if (status === 'CANCELLED') {
    return <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700"><XCircle className="size-4" /> Pedido cancelado</div>;
  }

  const current = rank[status];
  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const done = index <= current;
        return (
          <div key={step.key} className="min-w-0 text-center">
            <div className="mx-auto grid size-9 place-items-center rounded-full border-2 bg-white" style={{ borderColor: done ? color : '#e4e4e7', color: done ? color : '#a1a1aa' }}>
              <Icon className="size-4" />
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold" style={{ color: done ? color : '#71717a' }}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

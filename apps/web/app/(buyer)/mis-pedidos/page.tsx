import { DashboardResource } from '@/components/DashboardResource';
export default function OrdersPage() { return <main className="mx-auto max-w-6xl px-4 py-10"><DashboardResource title="Mis pedidos" endpoint="/orders/mine" /></main>; }

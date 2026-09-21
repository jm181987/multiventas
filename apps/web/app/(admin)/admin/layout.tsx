import { DashboardShell } from '@/components/DashboardShell';
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <DashboardShell kind="admin">{children}</DashboardShell>; }

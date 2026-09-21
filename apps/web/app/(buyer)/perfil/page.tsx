import { DashboardResource } from '@/components/DashboardResource';
export default function ProfilePage() { return <main className="mx-auto max-w-4xl px-4 py-10"><DashboardResource title="Mi perfil" endpoint="/users/me" /></main>; }

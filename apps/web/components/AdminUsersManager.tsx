'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type User = { id: string; email: string; name: string; avatarUrl?: string | null; roles: string[]; status: string; createdAt: string };

export function AdminUsersManager() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['admin-users'], queryFn: () => authApi<User[]>('/users') });
  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [query.data, search]);

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cuentas</p><h1 className="text-3xl font-black tracking-tight">Usuarios</h1><p className="mt-1 text-muted-foreground">Compradores, vendedores y administradores registrados.</p></div>
      <Card>
        <CardHeader className="border-b"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o email…" /></div></CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando usuarios…</div> : query.error ? <div className="p-8 text-sm text-red-600">{String(query.error)}</div> : (
            <div className="divide-y">
              {users.map((user) => <div key={user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserCircle className="size-6 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-sm text-muted-foreground">{user.email}</p></div></div><div className="flex flex-wrap gap-2">{user.roles.map((role) => <Badge key={role}>{role}</Badge>)}<Badge>{user.status}</Badge></div></div>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

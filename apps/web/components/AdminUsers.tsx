'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  roles: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
};

export function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['admin-users'], queryFn: () => authApi<User[]>('/users') });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: User['status'] }) =>
      authApi('/users/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((user) =>
      !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.roles.join(' ').toLowerCase().includes(q)
    );
  }, [query.data, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Accesos</p>
        <h1 className="text-3xl font-black tracking-tight">Usuarios</h1>
        <p className="mt-1 text-muted-foreground">Gestiona cuentas, roles y estado de acceso.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o rol…" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <p className="p-6 text-sm text-muted-foreground">Cargando usuarios…</p> : query.error ? <p className="p-6 text-sm text-red-600">{String(query.error)}</p> : (
            <div className="divide-y">
              {users.map((user) => (
                <div key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center overflow-hidden rounded-full bg-muted font-bold">
                      {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1">{user.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>{user.status}</Badge>
                    {user.status === 'ACTIVE' ? (
                      <Button variant="outline" size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: user.id, status: 'SUSPENDED' })}>
                        <ShieldOff className="mr-1 size-4" /> Suspender
                      </Button>
                    ) : (
                      <Button size="sm" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: user.id, status: 'ACTIVE' })}>
                        <ShieldCheck className="mr-1 size-4" /> Activar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!users.length && <p className="p-6 text-sm text-muted-foreground">No hay usuarios para mostrar.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

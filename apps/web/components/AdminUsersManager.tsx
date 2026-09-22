'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Search, UserCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthSession } from '@/components/auth-provider';
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

export function AdminUsersManager() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthSession();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | User['status']>('ALL');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => authApi<User[]>('/users'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: User['status'] }) =>
      authApi<User>(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      setError('');
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
      await qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo actualizar la cuenta'),
  });

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data ?? []).filter((u) => {
      const matches = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matches && (filter === 'ALL' || u.status === filter);
    });
  }, [filter, query.data, search]);

  const counts = useMemo(() => ({
    active: (query.data ?? []).filter((u) => u.status === 'ACTIVE').length,
    suspended: (query.data ?? []).filter((u) => u.status === 'SUSPENDED').length,
  }), [query.data]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Cuentas</p>
        <h1 className="text-3xl font-black tracking-tight">Usuarios</h1>
        <p className="mt-1 text-muted-foreground">Administra compradores, vendedores y administradores registrados.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activos</p><p className="mt-1 text-3xl font-black">{counts.active}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suspendidos</p><p className="mt-1 text-3xl font-black">{counts.suspended}</p></CardContent></Card>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader className="border-b">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o email…" />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="SUSPENDED">Suspendidos</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {query.isLoading ? <div className="p-8 text-sm text-muted-foreground">Cargando usuarios…</div>
          : query.error ? <div className="p-8 text-sm text-red-600">{String(query.error)}</div>
          : !users.length ? <div className="p-12 text-center text-sm text-muted-foreground">No hay usuarios para este filtro.</div>
          : (
            <div className="divide-y">
              {users.map((user) => {
                const isSelf = currentUser?.id === user.id;
                return (
                  <div key={user.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserCircle className="size-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{user.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {user.roles.map((role) => <Badge key={role}>{role}</Badge>)}
                          <Badge className={user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}>{user.status}</Badge>
                          {isSelf && <Badge>Tu cuenta</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {user.status === 'ACTIVE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          disabled={statusMutation.isPending || isSelf}
                          onClick={() => {
                            if (confirm(`¿Suspender la cuenta de ${user.email}?`)) statusMutation.mutate({ id: user.id, status: 'SUSPENDED' });
                          }}
                        >
                          <Ban className="mr-1 size-4" /> Suspender
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: user.id, status: 'ACTIVE' })}
                        >
                          <CheckCircle2 className="mr-1 size-4" /> Reactivar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

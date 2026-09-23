'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, CircleDollarSign, MessageSquareText, PackageCheck, ShoppingBag, TriangleAlert, Truck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthSession } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unread: number;
};

function NotificationIcon({ type }: { type: string }) {
  if (type === 'PAYMENT_APPROVED') return <CircleDollarSign className="size-4 text-emerald-600" />;
  if (type === 'ORDER_SHIPPED') return <Truck className="size-4 text-indigo-600" />;
  if (type === 'ORDER_DELIVERED' || type === 'REVIEW_REQUEST') return <PackageCheck className="size-4 text-emerald-600" />;
  if (type === 'REVIEW_RECEIVED' || type === 'REVIEW_PUBLISHED') return <MessageSquareText className="size-4 text-violet-600" />;
  if (type === 'STOCK_LOW' || type === 'PAYMENT_FAILED' || type === 'ORDER_CANCELLED') return <TriangleAlert className="size-4 text-amber-600" />;
  if (type === 'CART_ABANDONED') return <ShoppingBag className="size-4 text-rose-500" />;
  return <ShoppingBag className="size-4 text-indigo-600" />;
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { user } = useAuthSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => authApi<NotificationsResponse>('/notifications'),
    enabled: Boolean(user),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => authApi('/notifications/' + id + '/read', { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => authApi('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!user) return null;

  const data = query.data;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={'relative ' + (dark ? 'text-white hover:bg-white/[.08]' : '')}
      >
        <Bell className="size-5" />
        {!!data?.unread && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-black leading-4 text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <p className="font-black">Notificaciones</p>
              <p className="text-xs text-muted-foreground">{data?.unread ?? 0} sin leer</p>
            </div>
            {!!data?.unread && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
              >
                <CheckCheck className="size-3.5" /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {query.isLoading ? (
              <p className="p-5 text-sm text-muted-foreground">Cargando…</p>
            ) : !data?.items.length ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto size-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold">No tenés notificaciones todavía</p>
              </div>
            ) : (
              data.items.map((item) => {
                const body = (
                  <div className={'flex gap-3 p-4 transition hover:bg-slate-50 ' + (!item.readAt ? 'bg-indigo-50/45' : '')}>
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                      <NotificationIcon type={item.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm font-bold">{item.title}</p>
                        {!item.readAt && <span className="mt-1 size-2 rounded-full bg-indigo-600" />}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p>
                      <p className="mt-1.5 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('es-UY')}</p>
                    </div>
                  </div>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        if (!item.readAt) markRead.mutate(item.id);
                        setOpen(false);
                      }}
                      className="block border-b last:border-b-0"
                    >
                      {body}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !item.readAt && markRead.mutate(item.id)}
                    className="block w-full border-b text-left last:border-b-0"
                  >
                    {body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

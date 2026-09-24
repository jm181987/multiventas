'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  LifeBuoy,
  MessageCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ConversationData = {
  order: {
    id: string;
    status: string;
    store: { id: string; name: string; slug: string };
    items: Array<{
      id: string;
      title: string;
      deliveryMethod?: 'SHIPPING_PAID' | 'SHIPPING_FREE' | 'PICKUP' | 'DIGITAL' | null;
      deliveryDetails?: string | null;
    }>;
  };
  role: 'BUYER' | 'VENDOR';
  recipientName: string;
  canMessage: boolean;
  unreadBeforeOpen: number;
  messages: Array<{
    id: string;
    senderUserId: string;
    senderRole: 'BUYER' | 'VENDOR' | 'ADMIN';
    message: string;
    readAt?: string | null;
    createdAt: string;
    sender: { id: string; name: string };
  }>;
  supportCases: Array<{
    id: string;
    status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
    subject: string;
    description: string;
    adminNote?: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt?: string | null;
    createdByUserId: string;
  }>;
};

const supportLabels: Record<string, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

function quickMessages(data: ConversationData) {
  const methods = new Set(data.order.items.map((item) => item.deliveryMethod).filter(Boolean));
  const items: string[] = [];

  if (data.role === 'BUYER') {
    if (methods.has('PICKUP')) items.push('¿Podemos coordinar el retiro de mi pedido?');
    if (methods.has('SHIPPING_PAID') || methods.has('SHIPPING_FREE')) items.push('¿Cuándo estiman despachar mi pedido?');
    if (methods.has('DIGITAL')) items.push('¿Cómo recibiré la entrega digital de este pedido?');
    items.push('Hola, tengo una consulta sobre este pedido.');
  } else {
    if (methods.has('PICKUP')) items.push('Tu pedido está listo para retirar. Coordinemos el horario.');
    if (methods.has('SHIPPING_PAID') || methods.has('SHIPPING_FREE')) items.push('Tu pedido está siendo preparado para el envío.');
    if (methods.has('DIGITAL')) items.push('La entrega digital fue enviada. Avisame si necesitás ayuda para acceder.');
    items.push('Hola, te escribo para coordinar los detalles de tu pedido.');
  }

  return Array.from(new Set(items)).slice(0, 4);
}

export function ConversationUnreadBadge({ orderId }: { orderId: string }) {
  const query = useQuery({
    queryKey: ['conversation-unread'],
    queryFn: () => authApi<{ total: number; byOrder: Record<string, number> }>('/order-conversations/unread'),
    refetchInterval: 20_000,
  });
  const count = query.data?.byOrder?.[orderId] ?? 0;
  if (!count) return null;

  return (
    <span className="ml-1 inline-grid min-w-5 place-items-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-black leading-5 text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function OrderConversation({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [error, setError] = useState('');

  const query = useQuery({
    queryKey: ['order-conversation', orderId],
    queryFn: () => authApi<ConversationData>('/order-conversations/' + orderId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!query.data) return;
    qc.invalidateQueries({ queryKey: ['conversation-unread'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [qc, query.data]);

  const send = useMutation({
    mutationFn: (text: string) => authApi('/order-conversations/' + orderId + '/messages', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    }),
    onSuccess: () => {
      setMessage('');
      setError('');
      qc.invalidateQueries({ queryKey: ['order-conversation', orderId] });
      qc.invalidateQueries({ queryKey: ['conversation-unread'] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje'),
  });

  const support = useMutation({
    mutationFn: () => authApi('/order-conversations/' + orderId + '/support', {
      method: 'POST',
      body: JSON.stringify({
        subject: supportSubject.trim(),
        description: supportDescription.trim(),
      }),
    }),
    onSuccess: () => {
      setSupportOpen(false);
      setSupportSubject('');
      setSupportDescription('');
      setError('');
      qc.invalidateQueries({ queryKey: ['order-conversation', orderId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'No se pudo crear el caso de soporte'),
  });

  const data = query.data;
  const quick = useMemo(() => data ? quickMessages(data) : [], [data]);

  function submitMessage(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    send.mutate(text);
  }

  if (query.isLoading) {
    return <div className="rounded-xl border bg-white p-4 text-sm text-muted-foreground">Cargando conversación…</div>;
  }

  if (query.error || !data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se pudo cargar la conversación.</div>;
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden rounded-2xl border bg-white p-3 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex min-w-0 items-center gap-2">
            <MessageCircle className="size-5 text-indigo-600" />
            <h3 className="min-w-0 font-black">Conversación del pedido</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Chat privado con {data.recipientName}. Solo ustedes pueden ver estos mensajes.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setSupportOpen((value) => !value)}>
          <LifeBuoy className="mr-1.5 size-4" /> Necesito ayuda
        </Button>
      </div>

      {supportOpen && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-bold text-amber-900">Abrir caso con soporte de SeVende</p>
              <p className="text-xs leading-5 text-amber-800">
                Esto crea una incidencia para Admin. No convierte a SeVende en responsable de la entrega, pero deja el caso registrado para asistencia.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-3">
            <Input
              placeholder="Asunto"
              maxLength={180}
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
            />
            <textarea
              className="min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              maxLength={3000}
              placeholder="Explicá brevemente qué pasó y qué necesitás."
              value={supportDescription}
              onChange={(e) => setSupportDescription(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={support.isPending || !supportSubject.trim() || !supportDescription.trim()}
                onClick={() => support.mutate()}
              >
                {support.isPending ? 'Enviando…' : 'Abrir caso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!!data.supportCases.length && (
        <div className="space-y-2">
          {data.supportCases.map((supportCase) => (
            <div key={supportCase.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{supportCase.subject}</p>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold">
                  {supportLabels[supportCase.status] ?? supportCase.status}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{supportCase.description}</p>
              {supportCase.adminNote && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-xs leading-5 text-indigo-900">
                  <strong>Respuesta de soporte:</strong> {supportCase.adminNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="scrollbar-safe max-h-[45dvh] min-w-0 space-y-3 overflow-y-auto overflow-x-hidden rounded-xl bg-slate-50 p-3 sm:max-h-80 sm:p-4">
        {!data.messages.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay mensajes. Usá una respuesta rápida o escribí el primero.
          </div>
        ) : (
          data.messages.map((item) => {
            const mine = item.senderRole === data.role;
            return (
              <div key={item.id} className={'flex min-w-0 ' + (mine ? 'justify-end' : 'justify-start')}>
                <div className={'min-w-0 max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%] ' + (
                  mine
                    ? 'rounded-br-md bg-indigo-600 text-white'
                    : 'rounded-bl-md border bg-white text-slate-800'
                )}>
                  <p className={'mb-1 text-[10px] font-bold ' + (mine ? 'text-indigo-100' : 'text-muted-foreground')}>
                    {mine ? 'Vos' : item.sender.name}
                  </p>
                  <p className="whitespace-pre-wrap break-words leading-5">{item.message}</p>
                  <p className={'mt-1 text-right text-[9px] ' + (mine ? 'text-indigo-200' : 'text-slate-400')}>
                    {new Date(item.createdAt).toLocaleString('es-UY')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {data.canMessage ? (
        <>
          <div className="flex min-w-0 flex-wrap gap-2">
            {quick.map((text) => (
              <button
                key={text}
                type="button"
                className="max-w-full whitespace-normal break-words rounded-full border bg-white px-3 py-1.5 text-left text-xs font-semibold leading-5 transition hover:border-indigo-300 hover:bg-indigo-50"
                disabled={send.isPending}
                onClick={() => send.mutate(text)}
              >
                {text}
              </button>
            ))}
          </div>

          <form onSubmit={submitMessage} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <textarea
              className="min-h-11 min-w-0 resize-y rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
              maxLength={2000}
              placeholder="Escribí un mensaje sobre este pedido…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button type="submit" className="h-11 self-end" disabled={send.isPending || !message.trim()}>
              <Send className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{send.isPending ? 'Enviando…' : 'Enviar'}</span>
            </Button>
          </form>
        </>
      ) : (
        <div className="flex items-start gap-2 rounded-xl border bg-slate-50 p-3 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          La conversación se habilita cuando el pago del pedido está confirmado.
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-emerald-600" />
        Los mensajes quedan registrados dentro del pedido para ambas partes.
      </div>
    </div>
  );
}

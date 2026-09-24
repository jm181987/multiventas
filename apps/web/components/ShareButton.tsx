'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Facebook, Instagram, Send, Share2 } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Channel = 'native' | 'whatsapp' | 'facebook' | 'x' | 'instagram' | 'copy';

function sharedUrl(path: string, channel: Channel) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('ref', 'share');
  url.searchParams.set('utm_source', channel);
  url.searchParams.set('utm_medium', 'social');
  return url.toString();
}

export function ShareButton({
  path,
  title,
  text,
  productId,
  compact = false,
}: {
  path: string;
  title: string;
  text?: string;
  productId?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function track() {
    if (!productId) return;
    void publicApi('/analytics/products/' + productId + '/share', { method: 'POST' }).catch(() => undefined);
  }

  async function copy(channel: Channel = 'copy') {
    const url = sharedUrl(path, channel);
    await navigator.clipboard.writeText(url);
    track();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    setOpen(false);
  }

  async function native(channel: Channel = 'native') {
    const url = sharedUrl(path, channel);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        track();
        setOpen(false);
        return;
      } catch {}
    }
    await copy(channel);
  }

  function external(channel: 'whatsapp' | 'facebook' | 'x') {
    const url = sharedUrl(path, channel);
    const message = encodeURIComponent((text || title) + ' ' + url);
    const target = channel === 'whatsapp'
      ? 'https://wa.me/?text=' + message
      : channel === 'facebook'
        ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)
        : 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text || title) + '&url=' + encodeURIComponent(url);

    track();
    window.open(target, '_blank', 'noopener,noreferrer,width=760,height=650');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        <Share2 className={compact ? 'size-4' : 'mr-1.5 size-4'} />
        {!compact && 'Compartir'}
      </Button>

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[80] max-h-[70vh] overflow-y-auto rounded-2xl border bg-white p-2 text-sm text-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-11 sm:w-56 sm:max-h-none sm:overflow-hidden sm:rounded-xl">
          <button type="button" onClick={() => void native()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-50">
            <Send className="size-4 text-indigo-600" /> Compartir en apps
          </button>
          <button type="button" onClick={() => external('whatsapp')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
            <Send className="size-4 text-emerald-600" /> WhatsApp
          </button>
          <button type="button" onClick={() => external('facebook')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
            <Facebook className="size-4 text-blue-600" /> Facebook
          </button>
          <button type="button" onClick={() => external('x')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
            <span className="grid size-4 place-items-center text-xs font-black">X</span> X
          </button>
          <button type="button" onClick={() => void native('instagram')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
            <Instagram className="size-4 text-fuchsia-600" /> Instagram / más
          </button>
          <button type="button" onClick={() => void copy()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
      )}
    </div>
  );
}

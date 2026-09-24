'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function PwaExperience() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return;

    const dismissed = sessionStorage.getItem('sv-install-dismissed') === '1';

    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      if (!dismissed) window.setTimeout(() => setVisible(true), 4500);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible || !prompt) return null;

  async function install() {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      setPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,430px)] -translate-x-1/2 rounded-2xl border bg-white/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-950 p-1.5">
          <img src="/knj-logo.webp" alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black">Instalar SeVende</p>
          <p className="text-xs text-muted-foreground">Acceso rápido desde tu celular, como una app.</p>
        </div>
        <Button type="button" size="sm" onClick={() => void install()}>
          <Download className="mr-1 size-4" /> Instalar
        </Button>
        <button
          type="button"
          aria-label="Cerrar"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100"
          onClick={() => {
            sessionStorage.setItem('sv-install-dismissed', '1');
            setVisible(false);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

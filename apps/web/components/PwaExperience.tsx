'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, MoreVertical, Share, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaExperience() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setPlatform(ios ? 'ios' : android ? 'android' : 'desktop');
    setInstalled(isStandalone());

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }

    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }

    function openInstall() {
      if (!isStandalone()) setVisible(true);
    }

    function onInstalled() {
      setInstalled(true);
      setVisible(false);
      setPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('sv-open-install', openInstall as EventListener);

    const dismissed = sessionStorage.getItem('sv-install-dismissed') === '1';
    if (!dismissed && !isStandalone() && window.innerWidth <= 768) {
      window.setTimeout(() => setVisible(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('sv-open-install', openInstall as EventListener);
    };
  }, []);

  const instructions = useMemo(() => {
    if (platform === 'ios') {
      return {
        title: 'Instalá SeVende en tu iPhone o iPad',
        text: 'En Safari, tocá Compartir y luego “Agregar a pantalla de inicio”.',
        Icon: Share,
      };
    }
    if (platform === 'android') {
      return {
        title: 'Instalá SeVende en tu celular',
        text: prompt
          ? 'Podés instalar SeVende ahora y abrirlo como una app.'
          : 'Abrí el menú del navegador y elegí “Instalar aplicación” o “Agregar a pantalla principal”.',
        Icon: MoreVertical,
      };
    }
    return {
      title: 'Instalá SeVende',
      text: prompt
        ? 'Instalalo para abrir SeVende desde tu escritorio o barra de aplicaciones.'
        : 'Usá la opción “Instalar” del navegador cuando esté disponible.',
      Icon: Smartphone,
    };
  }, [platform, prompt]);

  if (installed || !visible) return null;

  async function install() {
    const currentPrompt = prompt;
    if (!currentPrompt) return;
    await currentPrompt.prompt();
    const choice = await currentPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setVisible(false);
      setPrompt(null);
    }
  }

  const InstructionIcon = instructions.Icon;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Instalar SeVende"
        className="w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b bg-slate-50 p-4">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-950 p-1.5">
            <img src="/knj-logo.webp" alt="" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words text-lg font-black">{instructions.title}</p>
            <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{instructions.text}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-slate-200"
            onClick={() => {
              sessionStorage.setItem('sv-install-dismissed', '1');
              setVisible(false);
            }}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {prompt ? (
            <Button type="button" className="w-full" onClick={() => void install()}>
              <Download className="mr-2 size-4" /> Instalar SeVende
            </Button>
          ) : (
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <InstructionIcon className="size-5" />
                </span>
                <div className="min-w-0 text-sm leading-6">
                  {platform === 'ios' ? (
                    <>
                      <p><strong>1.</strong> Abrí esta página en Safari.</p>
                      <p><strong>2.</strong> Tocá el botón <strong>Compartir</strong>.</p>
                      <p><strong>3.</strong> Elegí <strong>Agregar a pantalla de inicio</strong>.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>1.</strong> Abrí el menú de tu navegador.</p>
                      <p><strong>2.</strong> Elegí <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>La versión instalada usa el mismo sitio y mantiene checkout, cuenta y datos sensibles fuera de la caché offline.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

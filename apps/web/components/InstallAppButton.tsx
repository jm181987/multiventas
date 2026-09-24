'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

function standalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallAppButton({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(standalone());
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  if (installed) return null;

  return (
    <button
      type="button"
      className={className}
      aria-label="Instalar SeVende"
      onClick={() => window.dispatchEvent(new CustomEvent('sv-open-install'))}
    >
      <Download className="size-4 shrink-0" />
      {!compact && <span>Instalar app</span>}
    </button>
  );
}

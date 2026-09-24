'use client';

import { Download } from 'lucide-react';

export function InstallAppButton({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent('sv-open-install'))}
    >
      <Download className="size-4 shrink-0" />
      {!compact && <span>Instalar app</span>}
    </button>
  );
}

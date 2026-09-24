'use client';

import { useEffect } from 'react';
import { publicApi } from '@/lib/api';

const RECENT_KEY = 'sv-recent-products';

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const viewKey = 'sv-product-view:' + productId + ':' + day;
    const shareKey = 'sv-product-share-view:' + productId + ':' + day;
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('ref') === 'share' || params.get('utm_medium') === 'social';

    let countView = true;
    let countShared = shared;

    try {
      countView = !localStorage.getItem(viewKey);
      countShared = shared && !localStorage.getItem(shareKey);

      const current = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
      const next = [productId, ...current.filter((id) => id !== productId)].slice(0, 16);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));

      if (countView) localStorage.setItem(viewKey, '1');
      if (countShared) localStorage.setItem(shareKey, '1');
    } catch {}

    if (!countView && !countShared) return;

    void publicApi('/analytics/products/' + productId + '/view', {
      method: 'POST',
      body: JSON.stringify({ countView, shared: countShared }),
    }).catch(() => {
      try {
        if (countView) localStorage.removeItem(viewKey);
        if (countShared) localStorage.removeItem(shareKey);
      } catch {}
    });
  }, [productId]);

  return null;
}

export function getRecentProductIds() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(0, 16) : [];
  } catch {
    return [];
  }
}

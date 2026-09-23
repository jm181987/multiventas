'use client';

import { useEffect } from 'react';
import { publicApi } from '@/lib/api';

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const key = 'sv-product-view:' + productId + ':' + day;

    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {}

    void publicApi('/analytics/products/' + productId + '/view', { method: 'POST' }).catch(() => {
      try { localStorage.removeItem(key); } catch {}
    });
  }, [productId]);

  return null;
}

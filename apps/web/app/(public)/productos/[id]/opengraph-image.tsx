import { ImageResponse } from 'next/og';
import { publicApi } from '@/lib/api';
import { Product } from '@/lib/types';

export const runtime = 'nodejs';
export const alt = 'Producto en SeVende';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const siteUrl = 'https://www.sevende.knjpro.site';

function absolute(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return siteUrl + (url.startsWith('/') ? url : '/' + url);
}

export default async function ProductOpenGraphImage({ params }: { params: { id: string } }) {
  const product = await publicApi<Product>('/products/' + params.id).catch(() => null);
  const image = absolute(product?.images?.[0]?.url);
  const storeLogo = absolute(product?.store.logoUrl);

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg,#020617 0%,#0f172a 55%,#172554 100%)',
        color: 'white',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: 56,
      }}>
        <div style={{
          width: 500,
          height: 518,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 34,
          background: '#111827',
          border: '1px solid rgba(255,255,255,.14)',
        }}>
          {image ? (
            <img src={image} width="500" height="518" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#64748b' }}>SeVende</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '16px 0 12px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {storeLogo ? <img src={storeLogo} width="54" height="54" alt="" style={{ borderRadius: 14, objectFit: 'cover' }} /> : null}
            <div style={{ display: 'flex', fontSize: 24, color: '#93c5fd', fontWeight: 700 }}>
              {product?.store.name ?? 'SeVende'}
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 38, fontSize: 54, lineHeight: 1.05, fontWeight: 900 }}>
            {product?.title ?? 'Encontralo en SeVende'}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 46, fontWeight: 900, color: '#67e8f9' }}>
            {product ? new Intl.NumberFormat('es-UY', { style: 'currency', currency: product.currency || 'UYU', maximumFractionDigits: 0 }).format(Number(product.price)) : ''}
          </div>
          <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 22, color: '#94a3b8' }}>www.sevende.knjpro.site</div>
            <div style={{ display: 'flex', borderRadius: 999, background: '#4f46e5', padding: '12px 20px', fontSize: 19, fontWeight: 800 }}>
              Ver producto →
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

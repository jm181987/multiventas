import { ImageResponse } from 'next/og';
import { publicApi } from '@/lib/api';
import { Store } from '@/lib/types';

export const runtime = 'nodejs';
export const alt = 'Tienda en SeVende';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const siteUrl = 'https://www.sevende.knjpro.site';

type PublicStore = Store & { productCount?: number; vendor?: { businessName?: string | null } };

function absolute(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return siteUrl + (url.startsWith('/') ? url : '/' + url);
}

export default async function StoreOpenGraphImage({ params }: { params: { slug: string } }) {
  const store = await publicApi<PublicStore>('/stores/' + params.slug).catch(() => null);
  const cover = absolute(store?.coverUrl);
  const logo = absolute(store?.logoUrl);
  const accent = store?.primaryColor || '#4f46e5';

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
        background: '#020617',
        color: 'white',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}>
        {cover ? <img src={cover} width="1200" height="630" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'linear-gradient(90deg,rgba(2,6,23,.96) 0%,rgba(2,6,23,.85) 52%,rgba(2,6,23,.48) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%', padding: '70px 82px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 28, overflow: 'hidden', background: 'white', border: '4px solid white' }}>
              {logo ? <img src={logo} width="110" height="110" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#0f172a', fontSize: 42, fontWeight: 900 }}>SV</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', fontSize: 23, fontWeight: 800, color: '#cbd5e1' }}>Tienda en SeVende</div>
              <div style={{ display: 'flex', marginTop: 8, fontSize: 62, lineHeight: 1, fontWeight: 900 }}>{store?.name ?? 'SeVende'}</div>
            </div>
          </div>
          {store?.description ? <div style={{ display: 'flex', marginTop: 34, maxWidth: 760, fontSize: 27, lineHeight: 1.35, color: '#e2e8f0' }}>{store.description.slice(0, 170)}</div> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 38 }}>
            <div style={{ display: 'flex', padding: '12px 20px', borderRadius: 999, background: accent, fontWeight: 800 }}>{store?.productCount ?? 0} productos</div>
            <div style={{ display: 'flex', color: '#94a3b8', fontSize: 21 }}>www.sevende.knjpro.site</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

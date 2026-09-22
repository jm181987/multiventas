import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SeVende por KNJ — marketplace multivendedor';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  const logo = 'https://www.sevende.knjpro.site/knj-logo.webp';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '72px 82px',
          background:
            'radial-gradient(circle at 78% 28%, rgba(0,153,255,.34), transparent 30%), linear-gradient(135deg, #020617 0%, #071d4b 48%, #020617 100%)',
          color: 'white',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: '62%', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: 'fit-content',
              padding: '10px 18px',
              border: '1px solid rgba(125,211,252,.5)',
              borderRadius: 999,
              background: 'rgba(3, 105, 161, .22)',
              color: '#bae6fd',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            KNJ presenta
          </div>
          <div style={{ display: 'flex', fontSize: 78, lineHeight: 1, fontWeight: 900 }}>
            SeVende
          </div>
          <div style={{ display: 'flex', fontSize: 38, lineHeight: 1.15, color: '#dbeafe', fontWeight: 700 }}>
            Muchas tiendas. Un solo lugar.
          </div>
          <div style={{ display: 'flex', maxWidth: 660, fontSize: 25, lineHeight: 1.4, color: '#94a3b8' }}>
            Comprá productos de vendedores independientes o creá tu propia tienda online con pagos mediante Mercado Pago.
          </div>
          <div style={{ display: 'flex', marginTop: 14, fontSize: 22, color: '#38bdf8', fontWeight: 700 }}>
            www.sevende.knjpro.site
          </div>
        </div>

        <div
          style={{
            width: 390,
            height: 390,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 48,
            background: 'rgba(2, 6, 23, .58)',
            border: '1px solid rgba(56, 189, 248, .28)',
            boxShadow: '0 30px 90px rgba(0, 140, 255, .26)',
          }}
        >
          <img src={logo} width="350" height="337" alt="KNJ" style={{ objectFit: 'contain' }} />
        </div>
      </div>
    ),
    size,
  );
}

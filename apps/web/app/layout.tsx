import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/SiteFooter';

const siteUrl = 'https://www.sevende.knjpro.site';
const description =
  'SeVende es el marketplace de KNJ para comprar y vender online en Uruguay. Descubrí productos, tiendas independientes y pagos seguros con Mercado Pago.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'SeVende',
  title: {
    default: 'SeVende | Marketplace de KNJ',
    template: '%s | SeVende',
  },
  description,
  keywords: ['SeVende', 'KNJ', 'marketplace', 'comprar online', 'vender online', 'Uruguay', 'Mercado Pago'],
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'es_UY',
    url: siteUrl,
    siteName: 'SeVende',
    title: 'SeVende | Marketplace de KNJ',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SeVende | Marketplace de KNJ',
    description,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

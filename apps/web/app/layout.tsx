import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sevende.knjpro.site'),
  title: {
    default: 'Se Vende',
    template: '%s | Se Vende',
  },
  description: 'Marketplace multi-vendedor para Uruguay y Latinoamérica',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Se Vende',
    description: 'Marketplace multi-vendedor para Uruguay y Latinoamérica',
    url: 'https://www.sevende.knjpro.site',
    siteName: 'Se Vende',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}

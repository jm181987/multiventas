import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Multiventas',
  description: 'Marketplace multi-vendedor para Uruguay y Latinoamérica',
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

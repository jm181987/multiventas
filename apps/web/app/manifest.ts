import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SeVende | Marketplace de KNJ',
    short_name: 'SeVende',
    description: 'Comprá y vendé en tiendas independientes de Uruguay desde una experiencia moderna y segura.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#020617',
    theme_color: '#111827',
    lang: 'es-UY',
    orientation: 'portrait-primary',
    categories: ['shopping', 'business', 'lifestyle'],
    icons: [
      {
        src: '/pwa-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
    shortcuts: [
      {
        name: 'Explorar productos',
        short_name: 'Productos',
        url: '/productos',
        icons: [{ src: '/pwa-icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
      {
        name: 'Ver tiendas',
        short_name: 'Tiendas',
        url: '/tiendas',
        icons: [{ src: '/pwa-icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }],
      },
    ],
  };
}

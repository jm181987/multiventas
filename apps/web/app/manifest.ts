import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SeVende | Marketplace de KNJ',
    short_name: 'SeVende',
    description: 'Comprá y vendé en tiendas independientes de Uruguay desde una experiencia moderna y segura.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#111827',
    lang: 'es-UY',
    orientation: 'portrait-primary',
    categories: ['shopping', 'business', 'lifestyle'],
    icons: [
      {
        src: '/knj-logo.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/knj-logo.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

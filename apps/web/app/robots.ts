import type { MetadataRoute } from 'next';

const siteUrl = 'https://www.sevende.knjpro.site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/vendor/',
          '/checkout',
          '/carrito',
          '/mis-pedidos',
          '/favoritos',
          '/login',
          '/registro',
          '/api/',
          '/offline',
        ],
      },
    ],
    sitemap: siteUrl + '/sitemap.xml',
    host: siteUrl,
  };
}

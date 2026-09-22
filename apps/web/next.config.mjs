/** @type {import('next').NextConfig} */
const internalApi = (process.env.INTERNAL_API_URL ?? 'http://api:80/api').replace(/\/$/, '');

const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'sevende.knjpro.site',
          },
        ],
        destination: 'https://www.sevende.knjpro.site/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApi}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  }
};
export default nextConfig;

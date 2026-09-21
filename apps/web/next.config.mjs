/** @type {import('next').NextConfig} */
const internalApi = (process.env.INTERNAL_API_URL ?? 'http://api:80/api').replace(/\/$/, '');

const nextConfig = {
  output: 'standalone',
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

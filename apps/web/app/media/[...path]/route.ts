export const dynamic = 'force-dynamic';

function safePath(parts: string[]) {
  if (!parts.length || !['products', 'stores', 'users'].includes(parts[0])) return null;
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;
  return parts.map((part) => encodeURIComponent(part)).join('/');
}

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const objectPath = safePath(params.path);
  if (!objectPath) return new Response('Not found', { status: 404 });

  const bucket = process.env.S3_BUCKET ?? 'multiventas';
  const upstream = await fetch(`http://minio:80/${encodeURIComponent(bucket)}/${objectPath}`, {
    cache: 'no-store',
  }).catch(() => null);

  if (!upstream || !upstream.ok) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  const contentLength = upstream.headers.get('content-length');
  const etag = upstream.headers.get('etag');
  if (contentType) headers.set('content-type', contentType);
  if (contentLength) headers.set('content-length', contentLength);
  if (etag) headers.set('etag', etag);
  headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400');

  return new Response(upstream.body, { status: 200, headers });
}

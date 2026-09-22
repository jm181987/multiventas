import { NextRequest, NextResponse } from 'next/server';

const CANONICAL_HOST = 'www.sevende.knjpro.site';

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost ?? request.headers.get('host')?.split(':')[0];

  if (host === 'sevende.knjpro.site') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|media|_next/static|_next/image|favicon.ico).*)'],
};

import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, hasAuthConfig, verifyAuthToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  if (!hasAuthConfig()) return NextResponse.next();

  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico';

  if (isPublic) {
    if (pathname === '/login') {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
      if (token && (await verifyAuthToken(token))) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authed = await verifyAuthToken(token);

  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname) loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

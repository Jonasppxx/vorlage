import { NextRequest, NextResponse } from 'next/server';

// Protected routes: Pfade die eine Session benötigen
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/api/protected',
];

// Prüft, ob der Pfad durch einen der protectedRoutes abgedeckt wird
function isProtectedPath(pathname: string) {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

// Neue Next.js "proxy" Entrypoint (empfohlen)
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname)) {
    // Better-Auth Session-Cookie prüfen
    const sessionCookie = request.cookies.get('better-auth.session_token');

    if (!sessionCookie) {
      const url = new URL('/', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Backwards compatibility: alte "middleware" Weiterleitung auf "proxy"
export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes - let them through)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * Hinweis: Diese Matcher-Form bleibt erhalten; Next.js empfiehlt den Export "proxy"
     * statt "middleware". Beide Exporte sind hier verfügbar (proxy ist primär).
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

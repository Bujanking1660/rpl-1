import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStaffRoute =
    pathname.startsWith('/pelayan') ||
    pathname.startsWith('/kasir') ||
    pathname.startsWith('/koki') ||
    pathname.startsWith('/manager');

  if (isStaffRoute) {
    const managerSession = request.cookies.get('pakresto_session_manajer');
    let hasValidSession = false;

    if (managerSession?.value) {
      hasValidSession = true;
    } else if (pathname.startsWith('/pelayan')) {
      hasValidSession = Boolean(request.cookies.get('pakresto_session_pelayan')?.value);
    } else if (pathname.startsWith('/kasir')) {
      hasValidSession = Boolean(request.cookies.get('pakresto_session_kasir')?.value);
    } else if (pathname.startsWith('/koki')) {
      hasValidSession = Boolean(request.cookies.get('pakresto_session_koki')?.value);
    } else if (pathname.startsWith('/manager')) {
      hasValidSession = Boolean(request.cookies.get('pakresto_session_manajer')?.value);
    }

    if (!hasValidSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/pelayan/:path*',
    '/kasir/:path*',
    '/koki/:path*',
    '/manager/:path*',
  ],
};

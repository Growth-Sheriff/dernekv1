import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check for protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  
  // TODO: Implement proper authentication check
  // const token = request.cookies.get('auth-token');
  
  // Redirect to login if accessing dashboard without auth
  if (isDashboard) {
    // if (!token) {
    //   return NextResponse.redirect(new URL('/auth/login', request.url));
    // }
  }
  
  // Redirect to dashboard if accessing auth pages while authenticated
  if (isAuthPage) {
    // if (token) {
    //   return NextResponse.redirect(new URL('/dashboard', request.url));
    // }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

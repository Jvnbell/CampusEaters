import { NextResponse, type NextRequest } from 'next/server';

/**
 * Handle CORS preflight (OPTIONS) for /api/* in one place. The actual response
 * headers (Access-Control-Allow-Origin, etc.) are set in next.config.mjs so
 * they apply uniformly to every API response — this middleware just makes the
 * preflight short-circuit with a 204 instead of falling through to a 405.
 *
 * Native React Native fetch doesn't enforce CORS, but Expo Web preview and
 * browser-based debugging tools do, so this keeps both happy.
 */
export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

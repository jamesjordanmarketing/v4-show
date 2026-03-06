import { NextResponse, type NextRequest } from 'next/server';

// NOTE: @supabase/ssr cannot be imported here because Vercel middleware runs
// in the Edge Runtime (a V8 isolate with no Node.js globals like __dirname).
// The @supabase/supabase-js dependency chain includes @supabase/realtime-js
// which references __dirname, crashing the edge function on every request.
//
// Session refresh is handled at the page/layout level via server components,
// where @supabase/ssr works correctly (Node.js runtime, not Edge Runtime).
//
// To add auth redirects here in the future, use direct Supabase REST API
// calls with fetch() — those are fully edge-compatible.

export function middleware(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};


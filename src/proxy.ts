import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { publicEnv } from '@/lib/env';

const PUBLIC_PATHS = ['/sign-in'];

/** Obnoví Supabase session v cookies a chráni rozhranie aplikácie. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers ?? {})) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = !!data?.claims.sub;
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!isSignedIn && !isPublic) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  if (isSignedIn && isPublic) {
    return NextResponse.redirect(new URL('/discover', request.url));
  }
  return response;
}

export const config = {
  // Vynechaj statické súbory, PWA súbory a webhooky.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|serwist/|api/stripe/webhook).*)',
  ],
};

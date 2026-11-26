import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const CodeSchema = z.string().min(1).max(512);

/**
 * Prihlásenie odkazom z e-mailu (PKCE). Supabase presmeruje sem s `?code=…`,
 * ktorý vymeníme za session v cookies. Funguje iba v tom istom prehliadači,
 * v ktorom si používateľ odkaz vyžiadal (code verifier je v jeho cookie).
 */
export async function GET(request: NextRequest) {
  const code = CodeSchema.safeParse(request.nextUrl.searchParams.get('code'));
  if (code.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code.data);
    if (!error) return NextResponse.redirect(new URL('/discover', request.url));
  }
  return NextResponse.redirect(new URL('/sign-in', request.url));
}

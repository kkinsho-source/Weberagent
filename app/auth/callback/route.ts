import { NextResponse } from 'next/server';

/**
 * Auth email confirm / OAuth callback
 * Supabase 導回：/auth/callback?code=...
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/favorites';

  if (code) {
    // 動態 import 避免 edge/middleware 循環
    const { getSupabaseAuthServerClient } = await import('@/lib/supabase/server');
    const sb = await getSupabaseAuthServerClient();
    if (sb) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}

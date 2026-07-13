import { NextResponse } from 'next/server';
import { getSupabaseAuthServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/v1/favorites          → 目前使用者的收藏
 * POST /api/v1/favorites          → body: { symbol, market? }
 * DELETE /api/v1/favorites?symbol=2330&market=tw
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      favorites: [],
      message: 'Supabase 未設定；前端請用本機自選',
    });
  }
  const sb = await getSupabaseAuthServerClient();
  if (!sb) {
    return NextResponse.json({ configured: false, favorites: [] });
  }
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ configured: true, authenticated: false, favorites: [] }, { status: 401 });
  }
  const { data, error } = await sb
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ configured: true, authenticated: true, favorites: data ?? [] });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
  }
  const sb = await getSupabaseAuthServerClient();
  if (!sb) return NextResponse.json({ error: 'no_client' }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { symbol?: string; market?: string };
  const symbol = body.symbol?.trim();
  const market = (body.market || 'tw') as 'tw' | 'us' | 'jp';
  if (!symbol) return NextResponse.json({ error: 'symbol_required' }, { status: 400 });

  const row = { user_id: user.id, symbol, market };
  const { data, error } = await sb
    .from('favorites')
    .upsert(row, { onConflict: 'user_id,symbol,market' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ favorite: data });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'supabase_not_configured' }, { status: 503 });
  }
  const sb = await getSupabaseAuthServerClient();
  if (!sb) return NextResponse.json({ error: 'no_client' }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market') || 'tw';
  if (!symbol) return NextResponse.json({ error: 'symbol_required' }, { status: 400 });

  const { error } = await sb
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('symbol', symbol)
    .eq('market', market);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

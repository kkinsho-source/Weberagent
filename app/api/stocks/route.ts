import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { getDataBundle } from '@/lib/data/source';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks
 * GET /api/stocks?symbol=2330
 * GET /api/stocks?theme=foundry
 *
 * 優先 Supabase stocks 表；失敗/未設定則 fallback snapshot（getDataBundle）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? undefined;
  const theme = searchParams.get('theme') ?? undefined;

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        let q = sb.from('stocks').select('*').order('symbol');
        if (symbol) q = q.eq('symbol', symbol);
        if (theme) q = q.eq('theme_slug', theme);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          const stocks = data.map((r) => ({
            symbol: r.symbol as string,
            name: r.name as string,
            market: r.market as string,
            industry: (r.industry as string) ?? '',
            themeSlug: (r.theme_slug as string) ?? '',
            price: Number(r.price ?? 0),
            changePct: Number(r.change_pct ?? 0),
            marketCap: Number(r.market_cap ?? 0),
            asOf: r.as_of as string | null,
            updatedAt: r.updated_at as string | null,
          }));
          return NextResponse.json({
            stocks: symbol ? undefined : stocks,
            stock: symbol ? stocks[0] : undefined,
            dataSource: 'supabase',
            count: stocks.length,
          });
        }
      }
    } catch (e) {
      console.error('[api/stocks] supabase failed', e);
    }
  }

  // fallback: snapshot / mock
  const bundle = await getDataBundle({ symbol, theme });
  if (symbol) {
    const stock = bundle.stocks[0];
    if (!stock) {
      return NextResponse.json(
        { error: 'not_found', dataSource: bundle.dataSource },
        { status: 404 }
      );
    }
    return NextResponse.json({
      stock,
      dataSource: bundle.dataSource,
      meta: bundle.meta,
    });
  }
  return NextResponse.json({
    stocks: bundle.stocks,
    dataSource: bundle.dataSource,
    meta: bundle.meta,
    count: bundle.stocks.length,
  });
}

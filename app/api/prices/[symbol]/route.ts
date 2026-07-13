import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { getDataBundle } from '@/lib/data/source';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prices/[symbol]?from=2026-01-01&to=2026-07-14&limit=120
 * 優先 stock_prices 時間序列；若無則回傳最新一筆（來自 stocks / snapshot）
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 120), 500);
  const market = searchParams.get('market') || 'tw';

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        let q = sb
          .from('stock_prices')
          .select('symbol,market,trade_date,open,high,low,close,volume,change_pct,source')
          .eq('symbol', symbol)
          .eq('market', market)
          .order('trade_date', { ascending: false })
          .limit(limit);
        if (from) q = q.gte('trade_date', from);
        if (to) q = q.lte('trade_date', to);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return NextResponse.json({
            symbol,
            dataSource: 'supabase',
            prices: data.map((r) => ({
              date: r.trade_date,
              open: r.open,
              high: r.high,
              low: r.low,
              close: r.close,
              volume: r.volume,
              changePct: r.change_pct,
              source: r.source,
            })),
            count: data.length,
          });
        }

        // 無歷史列時，回 stocks 最新價當單點
        const { data: stock } = await sb
          .from('stocks')
          .select('symbol,name,price,change_pct,as_of')
          .eq('symbol', symbol)
          .eq('market', market)
          .maybeSingle();
        if (stock) {
          return NextResponse.json({
            symbol,
            dataSource: 'supabase',
            prices: [
              {
                date: stock.as_of,
                close: stock.price,
                changePct: stock.change_pct,
                source: 'stocks_snapshot',
              },
            ],
            count: 1,
            note: '尚無 stock_prices 歷史，回傳最新快照',
          });
        }
      }
    } catch (e) {
      console.error('[api/prices] supabase failed', e);
    }
  }

  // fallback snapshot
  const bundle = await getDataBundle({ symbol });
  const stock = bundle.stocks[0];
  if (!stock) {
    return NextResponse.json({ error: 'not_found', dataSource: bundle.dataSource }, { status: 404 });
  }
  return NextResponse.json({
    symbol,
    dataSource: bundle.dataSource,
    prices: [
      {
        date: bundle.meta?.asOf ?? null,
        close: stock.price,
        changePct: stock.changePct,
        source: 'snapshot',
      },
    ],
    count: 1,
    note: 'Supabase 未設定或無歷史資料，使用 snapshot 單點',
  });
}

import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured, isSupabaseAdminConfigured, getSupabaseAdminClient } from '@/lib/supabase';
import { getDataBundle } from '@/lib/data/source';
import { fetchSymbolHistory } from '@/lib/etl/history';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/prices/[symbol]?limit=120&refresh=1
 * - 優先 stock_prices
 * - 不足時抓 TWSE/Yahoo 歷史；refresh=1 且有 service role 時回寫 DB
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
  const refresh = searchParams.get('refresh') === '1';

  type PriceRow = {
    date: string | null;
    open?: number | null;
    high?: number | null;
    low?: number | null;
    close: number | null;
    volume?: number | null;
    changePct?: number | null;
    source?: string | null;
  };

  let prices: PriceRow[] = [];
  let dataSource: string = 'none';

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        let q = sb
          .from('stock_prices')
          .select('symbol,market,trade_date,open,high,low,close,volume,change_pct,source')
          .eq('symbol', symbol)
          .eq('market', market)
          .order('trade_date', { ascending: true })
          .limit(limit);
        if (from) q = q.gte('trade_date', from);
        if (to) q = q.lte('trade_date', to);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          prices = data.map((r) => ({
            date: r.trade_date as string,
            open: r.open as number | null,
            high: r.high as number | null,
            low: r.low as number | null,
            close: r.close as number | null,
            volume: r.volume as number | null,
            changePct: r.change_pct as number | null,
            source: r.source as string | null,
          }));
          dataSource = 'supabase';
        }
      }
    } catch (e) {
      console.error('[api/prices] supabase', e);
    }
  }

  // 資料太少 → 抓歷史
  if (prices.length < 10 || refresh) {
    try {
      const hist = await fetchSymbolHistory(symbol, 6);
      if (hist.length > prices.length) {
        prices = hist.map((b) => ({
          date: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume ?? null,
          changePct: b.changePct ?? null,
          source: b.source,
        }));
        dataSource = hist[0]?.source?.includes('Yahoo') ? 'yahoo' : 'twse_history';

        // 可選回寫
        if (refresh && isSupabaseAdminConfigured() && hist.length) {
          const sb = getSupabaseAdminClient();
          if (sb) {
            const payload = hist.map((b) => ({
              symbol,
              market,
              trade_date: b.date,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: b.volume ?? null,
              change_pct: b.changePct ?? null,
              source: b.source,
            }));
            // 分批
            for (let i = 0; i < payload.length; i += 100) {
              await sb.from('stock_prices').upsert(payload.slice(i, i + 100), {
                onConflict: 'symbol,market,trade_date',
              });
            }
            dataSource = 'twse_history+supabase';
          }
        }
      }
    } catch (e) {
      console.error('[api/prices] history', e);
    }
  }

  // 仍無資料 → snapshot 單點
  if (!prices.length) {
    const bundle = await getDataBundle({ symbol });
    const stock = bundle.stocks[0];
    if (!stock) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
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
      note: '尚無歷史日線',
    });
  }

  // limit 從尾端取
  const sliced = prices.length > limit ? prices.slice(-limit) : prices;

  return NextResponse.json({
    symbol,
    dataSource,
    prices: sliced,
    count: sliced.length,
  });
}

/**
 * GET /api/prices/[symbol]?limit=240&refresh=1
 * 優先 stock_prices；refresh 或資料過舊時強制抓 TWSE/Yahoo 並可回寫
 */
import { NextResponse } from 'next/server';
import {
  getSupabaseServerClient,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
  getSupabaseAdminClient,
} from '@/lib/supabase';
import { getDataBundle } from '@/lib/data/source';
import { fetchSymbolHistory } from '@/lib/etl/history';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 240), 500);
  const market = searchParams.get('market') || 'tw';
  const refresh = searchParams.get('refresh') === '1';

  let prices: PriceRow[] = [];
  let dataSource = 'none';

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        // 取最新 N 筆：先 desc 再反轉
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
          prices = data
            .map((r) => ({
              date: r.trade_date as string,
              open: r.open as number | null,
              high: r.high as number | null,
              low: r.low as number | null,
              close: r.close as number | null,
              volume: r.volume as number | null,
              changePct: r.change_pct as number | null,
              source: r.source as string | null,
            }))
            .reverse();
          dataSource = 'supabase';
        }
      }
    } catch (e) {
      console.error('[api/prices] supabase', e);
    }
  }

  const lastDb = prices[prices.length - 1]?.date || '';
  const todayTw = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  // P1：落後 1 個日曆日以上就視為可能缺最新 K（假日再由 hist 校正）
  const stale = (() => {
    if (!lastDb) return true;
    const a = Date.parse(lastDb);
    const b = Date.parse(todayTw);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
    return b - a > 1.5 * 86400000;
  })();

  // 預設在 stale / 資料不足 / 明確 refresh 時補歷史
  if (prices.length < 20 || refresh || stale) {
    try {
      const hist = await fetchSymbolHistory(symbol, 12);
      if (hist.length) {
        const lastHist = hist[hist.length - 1]?.date || '';
        const shouldReplace =
          prices.length < 20 ||
          refresh ||
          stale ||
          (lastHist && (!lastDb || lastHist > lastDb)) ||
          hist.length > prices.length;
        if (shouldReplace) {
          // merge: prefer hist for overlapping dates
          const byDate = new Map<string, PriceRow>();
          for (const p of prices) {
            if (p.date) byDate.set(p.date, p);
          }
          for (const b of hist) {
            byDate.set(b.date, {
              date: b.date,
              open: b.open,
              high: b.high,
              low: b.low,
              close: b.close,
              volume: b.volume ?? null,
              changePct: b.changePct ?? null,
              source: b.source,
            });
          }
          prices = Array.from(byDate.values()).sort((x, y) =>
            String(x.date).localeCompare(String(y.date))
          );
          dataSource =
            (hist[0]?.source?.includes('Yahoo') ? 'yahoo' : 'twse_history') +
            (dataSource === 'supabase' ? '+supabase' : '');

          if (isSupabaseAdminConfigured() && (refresh || stale || lastHist > lastDb)) {
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
              for (let i = 0; i < payload.length; i += 100) {
                await sb.from('stock_prices').upsert(payload.slice(i, i + 100), {
                  onConflict: 'symbol,market,trade_date',
                });
              }
              if (!dataSource.includes('supabase')) dataSource = `${dataSource}+supabase`;
            }
          }
        }
      }
    } catch (e) {
      console.error('[api/prices] history', e);
    }
  }

  if (!prices.length) {
    const bundle = await getDataBundle({ symbol });
    const stock = bundle.stocks[0];
    if (!stock) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json(
      {
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
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const sliced = prices.length > limit ? prices.slice(-limit) : prices;
  return NextResponse.json(
    {
      symbol,
      dataSource,
      prices: sliced,
      count: sliced.length,
      lastDate: sliced[sliced.length - 1]?.date ?? null,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

import { NextResponse } from 'next/server';
import { stocks as mockStocks } from '@/lib/data/mock';
import { fetchSymbolHistory } from '@/lib/etl/history';
import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase';
import { writeEtlLog } from '@/lib/data/upsert';
import { themes as mockThemes, supplyEdges as mockEdges } from '@/lib/data/mock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.MIGRATE_SECRET;
  if (!secret) {
    const host = req.headers.get('host') || '';
    return host.startsWith('localhost') || host.startsWith('127.0.0.1');
  }
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const hdr = req.headers.get('x-cron-secret') || req.headers.get('x-migrate-secret') || '';
  return bearer === secret || hdr === secret;
}

/**
 * POST /api/admin/warmup-prices
 * body: { symbols?: string[], months?: number }
 * 預熱 stock_prices 歷史日線（核心 20 檔預設）
 */
export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 503 });
  }
  const sb = getSupabaseAdminClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'no admin' }, { status: 503 });

  let symbols: string[] = mockStocks.map((s) => s.symbol);
  let months = 6;
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.symbols) && body.symbols.length) symbols = body.symbols;
    if (body.months) months = Math.min(Number(body.months) || 6, 12);
  } catch {
    /* default */
  }

  const results: Array<{ symbol: string; bars: number; ok: boolean; error?: string }> = [];
  let total = 0;

  for (const symbol of symbols) {
    try {
      const bars = await fetchSymbolHistory(symbol, months);
      if (!bars.length) {
        results.push({ symbol, bars: 0, ok: false, error: 'no history' });
        continue;
      }
      const payload = bars.map((b) => ({
        symbol,
        market: 'tw',
        trade_date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume ?? null,
        source: b.source,
      }));
      for (let i = 0; i < payload.length; i += 80) {
        const { error } = await sb.from('stock_prices').upsert(payload.slice(i, i + 80), {
          onConflict: 'symbol,market,trade_date',
        });
        if (error) throw new Error(error.message);
      }
      total += payload.length;
      results.push({ symbol, bars: payload.length, ok: true });
    } catch (e) {
      results.push({
        symbol,
        bars: 0,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await writeEtlLog({
    jobName: 'warmup_prices',
    status: results.every((r) => r.ok) ? 'success' : 'failed',
    source: 'TWSE/Yahoo history',
    recordsCount: total,
    message: `warmup ${results.filter((r) => r.ok).length}/${symbols.length} symbols, bars=${total}`,
    meta: { results },
  }).catch(() => {});

  return NextResponse.json({
    ok: results.some((r) => r.ok),
    totalBars: total,
    symbols: results,
  });
}

/**
 * POST /api/admin/seed-graph
 * 寫入 themes + supply_edges（表需先用 themes_and_edges.sql 建立）
 */
export async function PUT(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 503 });
  }
  const sb = getSupabaseAdminClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'no admin' }, { status: 503 });

  const themeRows = mockThemes.map((t) => ({
    market: t.market,
    slug: t.slug,
    title: t.title,
    description: t.description,
    verified_at: t.verifiedAt,
    company_count: t.companyCount,
  }));
  const { error: te } = await sb.from('themes').upsert(themeRows, { onConflict: 'slug' });
  if (te) {
    return NextResponse.json(
      {
        ok: false,
        error: te.message,
        hint: '請先在 SQL Editor 執行 supabase/themes_and_edges.sql',
      },
      { status: 400 }
    );
  }

  const edgeRows = mockEdges.map((e) => ({
    from_symbol: e.from,
    to_symbol: e.to,
    relation: e.relation,
    market: 'tw',
  }));
  // 先清空再插，避免重複（若 unique 尚未建）
  const { error: de } = await sb.from('supply_edges').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (de) {
    return NextResponse.json({ ok: false, error: de.message, step: 'delete edges' }, { status: 400 });
  }
  const { error: ee } = await sb.from('supply_edges').insert(edgeRows);
  if (ee) {
    return NextResponse.json({ ok: false, error: ee.message, step: 'insert edges' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    themes: themeRows.length,
    edges: edgeRows.length,
  });
}

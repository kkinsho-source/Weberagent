/**
 * Supabase 資料寫入共用層（server-only）
 * upsert stocks 最新價 + stock_prices 日線
 */
import 'server-only';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase';

export type StockUpsertInput = {
  symbol: string;
  market?: 'tw' | 'us' | 'jp';
  name: string;
  industry?: string;
  themeSlug?: string;
  price: number;
  changePct: number;
  marketCap?: number;
  asOf?: string; // ISO date
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

export type UpsertResult = {
  ok: boolean;
  stocks: number;
  prices: number;
  error?: string;
};

/**
 * 批次 upsert 個股最新價（stocks）+ 當日價格列（stock_prices）
 * 需要 SUPABASE_SERVICE_ROLE_KEY
 */
export async function upsertStockData(
  rows: StockUpsertInput[],
  opts?: { writePrices?: boolean; source?: string }
): Promise<UpsertResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      stocks: 0,
      prices: 0,
      error: 'Supabase admin 未設定（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）',
    };
  }
  const sb = getSupabaseAdminClient();
  if (!sb) {
    return { ok: false, stocks: 0, prices: 0, error: 'admin client null' };
  }

  const writePrices = opts?.writePrices !== false;
  const source = opts?.source ?? 'TWSE';
  const now = new Date().toISOString();

  const stockRows = rows.map((r) => ({
    symbol: r.symbol,
    market: r.market ?? 'tw',
    name: r.name,
    industry: r.industry ?? null,
    theme_slug: r.themeSlug ?? null,
    price: r.price,
    change_pct: r.changePct,
    market_cap: r.marketCap ?? null,
    as_of: r.asOf ?? null,
    updated_at: now,
  }));

  const { error: stockErr } = await sb.from('stocks').upsert(stockRows, {
    onConflict: 'symbol,market',
  });
  if (stockErr) {
    return { ok: false, stocks: 0, prices: 0, error: stockErr.message };
  }

  let priceCount = 0;
  if (writePrices) {
    const priceRows = rows
      .filter((r) => r.asOf && r.price != null)
      .map((r) => ({
        symbol: r.symbol,
        market: r.market ?? 'tw',
        trade_date: r.asOf!,
        open: r.open ?? null,
        high: r.high ?? null,
        low: r.low ?? null,
        close: r.price,
        volume: r.volume ?? null,
        change_pct: r.changePct,
        source,
      }));
    if (priceRows.length) {
      const { error: priceErr } = await sb.from('stock_prices').upsert(priceRows, {
        onConflict: 'symbol,market,trade_date',
      });
      if (priceErr) {
        return {
          ok: false,
          stocks: stockRows.length,
          prices: 0,
          error: priceErr.message,
        };
      }
      priceCount = priceRows.length;
    }
  }

  return { ok: true, stocks: stockRows.length, prices: priceCount };
}

/** 寫入一筆 etl_logs */
export async function writeEtlLog(input: {
  jobName: string;
  status: 'started' | 'success' | 'failed';
  source?: string;
  recordsCount?: number;
  message?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseAdminConfigured()) return;
  const sb = getSupabaseAdminClient();
  if (!sb) return;
  await sb.from('etl_logs').insert({
    job_name: input.jobName,
    status: input.status,
    source: input.source ?? null,
    records_count: input.recordsCount ?? 0,
    message: input.message ?? null,
    meta: input.meta ?? {},
    finished_at: input.status === 'started' ? null : new Date().toISOString(),
  });
}

/** 三大法人日淨超 upsert */
export async function upsertInstitutionalDaily(
  rows: Array<{
    symbol: string;
    tradeDate: string;
    netShares: number;
    source?: string;
    market?: string;
  }>,
): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!rows.length) return { ok: true, count: 0 };
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, count: 0, error: 'admin not configured' };
  }
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, count: 0, error: 'admin client null' };

  const payload = rows.map((r) => ({
    symbol: r.symbol,
    market: r.market ?? 'tw',
    trade_date: r.tradeDate,
    net_shares: r.netShares,
    source: r.source ?? null,
  }));

  let count = 0;
  for (let i = 0; i < payload.length; i += 200) {
    const chunk = payload.slice(i, i + 200);
    const { error } = await sb.from('stock_institutional_daily').upsert(chunk, {
      onConflict: 'symbol,market,trade_date',
    });
    if (error) {
      return { ok: false, count, error: error.message };
    }
    count += chunk.length;
  }
  return { ok: true, count };
}

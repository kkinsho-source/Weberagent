/**
 * Q1：顯示報價對齊最新日 K
 * stocks 表可能落後；若 stock_prices 有更新的 close，改用最新收盤並以前一日重算 changePct。
 */
import 'server-only';
import type { Stock } from '../types';
import { getSupabaseServerClient } from '../supabase/server';

export type QuoteOverlayMeta = {
  priceAsOf?: string;
  quoteSource?: 'stock_prices' | 'stocks_table';
  overlaidCount?: number;
};

type PriceRow = {
  symbol: string;
  trade_date: string;
  close: number | null;
  change_pct: number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 自近 N 日 prices 覆寫 stocks 的 price / changePct / asOf */
export async function overlayStocksWithLatestPrices(
  stocks: Stock[]
): Promise<{ stocks: Stock[]; meta: QuoteOverlayMeta }> {
  if (!stocks.length) {
    return { stocks, meta: { quoteSource: 'stocks_table', overlaidCount: 0 } };
  }

  const sb = getSupabaseServerClient();
  if (!sb) {
    return { stocks, meta: { quoteSource: 'stocks_table', overlaidCount: 0 } };
  }

  const symbols = Array.from(new Set(stocks.map((s) => s.symbol)));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await sb
    .from('stock_prices')
    .select('symbol,trade_date,close,change_pct')
    .in('symbol', symbols)
    .gte('trade_date', sinceStr)
    .order('trade_date', { ascending: false });

  if (error || !data?.length) {
    return { stocks, meta: { quoteSource: 'stocks_table', overlaidCount: 0 } };
  }

  // 每檔只留最新 2 根（query 已 desc）
  const bySym = new Map<string, PriceRow[]>();
  for (const raw of data as PriceRow[]) {
    const sym = String(raw.symbol || '').trim();
    if (!sym) continue;
    const arr = bySym.get(sym) ?? [];
    if (arr.length >= 2) continue;
    arr.push({
      symbol: sym,
      trade_date: String(raw.trade_date).slice(0, 10),
      close: raw.close == null ? null : Number(raw.close),
      change_pct: raw.change_pct == null ? null : Number(raw.change_pct),
    });
    bySym.set(sym, arr);
  }

  let maxDate = '';
  let overlaidCount = 0;

  const out = stocks.map((s) => {
    const bars = bySym.get(s.symbol);
    if (!bars?.length) return s;
    const last = bars[0];
    if (last.close == null || !Number.isFinite(last.close) || last.close <= 0) {
      return s;
    }

    const prev = bars[1];
    let changePct: number;
    if (prev?.close != null && Number.isFinite(prev.close) && prev.close > 0) {
      changePct = round2(((last.close - prev.close) / prev.close) * 100);
    } else if (last.change_pct != null && Number.isFinite(last.change_pct)) {
      changePct = round2(last.change_pct);
    } else {
      changePct = s.changePct ?? 0;
    }

    if (last.trade_date > maxDate) maxDate = last.trade_date;
    overlaidCount += 1;

    return {
      ...s,
      price: last.close,
      changePct,
      asOf: last.trade_date,
    };
  });

  return {
    stocks: out,
    meta: {
      priceAsOf: maxDate || undefined,
      quoteSource: overlaidCount > 0 ? 'stock_prices' : 'stocks_table',
      overlaidCount,
    },
  };
}

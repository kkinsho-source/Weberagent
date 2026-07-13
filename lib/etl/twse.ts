/**
 * TWSE 每日行情抓取（Node/serverless 版）
 * 對應 Python scripts/etl/twse_daily.py
 */
import 'server-only';
import { stocks as mockStocks } from '@/lib/data/mock';
import type { StockUpsertInput } from '@/lib/data/upsert';

const TWSE_STOCK_DAY_ALL =
  'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';

export type TwseQuote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

export type TwseFetchResult = {
  asOf: string;
  source: string;
  count: number;
  quotes: Record<string, TwseQuote>;
};

function parseNum(s: unknown): number {
  if (s == null) return 0;
  const t = String(s).trim().replace(/,/g, '').replace(/^\+/, '');
  if (!t || t === '-' || t === 'X') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function rocDateToIso(roc: string): string {
  const d = (roc || '').trim();
  if (d.length !== 7) {
    return new Date().toISOString().slice(0, 10);
  }
  const y = Number(d.slice(0, 3)) + 1911;
  const m = d.slice(3, 5);
  const day = d.slice(5, 7);
  return `${y}-${m}-${day}`;
}

/** 抓證交所全市場當日收盤 */
export async function fetchTwseDailyAll(): Promise<TwseFetchResult> {
  const res = await fetch(TWSE_STOCK_DAY_ALL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; aistockmap-etl/0.3)',
      Accept: 'application/json',
    },
    // 不快取，cron 每次都要最新
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`TWSE HTTP ${res.status}`);
  }
  const rows = (await res.json()) as Array<Record<string, string>>;
  const quotes: Record<string, TwseQuote> = {};
  let asOf = new Date().toISOString().slice(0, 10);

  for (const r of rows) {
    const symbol = (r.Code || '').trim();
    if (!symbol) continue;
    const close = parseNum(r.ClosingPrice);
    const change = parseNum(r.Change);
    const prev = close - change;
    const changePct = prev ? (change / prev) * 100 : 0;
    quotes[symbol] = {
      symbol,
      name: (r.Name || '').trim(),
      price: close,
      changePct: Math.round(changePct * 100) / 100,
      open: parseNum(r.OpeningPrice) || undefined,
      high: parseNum(r.HighestPrice) || undefined,
      low: parseNum(r.LowestPrice) || undefined,
      volume: parseNum(r.TradeVolume) || undefined,
    };
    if (r.Date) asOf = rocDateToIso(r.Date);
  }

  return {
    asOf,
    source: 'TWSE STOCK_DAY_ALL',
    count: Object.keys(quotes).length,
    quotes,
  };
}

/**
 * 合併 mock domain（industry/theme）+ TWSE 報價 → upsert 列
 * @param coreOnly 只核心 20 檔（預設 true）
 */
export function buildUpsertRows(
  fetched: TwseFetchResult,
  opts?: { coreOnly?: boolean }
): StockUpsertInput[] {
  const coreOnly = opts?.coreOnly !== false;
  const mockMap = new Map(mockStocks.map((s) => [s.symbol, s]));
  const symbols = coreOnly
    ? mockStocks.map((s) => s.symbol)
    : Object.keys(fetched.quotes);

  const rows: StockUpsertInput[] = [];
  for (const symbol of symbols) {
    const q = fetched.quotes[symbol];
    if (!q) continue;
    const m = mockMap.get(symbol);
    rows.push({
      symbol,
      market: 'tw',
      name: q.name || m?.name || symbol,
      industry: m?.industry,
      themeSlug: m?.themeSlug,
      price: q.price,
      changePct: q.changePct,
      marketCap: m?.marketCap,
      asOf: fetched.asOf,
      open: q.open,
      high: q.high,
      low: q.low,
      volume: q.volume,
    });
  }
  return rows;
}

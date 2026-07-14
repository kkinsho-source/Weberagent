/**
 * 個股歷史日線（K 線用）
 * 上市：TWSE STOCK_DAY（按月）
 * 備援：Yahoo chart
 */
import 'server-only';

export type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  changePct?: number;
  source: string;
};

function parseNum(s: unknown): number {
  if (s == null) return 0;
  const t = String(s).trim().replace(/,/g, '').replace(/^\+/, '');
  if (!t || t === '-' || t === 'X') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function rocSlashToIso(s: string): string | null {
  const m = s.trim().match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]) + 1911;
  return `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

async function fetchTwseMonth(symbol: string, yyyymm: string): Promise<OhlcBar[]> {
  const date = `${yyyymm}01`;
  const url = new URL('https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY');
  url.searchParams.set('response', 'json');
  url.searchParams.set('date', date);
  url.searchParams.set('stockNo', symbol);
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; aistockmap-etl/0.3)' },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const d = (await res.json()) as { stat?: string; data?: string[][] };
  if (d.stat !== 'OK' || !d.data) return [];
  const bars: OhlcBar[] = [];
  for (const row of d.data) {
    // 日期,成交股數,成交金額,開盤,最高,最低,收盤,漲跌價差,成交筆數
    const iso = rocSlashToIso(row[0] || '');
    if (!iso) continue;
    const open = parseNum(row[3]);
    const high = parseNum(row[4]);
    const low = parseNum(row[5]);
    const close = parseNum(row[6]);
    if (!close) continue;
    bars.push({
      date: iso,
      open: open || close,
      high: high || close,
      low: low || close,
      close,
      volume: parseNum(row[1]) || undefined,
      source: 'TWSE STOCK_DAY',
    });
  }
  return bars;
}

/** 抓近 months 個月上市日線 */
export async function fetchTwseHistory(
  symbol: string,
  months = 6
): Promise<OhlcBar[]> {
  const now = new Date();
  const all: OhlcBar[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const yyyymm = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    try {
      const bars = await fetchTwseMonth(symbol, yyyymm);
      all.push(...bars);
    } catch {
      /* ignore month */
    }
    // 禮貌延遲，避免被擋
    await new Promise((r) => setTimeout(r, 200));
  }
  // 去重 + 排序
  const map = new Map<string, OhlcBar>();
  for (const b of all) map.set(b.date, b);
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Yahoo 歷史（上市 .TW / 櫃買 .TWO） */
export async function fetchYahooHistory(
  symbol: string,
  range: '3mo' | '6mo' | '1y' = '6mo'
): Promise<OhlcBar[]> {
  for (const suffix of ['.TW', '.TWO'] as const) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}${suffix}?interval=1d&range=${range}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const d = (await res.json()) as {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              quote?: Array<{
                open?: (number | null)[];
                high?: (number | null)[];
                low?: (number | null)[];
                close?: (number | null)[];
                volume?: (number | null)[];
              }>;
            };
          }>;
        };
      };
      const r0 = d.chart?.result?.[0];
      const ts = r0?.timestamp || [];
      const q = r0?.indicators?.quote?.[0];
      if (!ts.length || !q) continue;
      const bars: OhlcBar[] = [];
      for (let i = 0; i < ts.length; i++) {
        const close = q.close?.[i];
        if (close == null) continue;
        const date = new Date(ts[i] * 1000).toISOString().slice(0, 10);
        bars.push({
          date,
          open: q.open?.[i] ?? close,
          high: q.high?.[i] ?? close,
          low: q.low?.[i] ?? close,
          close,
          volume: q.volume?.[i] ?? undefined,
          source: `Yahoo ${suffix}`,
        });
      }
      if (bars.length) return bars;
    } catch {
      /* try next suffix */
    }
  }
  return [];
}

export async function fetchSymbolHistory(
  symbol: string,
  months = 6
): Promise<OhlcBar[]> {
  // 先試 TWSE（上市）
  let bars = await fetchTwseHistory(symbol, months);
  if (bars.length >= 5) return bars;
  // 備援 Yahoo（含櫃買）
  bars = await fetchYahooHistory(symbol, months >= 12 ? '1y' : '6mo');
  return bars;
}

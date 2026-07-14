/**
 * 櫃買中心（TPEx）日行情 + Yahoo 備援
 * 補上市 OpenAPI 沒有的核心櫃股票（如 6643、5274）
 */
import 'server-only';
import type { TwseQuote } from '@/lib/etl/twse';

function parseNum(s: unknown): number {
  if (s == null) return 0;
  const t = String(s).trim().replace(/,/g, '').replace(/^\+/, '');
  if (!t || t === '-' || t === 'X' || t === '---') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function rocToIsoFromSlash(s: string): string | null {
  // 115/07/13
  const m = s.trim().match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]) + 1911;
  return `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

/** 上櫃日行情（全市場） */
export async function fetchTpexDailyQuotes(dateIso?: string): Promise<{
  asOf: string;
  quotes: Record<string, TwseQuote>;
  source: string;
}> {
  // TPEx API 要 2026/07/13 格式；預設用今天（UTC+8 粗略）
  let dateParam: string;
  if (dateIso) {
    const [y, m, d] = dateIso.split('-');
    dateParam = `${y}/${m}/${d}`;
  } else {
    const now = new Date(Date.now() + 8 * 3600 * 1000);
    dateParam = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`;
  }

  const url = new URL('https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes');
  url.searchParams.set('date', dateParam);
  url.searchParams.set('id', '');
  url.searchParams.set('response', 'json');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; aistockmap-etl/0.3)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`TPEx HTTP ${res.status}`);
  const body = (await res.json()) as {
    date?: string;
    tables?: Array<{ data?: string[][]; fields?: string[] }>;
  };
  const table = body.tables?.[0];
  const data = table?.data || [];
  const quotes: Record<string, TwseQuote> = {};
  for (const row of data) {
    if (!row || row.length < 7) continue;
    const symbol = String(row[0] || '').trim();
    if (!symbol || !/^\d{4}$/.test(symbol)) continue; // 只要 4 碼股票
    const close = parseNum(row[2]);
    const change = parseNum(row[3]);
    if (!close) continue;
    const prev = close - change;
    const changePct = prev ? Math.round((change / prev) * 10000) / 100 : 0;
    quotes[symbol] = {
      symbol,
      name: String(row[1] || '').trim(),
      price: close,
      changePct,
      open: parseNum(row[4]) || undefined,
      high: parseNum(row[5]) || undefined,
      low: parseNum(row[6]) || undefined,
      volume: parseNum(row[8]) || undefined,
    };
  }

  // body.date 可能是 20260713
  let asOf = dateIso || new Date().toISOString().slice(0, 10);
  if (body.date && body.date.length === 8) {
    asOf = `${body.date.slice(0, 4)}-${body.date.slice(4, 6)}-${body.date.slice(6, 8)}`;
  }

  return { asOf, quotes, source: 'TPEX dailyQuotes' };
}

/** Yahoo 單檔備援（.TWO 櫃買 / .TW 上市） */
export async function fetchYahooQuote(
  symbol: string,
  market: 'tw' | 'two' = 'two'
): Promise<TwseQuote | null> {
  const ysym = market === 'two' ? `${symbol}.TWO` : `${symbol}.TW`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ysym}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    chart?: { result?: Array<{ meta?: Record<string, number | string> }> };
  };
  const meta = d.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = Number(meta.regularMarketPrice || 0);
  const prev = Number(meta.chartPreviousClose || meta.previousClose || 0);
  if (!price) return null;
  const changePct = prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0;
  return {
    symbol,
    name: String(meta.shortName || meta.symbol || symbol),
    price,
    changePct,
  };
}

export async function fillMissingQuotes(
  missingSymbols: string[],
  preferAsOf?: string
): Promise<{ asOf: string; quotes: Record<string, TwseQuote>; source: string }> {
  if (missingSymbols.length === 0) {
    return { asOf: preferAsOf || '', quotes: {}, source: 'none' };
  }

  // 1) 試 TPEx 全市場
  try {
    const tpex = await fetchTpexDailyQuotes(preferAsOf);
    const picked: Record<string, TwseQuote> = {};
    for (const s of missingSymbols) {
      if (tpex.quotes[s]) picked[s] = tpex.quotes[s];
    }
    if (Object.keys(picked).length > 0) {
      return { asOf: tpex.asOf, quotes: picked, source: tpex.source };
    }
  } catch (e) {
    console.warn('[tpex] failed, fallback yahoo', e instanceof Error ? e.message : e);
  }

  // 2) Yahoo 逐檔
  const quotes: Record<string, TwseQuote> = {};
  for (const s of missingSymbols) {
    const q = (await fetchYahooQuote(s, 'two')) || (await fetchYahooQuote(s, 'tw'));
    if (q) quotes[s] = q;
  }
  return {
    asOf: preferAsOf || new Date().toISOString().slice(0, 10),
    quotes,
    source: 'Yahoo Finance',
  };
}

// silence unused import warning if tree-shaken
void rocToIsoFromSlash;

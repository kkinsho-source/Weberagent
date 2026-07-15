/**
 * 財報：月營收（MOPS 歷史 + OpenAPI）/ 季 EPS（FinMind + OpenAPI）
 * 含 in-memory 快取與 per-request 逾時，避免 Vercel 拖死。
 */
import 'server-only';

export type MonthlyRevenue = {
  yearMonth: string;
  revenue: number;
  momPct: number | null;
  yoyPct: number | null;
  companyName: string;
};

export type QuarterlyEps = {
  year: number;
  season: number;
  eps: number;
  companyName: string;
};

type CacheEntry<T> = { at: number; data: T };
const revCache = new Map<string, CacheEntry<MonthlyRevenue[]>>();
const epsCache = new Map<string, CacheEntry<QuarterlyEps[]>>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

function parseNum(s: unknown): number {
  if (s == null) return 0;
  const t = String(s).trim().replace(/,/g, '').replace(/%/g, '');
  if (!t || t === '-' || t === 'N/A' || t === '&nbsp;') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function parsePct(s: unknown): number | null {
  if (s == null) return null;
  const t = String(s)
    .trim()
    .replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/&nbsp;/gi, '');
  if (!t || t === '-' || t === 'N/A') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rocYmToIso(ym: string): string {
  const d = (ym || '').trim();
  if (d.length !== 5) return d;
  return `${Number(d.slice(0, 3)) + 1911}-${d.slice(3, 5)}`;
}

function isoFromRoc(yearRoc: number, month: number): string {
  return `${yearRoc + 1911}-${String(month).padStart(2, '0')}`;
}

function recentRocMonths(count: number): Array<{ yearRoc: number; month: number }> {
  const tw = new Date(Date.now() + 8 * 3600 * 1000);
  let y = tw.getUTCFullYear() - 1911;
  let m = tw.getUTCMonth(); // already previous month-ish: getUTCMonth 0-11 → use as last completed
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  const out: Array<{ yearRoc: number; month: number }> = [];
  for (let i = 0; i < count; i++) {
    out.push({ yearRoc: y, month: m });
    m -= 1;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
  }
  return out;
}

function asLatin1(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('latin1');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 12000
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(t);
  }
}

function parseRevenueFromHtml(
  html: string,
  symbol: string
): Omit<MonthlyRevenue, 'yearMonth'> | null {
  const re = new RegExp(
    `>\\s*${symbol}\\s*<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
    'i'
  );
  const m = html.match(re);
  if (!m) return null;
  const strip = (s: string) =>
    s.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
  let companyName = strip(m[1]);
  if (/[^\x20-\x7E\u4e00-\u9fff]/.test(companyName) && companyName.length > 12) {
    companyName = symbol;
  }
  const revenue = parseNum(strip(m[2]));
  if (!revenue) return null;
  return {
    companyName: companyName || symbol,
    revenue,
    momPct: parsePct(strip(m[5])),
    yoyPct: parsePct(strip(m[6])),
  };
}

async function fetchMopsMonth(
  symbol: string,
  yearRoc: number,
  month: number
): Promise<MonthlyRevenue | null> {
  for (const market of ['sii', 'otc'] as const) {
    const url = `https://mopsov.twse.com.tw/nas/t21/${market}/t21sc03_${yearRoc}_${month}_0.html`;
    try {
      const res = await fetchWithTimeout(url, {
        headers: {
          Accept: 'text/html,*/*',
          'User-Agent': 'weberagent/0.6 (financials)',
        },
      }, 10000);
      if (!res.ok) continue;
      const parsed = parseRevenueFromHtml(asLatin1(await res.arrayBuffer()), symbol);
      if (parsed) return { yearMonth: isoFromRoc(yearRoc, month), ...parsed };
    } catch {
      // timeout / network
    }
  }
  return null;
}

async function fetchOpenApiLatest(symbol: string): Promise<MonthlyRevenue | null> {
  try {
    const res = await fetchWithTimeout(
      'https://openapi.twse.com.tw/v1/opendata/t187ap05_L',
      { headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.6' } },
      15000
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, string>>;
    const r = rows.find((x) => (x['公司代號'] || '').trim() === symbol);
    if (!r) return null;
    return {
      yearMonth: rocYmToIso(r['資料年月'] || ''),
      revenue: parseNum(r['營業收入-當月營收']),
      momPct: parsePct(r['營業收入-上月比較增減(%)']),
      yoyPct: parsePct(r['營業收入-去年同月增減(%)']),
      companyName: (r['公司名稱'] || '').trim(),
    };
  } catch {
    return null;
  }
}

export async function fetchMonthlyRevenue(
  symbol: string,
  limit = 12
): Promise<MonthlyRevenue[]> {
  const key = `${symbol}:${limit}`;
  const hit = revCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const months = recentRocMonths(Math.max(limit, 3));
  const results: MonthlyRevenue[] = [];
  const batchSize = 3;
  for (let i = 0; i < months.length; i += batchSize) {
    const chunk = months.slice(i, i + batchSize);
    const part = await Promise.all(
      chunk.map((m) => fetchMopsMonth(symbol, m.yearRoc, m.month))
    );
    for (const p of part) if (p) results.push(p);
  }

  const latest = await fetchOpenApiLatest(symbol);
  if (latest?.revenue && !results.some((r) => r.yearMonth === latest.yearMonth)) {
    results.push(latest);
  }

  const map = new Map<string, MonthlyRevenue>();
  for (const r of results) if (r.yearMonth) map.set(r.yearMonth, r);
  const data = Array.from(map.values())
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-limit);

  revCache.set(key, { at: Date.now(), data });
  return data;
}

function seasonFromMonth(m: number): number {
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

async function fetchEpsFinMind(symbol: string, limit: number): Promise<QuarterlyEps[]> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  const startDate = start.toISOString().slice(0, 10);
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockFinancialStatements&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`;
  const res = await fetchWithTimeout(
    url,
    { headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.6' } },
    15000
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: Array<{ date: string; type: string; value: number; origin_name?: string }>;
  };
  const rows = (json.data || []).filter((r) => r.type === 'EPS');
  const out: QuarterlyEps[] = rows.map((r) => {
    const [y, m] = r.date.split('-').map(Number);
    return {
      year: y,
      season: seasonFromMonth(m || 3),
      eps: Number(r.value) || 0,
      companyName: symbol,
    };
  });
  const map = new Map<string, QuarterlyEps>();
  for (const e of out) map.set(`${e.year}-Q${e.season}`, e);
  return Array.from(map.values())
    .sort((a, b) => a.year * 10 + a.season - (b.year * 10 + b.season))
    .slice(-limit);
}

async function fetchEpsOpenApi(symbol: string, limit: number): Promise<QuarterlyEps[]> {
  const urls = [
    'https://openapi.twse.com.tw/v1/opendata/t187ap14_L',
    'https://openapi.twse.com.tw/v1/opendata/t187ap14_O',
  ];
  const all: QuarterlyEps[] = [];
  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(
        url,
        { headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.6' } },
        15000
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<Record<string, string>>;
      for (const r of rows) {
        if ((r['公司代號'] || '').trim() !== symbol) continue;
        const yearRaw = Number(r['年度'] || 0);
        const year = yearRaw > 1911 ? yearRaw : yearRaw + 1911;
        const season = Number(r['季別'] || 0);
        if (year < 2000 || season < 1 || season > 4) continue;
        all.push({
          year,
          season,
          eps: parseNum(r['基本每股盈餘(元)'] || r['基本每股盈餘'] || r['EPS']),
          companyName: (r['公司名稱'] || '').trim(),
        });
      }
    } catch {
      // ignore
    }
  }
  const map = new Map<string, QuarterlyEps>();
  for (const e of all) map.set(`${e.year}-Q${e.season}`, e);
  return Array.from(map.values())
    .sort((a, b) => a.year * 10 + a.season - (b.year * 10 + b.season))
    .slice(-limit);
}

export async function fetchQuarterlyEps(
  symbol: string,
  limit = 8
): Promise<QuarterlyEps[]> {
  const key = `${symbol}:${limit}`;
  const hit = epsCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  let data: QuarterlyEps[] = [];
  try {
    data = await fetchEpsFinMind(symbol, limit);
  } catch {
    data = [];
  }
  if (data.length < 2) {
    const fallback = await fetchEpsOpenApi(symbol, limit);
    if (fallback.length > data.length) data = fallback;
  }
  epsCache.set(key, { at: Date.now(), data });
  return data;
}

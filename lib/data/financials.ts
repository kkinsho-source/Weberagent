/**
 * 財報公開資料：
 * - 月營收：MOPS 歷史彙總表（多月）+ OpenAPI 最新備援
 * - 季 EPS：證交所 OpenAPI t187ap14
 *
 * 解析不依賴 Big5 中文解碼（Node 常不支援）：代號與數字為 ASCII。
 */
import 'server-only';

export type MonthlyRevenue = {
  yearMonth: string; // 2026-06
  revenue: number; // 千元
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
  const y = Number(d.slice(0, 3)) + 1911;
  return `${y}-${d.slice(3, 5)}`;
}

function isoFromRoc(yearRoc: number, month: number): string {
  return `${yearRoc + 1911}-${String(month).padStart(2, '0')}`;
}

function recentRocMonths(count: number): Array<{ yearRoc: number; month: number }> {
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 3600 * 1000);
  let y = tw.getUTCFullYear() - 1911;
  let m = tw.getUTCMonth() + 1;
  // 月營收通常落後約 1 個月
  m -= 1;
  if (m <= 0) {
    m += 12;
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

/** latin1 足以定位代號/數字；中文名可後備空字串 */
function asLatin1(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('latin1');
}

/**
 * 從 MOPS HTML 抽單一公司列（以 ASCII 代號錨點）
 */
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
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim();
  // company name 可能是亂碼，僅作備援
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
      const res = await fetch(url, {
        headers: {
          Accept: 'text/html,*/*',
          'User-Agent': 'aistockmap/0.5 (financials; +https://weberagent.vercel.app)',
        },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const html = asLatin1(await res.arrayBuffer());
      const parsed = parseRevenueFromHtml(html, symbol);
      if (parsed) {
        return { yearMonth: isoFromRoc(yearRoc, month), ...parsed };
      }
    } catch {
      // next
    }
  }
  return null;
}

async function fetchOpenApiLatest(symbol: string): Promise<MonthlyRevenue | null> {
  try {
    const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap05_L', {
      headers: { Accept: 'application/json', 'User-Agent': 'aistockmap/0.5' },
      cache: 'no-store',
    });
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
  const months = recentRocMonths(Math.max(limit, 3));
  const batchSize = 3;
  const results: MonthlyRevenue[] = [];
  for (let i = 0; i < months.length; i += batchSize) {
    const chunk = months.slice(i, i + batchSize);
    const part = await Promise.all(
      chunk.map((m) => fetchMopsMonth(symbol, m.yearRoc, m.month))
    );
    for (const p of part) if (p) results.push(p);
  }

  const latest = await fetchOpenApiLatest(symbol);
  if (latest?.revenue) {
    if (!results.some((r) => r.yearMonth === latest.yearMonth)) {
      results.push(latest);
    }
  }

  const map = new Map<string, MonthlyRevenue>();
  for (const r of results) {
    if (r.yearMonth) map.set(r.yearMonth, r);
  }
  return Array.from(map.values())
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-limit);
}

export async function fetchQuarterlyEps(
  symbol: string,
  limit = 8
): Promise<QuarterlyEps[]> {
  const urls = [
    'https://openapi.twse.com.tw/v1/opendata/t187ap14_L',
    'https://openapi.twse.com.tw/v1/opendata/t187ap14_O',
  ];
  const all: QuarterlyEps[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'aistockmap/0.5' },
        cache: 'no-store',
      });
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

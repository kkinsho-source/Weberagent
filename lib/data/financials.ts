/**
 * 財報公開資料：月營收 (t187ap05_L) + 季 EPS (t187ap14_L)
 */
import 'server-only';

export type MonthlyRevenue = {
  yearMonth: string; // 2026-06
  revenue: number; // 千元（證交所原始單位）
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
  const t = String(s).trim().replace(/,/g, '');
  if (!t || t === '-' || t === 'N/A') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function rocYmToIso(ym: string): string {
  // 11506 -> 2026-06
  const d = (ym || '').trim();
  if (d.length !== 5) return d;
  const y = Number(d.slice(0, 3)) + 1911;
  return `${y}-${d.slice(3, 5)}`;
}

export async function fetchMonthlyRevenue(symbol: string, limit = 12): Promise<MonthlyRevenue[]> {
  const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap05_L', {
    headers: { Accept: 'application/json', 'User-Agent': 'aistockmap/0.4' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`revenue HTTP ${res.status}`);
  const rows = (await res.json()) as Array<Record<string, string>>;
  const hit = rows
    .filter((r) => (r['公司代號'] || '').trim() === symbol)
    .map((r) => ({
      yearMonth: rocYmToIso(r['資料年月'] || ''),
      revenue: parseNum(r['營業收入-當月營收']),
      momPct: (() => {
        const n = parseNum(r['營業收入-上月比較增減(%)']);
        return n || null;
      })(),
      yoyPct: (() => {
        const n = parseNum(r['營業收入-去年同月增減(%)']);
        return n || null;
      })(),
      companyName: (r['公司名稱'] || '').trim(),
    }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  return hit.slice(-limit);
}

export async function fetchQuarterlyEps(symbol: string, limit = 8): Promise<QuarterlyEps[]> {
  const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap14_L', {
    headers: { Accept: 'application/json', 'User-Agent': 'aistockmap/0.4' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`eps HTTP ${res.status}`);
  const rows = (await res.json()) as Array<Record<string, string>>;
  const hit = rows
    .filter((r) => (r['公司代號'] || '').trim() === symbol)
    .map((r) => ({
      year: Number(r['年度'] || 0) + 1911,
      season: Number(r['季別'] || 0),
      eps: parseNum(r['基本每股盈餘(元)']),
      companyName: (r['公司名稱'] || '').trim(),
    }))
    .filter((r) => r.year > 2000 && r.season >= 1 && r.season <= 4)
    .sort((a, b) => a.year * 10 + a.season - (b.year * 10 + b.season));
  return hit.slice(-limit);
}

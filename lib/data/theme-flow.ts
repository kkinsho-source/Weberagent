/**
 * 題材法人資金潮汐（L1）— 依 core theme 成分聚合
 * 金額估算：淨股數 × 最新收盤價（元）→ 轉「億」
 */
import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Stock, Theme } from '../types';
import { filterThemesByScope, type ThemeScope } from './theme-scope';

export type TideState = 'inflow_accel' | 'inflow_slow' | 'outflow_slow' | 'outflow_accel';

export type ThemeFlowRow = {
  slug: string;
  title: string;
  tier: Theme['tier'];
  family: Theme['family'];
  colorHint: string;
  /** 近 1 日法人淨額（億） */
  net1dYi: number;
  /** 前一交易日淨額（億），供「昨日買超回顧」 */
  netPrev1dYi: number;
  /** 近 5 日合計（億） */
  net5dYi: number;
  /** 近 20 日合計（億） */
  net20dYi: number;
  /** 5 日日均（億） */
  avg5Yi: number;
  /** 20 日日均（億） */
  avg20Yi: number;
  /** 加速度 = avg5 - avg20（億/日） */
  accelYi: number;
  state: TideState;
  stateLabel: string;
  stockCount: number;
  /** 成分股今日均漲跌%（有報價者） */
  avgChangePct: number | null;
  asOf: string | null;
};

export type ThemeFlowBrief = {
  asOf: string | null;
  topBuy1d: Array<{ slug: string; title: string; net1dYi: number; avgChangePct: number | null }>;
  topSell1d: Array<{ slug: string; title: string; net1dYi: number; avgChangePct: number | null }>;
  /** 昨日買超 Top3 於今日之成分均漲跌 */
  prevBuyReview: Array<{
    slug: string;
    title: string;
    netPrev1dYi: number;
    avgChangePct: number | null;
  }>;
  tideLeaders: Array<{ slug: string; title: string; stateLabel: string; net5dYi: number }>;
  summary: string;
};

type InstSnap = {
  asOf?: string;
  days?: string[];
  bySymbol?: Record<string, Array<{ date: string; netShares: number }>>;
  source?: string;
};

function loadInstSnapshotFile(): InstSnap | null {
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'institutional_snapshot.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as InstSnap;
  } catch {
    return null;
  }
}

async function loadInstFromSupabase(lookbackDays = 45): Promise<InstSnap | null> {
  try {
    const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import(
      '@/lib/supabase'
    );
    if (!isSupabaseAdminConfigured()) return null;
    const sb = getSupabaseAdminClient();
    if (!sb) return null;

    const start = new Date();
    start.setDate(start.getDate() - lookbackDays);
    const startIso = start.toISOString().slice(0, 10);

    const bySymbol: Record<string, Array<{ date: string; netShares: number }>> = {};
    const daySet = new Set<string>();
    let from = 0;
    const page = 1000;
    for (;;) {
      const { data, error } = await sb
        .from('stock_institutional_daily')
        .select('symbol,trade_date,net_shares')
        .gte('trade_date', startIso)
        .order('trade_date', { ascending: true })
        .range(from, from + page - 1);
      if (error) {
        // 表尚未建立時安靜 fallback
        if (/relation|does not exist|schema cache/i.test(error.message)) return null;
        console.error('[theme-flow] inst supabase', error.message);
        return null;
      }
      if (!data?.length) break;
      for (const r of data as Array<{
        symbol: string;
        trade_date: string;
        net_shares: number;
      }>) {
        const sym = r.symbol;
        const date = String(r.trade_date).slice(0, 10);
        if (!bySymbol[sym]) bySymbol[sym] = [];
        bySymbol[sym].push({ date, netShares: Number(r.net_shares) || 0 });
        daySet.add(date);
      }
      if (data.length < page) break;
      from += page;
    }

    const symbols = Object.keys(bySymbol);
    if (!symbols.length) return null;
    const days = Array.from(daySet).sort().reverse();
    return {
      asOf: days[0] || null || undefined,
      days,
      bySymbol,
      source: 'supabase stock_institutional_daily',
    };
  } catch (e) {
    console.error('[theme-flow] loadInstFromSupabase', e);
    return null;
  }
}

/** DB 優先，檔案補齊缺日／缺股 */
async function loadInstData(): Promise<InstSnap | null> {
  const file = loadInstSnapshotFile();
  const db = await loadInstFromSupabase(50);
  if (!db && !file) return null;
  if (!db) return file;
  if (!file) return db;

  const bySymbol: Record<string, Array<{ date: string; netShares: number }>> = {
    ...(file.bySymbol || {}),
  };
  for (const [sym, series] of Object.entries(db.bySymbol || {})) {
    const map = new Map<string, number>();
    for (const p of bySymbol[sym] || []) map.set(p.date, p.netShares);
    for (const p of series) map.set(p.date, p.netShares); // db wins
    bySymbol[sym] = Array.from(map.entries())
      .map(([date, netShares]) => ({ date, netShares }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  const daySet = new Set<string>();
  for (const series of Object.values(bySymbol)) {
    for (const p of series) daySet.add(p.date);
  }
  const days = Array.from(daySet).sort().reverse();
  return {
    asOf: days[0] || db.asOf || file.asOf,
    days,
    bySymbol,
    source: `${file.source || 'file'}+${db.source || 'db'}`,
  };
}

/** 股 → 億：shares * price / 1e8 */
function sharesToYi(netShares: number, price: number): number {
  if (!price || !Number.isFinite(price)) return 0;
  return (netShares * price) / 1e8;
}

function sumLast(arr: number[], n: number): number {
  if (!arr.length) return 0;
  const slice = arr.slice(-n);
  return slice.reduce((a, b) => a + b, 0);
}

function classify(net5: number, accel: number): { state: TideState; stateLabel: string } {
  // 流入且加速 / 流入放緩 / 流出放緩 / 流出加速
  if (net5 > 0 && accel >= 0) return { state: 'inflow_accel', stateLabel: '漲潮' };
  if (net5 > 0 && accel < 0) return { state: 'inflow_slow', stateLabel: '輪動' };
  if (net5 <= 0 && accel >= 0) return { state: 'outflow_slow', stateLabel: '觀望' };
  return { state: 'outflow_accel', stateLabel: '退潮' };
}

export async function buildThemeFlow(opts: {
  themes: Theme[];
  stocks: Stock[];
  scope?: ThemeScope;
}): Promise<{
  rows: ThemeFlowRow[];
  meta: {
    asOf: string | null;
    source: string;
    dayCount: number;
    symbolCoverage: number;
    dataSource: 'snapshot' | 'empty';
  };
}> {
  const scope = opts.scope ?? 'all';
  const themes = filterThemesByScope(opts.themes, scope).filter((t) => t.family !== 'benchmark');
  const snap = await loadInstData();
  const bySym = snap?.bySymbol || {};
  const priceBySym = new Map(opts.stocks.map((s) => [s.symbol, s.price || 0]));
  const stocksByTheme = new Map<string, Stock[]>();
  for (const s of opts.stocks) {
    const list = stocksByTheme.get(s.themeSlug) || [];
    list.push(s);
    stocksByTheme.set(s.themeSlug, list);
  }

  // global day axis from snapshot
  const days = (snap?.days || []).slice().sort();
  const dayCount = days.length;

  const rows: ThemeFlowRow[] = [];
  let covered = 0;

  for (const th of themes) {
    const members = stocksByTheme.get(th.slug) || [];
    // per day net yi for theme
    const dayNet = new Map<string, number>();
    let memberHit = 0;
    for (const st of members) {
      const series = bySym[st.symbol];
      if (!series?.length) continue;
      memberHit += 1;
      const px = priceBySym.get(st.symbol) || 0;
      for (const pt of series) {
        const yi = sharesToYi(pt.netShares, px);
        dayNet.set(pt.date, (dayNet.get(pt.date) || 0) + yi);
      }
    }
    if (memberHit) covered += 1;

    const sortedDays = Array.from(dayNet.keys()).sort();
    const seriesYi = sortedDays.map((d) => dayNet.get(d) || 0);
    const net1dYi = sumLast(seriesYi, 1);
    const netPrev1dYi =
      seriesYi.length >= 2 ? seriesYi[seriesYi.length - 2] : 0;
    const net5dYi = sumLast(seriesYi, 5);
    const net20dYi = sumLast(seriesYi, 20);
    const n5 = Math.min(5, seriesYi.length) || 1;
    const n20 = Math.min(20, seriesYi.length) || 1;
    const avg5Yi = net5dYi / n5;
    const avg20Yi = net20dYi / n20;
    const accelYi = avg5Yi - avg20Yi;
    const { state, stateLabel } = classify(net5dYi, accelYi);
    const asOf = sortedDays.length ? sortedDays[sortedDays.length - 1] : snap?.asOf || null;

    const chgs = members.map((m) => m.changePct).filter((x) => Number.isFinite(x));
    const avgChangePct =
      chgs.length > 0 ? round4(chgs.reduce((a, b) => a + b, 0) / chgs.length) : null;

    rows.push({
      slug: th.slug,
      title: th.title,
      tier: th.tier,
      family: th.family,
      colorHint: th.slug,
      net1dYi: round4(net1dYi),
      netPrev1dYi: round4(netPrev1dYi),
      net5dYi: round4(net5dYi),
      net20dYi: round4(net20dYi),
      avg5Yi: round4(avg5Yi),
      avg20Yi: round4(avg20Yi),
      accelYi: round4(accelYi),
      state,
      stateLabel,
      stockCount: members.length,
      avgChangePct,
      asOf,
    });
  }

  // 預設依近5日淨額排序
  rows.sort((a, b) => b.net5dYi - a.net5dYi);

  return {
    rows,
    meta: {
      asOf: snap?.asOf || rows[0]?.asOf || null,
      source: snap?.source || 'none',
      dayCount,
      symbolCoverage: Object.keys(bySym).length,
      dataSource: snap?.bySymbol ? 'snapshot' : 'empty',
    },
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function tideStateCounts(rows: ThemeFlowRow[]): Record<TideState, number> {
  const c: Record<TideState, number> = {
    inflow_accel: 0,
    inflow_slow: 0,
    outflow_slow: 0,
    outflow_accel: 0,
  };
  for (const r of rows) c[r.state] += 1;
  return c;
}

function pickBriefItem(r: ThemeFlowRow) {
  return {
    slug: r.slug,
    title: r.title,
    net1dYi: r.net1dYi,
    avgChangePct: r.avgChangePct,
  };
}

/** 盤後「今日重點」：買超／賣超 Top、昨日買超回顧、規則摘要 */
export function buildThemeFlowBrief(rows: ThemeFlowRow[]): ThemeFlowBrief {
  const asOf = rows.find((r) => r.asOf)?.asOf || null;
  const by1d = [...rows].sort((a, b) => b.net1dYi - a.net1dYi);
  const topBuy1d = by1d.filter((r) => r.net1dYi > 0).slice(0, 3).map(pickBriefItem);
  const topSell1d = [...by1d]
    .filter((r) => r.net1dYi < 0)
    .sort((a, b) => a.net1dYi - b.net1dYi)
    .slice(0, 3)
    .map(pickBriefItem);

  const prevBuyReview = [...rows]
    .filter((r) => r.netPrev1dYi > 0)
    .sort((a, b) => b.netPrev1dYi - a.netPrev1dYi)
    .slice(0, 3)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      netPrev1dYi: r.netPrev1dYi,
      avgChangePct: r.avgChangePct,
    }));

  const tideLeaders = rows
    .filter((r) => r.state === 'inflow_accel')
    .slice(0, 3)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      stateLabel: r.stateLabel,
      net5dYi: r.net5dYi,
    }));

  const buyTxt = topBuy1d.length
    ? topBuy1d.map((t) => `${t.title}（${fmtSigned(t.net1dYi)}億）`).join('、')
    : '無明顯買超題材';
  const sellTxt = topSell1d.length
    ? topSell1d.map((t) => `${t.title}（${fmtSigned(t.net1dYi)}億）`).join('、')
    : '無明顯賣超題材';
  let reviewTxt = '';
  if (prevBuyReview.length) {
    const avg =
      prevBuyReview
        .map((p) => p.avgChangePct)
        .filter((x): x is number => x != null)
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;
    const best = [...prevBuyReview].sort(
      (a, b) => (b.avgChangePct ?? -999) - (a.avgChangePct ?? -999),
    )[0];
    reviewTxt =
      avg != null
        ? `回顧：昨日法人買超較多的題材，今日成分均漲跌約 ${fmtSigned(avg)}%` +
          (best?.avgChangePct != null
            ? `（最佳 ${best.title} ${fmtSigned(best.avgChangePct)}%）`
            : '') +
          '。'
        : '';
  }
  const leadTxt = tideLeaders.length
    ? `近5日潮汐偏「漲潮」者含 ${tideLeaders.map((t) => t.title).join('、')}。`
    : '';

  const summary = [
    `法人今日買超較集中：${buyTxt}；賣超較集中：${sellTxt}。`,
    reviewTxt,
    leadTxt,
    '以上為公開籌碼與收盤價之統計描述，非投資建議。',
  ]
    .filter(Boolean)
    .join('');

  return {
    asOf,
    topBuy1d,
    topSell1d,
    prevBuyReview,
    tideLeaders,
    summary,
  };
}

function fmtSigned(n: number): string {
  const s = n >= 0 ? '+' : '';
  return `${s}${Math.round(n * 100) / 100}`;
}

export type ThemeFlowFramePoint = {
  slug: string;
  title: string;
  net5dYi: number;
  accelYi: number;
  net20dYi: number;
  state: TideState;
  stateLabel: string;
};

export type ThemeFlowFrame = {
  date: string;
  points: ThemeFlowFramePoint[];
};

/** 回放用：每個交易日的泡泡座標（近5日淨額 × 加速度） */
export async function buildThemeFlowFrames(opts: {
  themes: Theme[];
  stocks: Stock[];
  scope?: ThemeScope;
  /** 最多幾根 frame（從最舊到最新截尾） */
  maxFrames?: number;
}): Promise<{ frames: ThemeFlowFrame[]; meta: { dayCount: number; dataSource: 'snapshot' | 'empty' } }> {
  const scope = opts.scope ?? 'all';
  const maxFrames = opts.maxFrames ?? 20;
  const themes = filterThemesByScope(opts.themes, scope).filter((t) => t.family !== 'benchmark');
  const snap = await loadInstData();
  const bySym = snap?.bySymbol || {};
  if (!Object.keys(bySym).length) {
    return { frames: [], meta: { dayCount: 0, dataSource: 'empty' } };
  }

  const priceBySym = new Map(opts.stocks.map((s) => [s.symbol, s.price || 0]));
  const stocksByTheme = new Map<string, Stock[]>();
  for (const s of opts.stocks) {
    const list = stocksByTheme.get(s.themeSlug) || [];
    list.push(s);
    stocksByTheme.set(s.themeSlug, list);
  }

  // theme -> sorted day series of daily yi
  const themeSeries = new Map<string, { title: string; days: string[]; yi: number[] }>();
  const allDays = new Set<string>();

  for (const th of themes) {
    const members = stocksByTheme.get(th.slug) || [];
    const dayNet = new Map<string, number>();
    for (const st of members) {
      const series = bySym[st.symbol];
      if (!series?.length) continue;
      const px = priceBySym.get(st.symbol) || 0;
      for (const pt of series) {
        dayNet.set(pt.date, (dayNet.get(pt.date) || 0) + sharesToYi(pt.netShares, px));
        allDays.add(pt.date);
      }
    }
    const days = Array.from(dayNet.keys()).sort();
    themeSeries.set(th.slug, {
      title: th.title,
      days,
      yi: days.map((d) => dayNet.get(d) || 0),
    });
  }

  const axis = Array.from(allDays).sort();
  const useAxis = axis.slice(Math.max(0, axis.length - maxFrames));

  const frames: ThemeFlowFrame[] = useAxis.map((date) => {
    const points: ThemeFlowFramePoint[] = [];
    for (const th of themes) {
      const ser = themeSeries.get(th.slug);
      if (!ser || !ser.days.length) continue;
      // index of date in this theme's series (or last known <= date)
      let idx = ser.days.indexOf(date);
      if (idx < 0) {
        idx = -1;
        for (let i = 0; i < ser.days.length; i++) {
          if (ser.days[i] <= date) idx = i;
        }
        if (idx < 0) continue;
      }
      const slice = ser.yi.slice(0, idx + 1);
      const net5dYi = sumLast(slice, 5);
      const net20dYi = sumLast(slice, 20);
      const n5 = Math.min(5, slice.length) || 1;
      const n20 = Math.min(20, slice.length) || 1;
      const avg5Yi = net5dYi / n5;
      const avg20Yi = net20dYi / n20;
      const accelYi = avg5Yi - avg20Yi;
      const { state, stateLabel } = classify(net5dYi, accelYi);
      points.push({
        slug: th.slug,
        title: ser.title,
        net5dYi: round4(net5dYi),
        accelYi: round4(accelYi),
        net20dYi: round4(net20dYi),
        state,
        stateLabel,
      });
    }
    return { date, points };
  });

  return {
    frames,
    meta: { dayCount: frames.length, dataSource: 'snapshot' },
  };
}

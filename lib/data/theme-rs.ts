/**
 * 題材相對強弱（L2，RRG 精神自算，不稱商標）
 * RS Ratio ≈ 100 為對大盤中性；Momentum 為 RS 的變化速度
 */
import 'server-only';
import type { Stock, Theme } from '../types';
import { filterThemesByScope, type ThemeScope } from './theme-scope';

export type RsQuadrant = 'leading' | 'weakening' | 'lagging' | 'improving';

export type ThemeRsRow = {
  slug: string;
  title: string;
  tier: Theme['tier'];
  family: Theme['family'];
  /** 相對強度比（中性≈100） */
  rsRatio: number;
  /** 相對動量（中性≈100） */
  rsMomentum: number;
  quadrant: RsQuadrant;
  quadrantLabel: string;
  /** 近 20 日題材等權報酬 % */
  ret20d: number;
  stockCount: number;
  asOf: string | null;
};

type Bar = { date: string; close: number };

function classifyRs(rs: number, mom: number): { quadrant: RsQuadrant; quadrantLabel: string } {
  if (rs >= 100 && mom >= 100) return { quadrant: 'leading', quadrantLabel: '領先' };
  if (rs >= 100 && mom < 100) return { quadrant: 'weakening', quadrantLabel: '弱化' };
  if (rs < 100 && mom < 100) return { quadrant: 'lagging', quadrantLabel: '落後' };
  return { quadrant: 'improving', quadrantLabel: '改善' };
}

async function loadCloses(
  symbols: string[],
  lookback = 80,
): Promise<{ bySymbol: Map<string, Bar[]>; asOf: string | null }> {
  const bySymbol = new Map<string, Bar[]>();
  try {
    const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import('@/lib/supabase');
    if (!isSupabaseAdminConfigured()) return { bySymbol, asOf: null };
    const sb = getSupabaseAdminClient();
    if (!sb) return { bySymbol, asOf: null };

    const start = new Date();
    start.setDate(start.getDate() - lookback);
    const startIso = start.toISOString().slice(0, 10);

    // 分批 symbol
    const chunkSize = 40;
    let asOf: string | null = null;
    for (let i = 0; i < symbols.length; i += chunkSize) {
      const chunk = symbols.slice(i, i + chunkSize);
      const { data, error } = await sb
        .from('stock_prices')
        .select('symbol,trade_date,close')
        .in('symbol', chunk)
        .gte('trade_date', startIso)
        .order('trade_date', { ascending: true });
      if (error) {
        console.error('[theme-rs] prices', error.message);
        continue;
      }
      for (const r of (data || []) as Array<{ symbol: string; trade_date: string; close: number }>) {
        const c = Number(r.close);
        if (!c) continue;
        const date = String(r.trade_date).slice(0, 10);
        if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, []);
        bySymbol.get(r.symbol)!.push({ date, close: c });
        if (!asOf || date > asOf) asOf = date;
      }
    }
    return { bySymbol, asOf };
  } catch (e) {
    console.error('[theme-rs] loadCloses', e);
    return { bySymbol, asOf: null };
  }
}

function dailyEqualWeightIndex(
  symbols: string[],
  bySymbol: Map<string, Bar[]>,
  dates: string[],
): number[] {
  // map symbol -> date -> close
  const maps = symbols.map((s) => {
    const m = new Map<string, number>();
    for (const b of bySymbol.get(s) || []) m.set(b.date, b.close);
    return m;
  });
  const idx: number[] = [];
  let level = 100;
  idx.push(level);
  for (let i = 1; i < dates.length; i++) {
    const d0 = dates[i - 1];
    const d1 = dates[i];
    const rets: number[] = [];
    for (const m of maps) {
      const c0 = m.get(d0);
      const c1 = m.get(d1);
      if (c0 && c1) rets.push(c1 / c0 - 1);
    }
    const r = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
    level = level * (1 + r);
    idx.push(level);
  }
  return idx;
}

function unionDates(bySymbol: Map<string, Bar[]>, symbols: string[]): string[] {
  const s = new Set<string>();
  for (const sym of symbols) {
    for (const b of bySymbol.get(sym) || []) s.add(b.date);
  }
  return Array.from(s).sort();
}

function roc(arr: number[], n: number): number {
  if (arr.length < n + 1) return 0;
  const a = arr[arr.length - 1];
  const b = arr[arr.length - 1 - n];
  if (!b) return 0;
  return (a / b - 1) * 100;
}

export async function buildThemeRs(opts: {
  themes: Theme[];
  stocks: Stock[];
  scope?: ThemeScope;
  /** RS 計算窗口（交易日近似） */
  window?: number;
}): Promise<{
  rows: ThemeRsRow[];
  meta: { asOf: string | null; dataSource: 'supabase' | 'empty'; symbolBars: number };
}> {
  const scope = opts.scope ?? 'all';
  const window = opts.window ?? 60;
  const themes = filterThemesByScope(opts.themes, scope).filter((t) => t.family !== 'benchmark');
  const symbols = opts.stocks.map((s) => s.symbol);
  const { bySymbol, asOf } = await loadCloses(symbols, window + 30);
  if (!bySymbol.size) {
    return { rows: [], meta: { asOf: null, dataSource: 'empty', symbolBars: 0 } };
  }

  const stocksByTheme = new Map<string, string[]>();
  for (const s of opts.stocks) {
    const list = stocksByTheme.get(s.themeSlug) || [];
    list.push(s.symbol);
    stocksByTheme.set(s.themeSlug, list);
  }

  const allDates = unionDates(bySymbol, symbols);
  if (allDates.length < 15) {
    return { rows: [], meta: { asOf, dataSource: 'supabase', symbolBars: bySymbol.size } };
  }
  // 使用最近 window 日
  const dates = allDates.slice(-Math.min(window + 5, allDates.length));
  const benchIdx = dailyEqualWeightIndex(symbols, bySymbol, dates);

  const rows: ThemeRsRow[] = [];
  for (const th of themes) {
    const members = stocksByTheme.get(th.slug) || [];
    if (!members.length) continue;
    const themeIdx = dailyEqualWeightIndex(members, bySymbol, dates);
    // RS line = theme / bench * 100
    const rsLine = themeIdx.map((v, i) => (benchIdx[i] ? (v / benchIdx[i]) * 100 : 100));
    // JdK-style: ratio of RS to its SMA10, momentum = ROC of ratio
    const smaN = 10;
    const rsRatioSeries: number[] = [];
    for (let i = 0; i < rsLine.length; i++) {
      const from = Math.max(0, i - smaN + 1);
      const slice = rsLine.slice(from, i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / slice.length;
      rsRatioSeries.push(sma ? (rsLine[i] / sma) * 100 : 100);
    }
    const rsRatio = rsRatioSeries[rsRatioSeries.length - 1] || 100;
    // momentum: 100 + ROC(rsRatio, 5) clipped-ish around 100
    const momRoc = roc(rsRatioSeries, 5);
    const rsMomentum = 100 + momRoc;
    const { quadrant, quadrantLabel } = classifyRs(rsRatio, rsMomentum);
    const ret20d = roc(themeIdx, Math.min(20, themeIdx.length - 1));

    rows.push({
      slug: th.slug,
      title: th.title,
      tier: th.tier,
      family: th.family,
      rsRatio: Math.round(rsRatio * 100) / 100,
      rsMomentum: Math.round(rsMomentum * 100) / 100,
      quadrant,
      quadrantLabel,
      ret20d: Math.round(ret20d * 100) / 100,
      stockCount: members.length,
      asOf,
    });
  }

  rows.sort((a, b) => b.rsRatio - a.rsRatio);
  return {
    rows,
    meta: { asOf, dataSource: 'supabase', symbolBars: bySymbol.size },
  };
}

export type DualAxisRow = {
  slug: string;
  title: string;
  tier: number;
  family: string;
  tideState: string;
  tideLabel: string;
  net5dYi: number;
  accelYi: number;
  rsRatio: number;
  rsMomentum: number;
  quadrant: RsQuadrant;
  quadrantLabel: string;
  /** 籌碼流入且價領先／改善 */
  resonance: boolean;
};

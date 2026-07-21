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
  asOf: string | null;
};

type InstSnap = {
  asOf?: string;
  days?: string[];
  bySymbol?: Record<string, Array<{ date: string; netShares: number }>>;
  source?: string;
};

function loadInstSnapshot(): InstSnap | null {
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'institutional_snapshot.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as InstSnap;
  } catch {
    return null;
  }
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

export function buildThemeFlow(opts: {
  themes: Theme[];
  stocks: Stock[];
  scope?: ThemeScope;
}): {
  rows: ThemeFlowRow[];
  meta: {
    asOf: string | null;
    source: string;
    dayCount: number;
    symbolCoverage: number;
    dataSource: 'snapshot' | 'empty';
  };
} {
  const scope = opts.scope ?? 'all';
  const themes = filterThemesByScope(opts.themes, scope).filter((t) => t.family !== 'benchmark');
  const snap = loadInstSnapshot();
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
    const net5dYi = sumLast(seriesYi, 5);
    const net20dYi = sumLast(seriesYi, 20);
    const n5 = Math.min(5, seriesYi.length) || 1;
    const n20 = Math.min(20, seriesYi.length) || 1;
    const avg5Yi = net5dYi / n5;
    const avg20Yi = net20dYi / n20;
    const accelYi = avg5Yi - avg20Yi;
    const { state, stateLabel } = classify(net5dYi, accelYi);
    const asOf = sortedDays.length ? sortedDays[sortedDays.length - 1] : snap?.asOf || null;

    rows.push({
      slug: th.slug,
      title: th.title,
      tier: th.tier,
      family: th.family,
      colorHint: th.slug,
      net1dYi: round4(net1dYi),
      net5dYi: round4(net5dYi),
      net20dYi: round4(net20dYi),
      avg5Yi: round4(avg5Yi),
      avg20Yi: round4(avg20Yi),
      accelYi: round4(accelYi),
      state,
      stateLabel,
      stockCount: members.length,
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

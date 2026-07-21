/**
 * 綜合指標泡泡（G1–G3）
 * X=籌碼強度 0–100 · Y=價動能 0–100 · S=加權綜合分
 * 當日橫截面百分位標準化，避免「億」與「RS」硬併。
 */
import type { ThemeFlowRow, ThemeFlowFrame } from './theme-flow';
import type { ThemeRsRow } from './theme-rs';

export type CompositeWeightMode = 'flow' | 'balanced' | 'price';

export const COMPOSITE_WEIGHTS: Record<
  CompositeWeightMode,
  { flow: number; price: number; label: string; hint: string }
> = {
  flow: { flow: 0.65, price: 0.35, label: '偏籌碼', hint: '法人資金權重較高' },
  balanced: { flow: 0.5, price: 0.5, label: '均衡', hint: '籌碼與價動能各半' },
  price: { flow: 0.35, price: 0.65, label: '偏價', hint: '相對強弱權重較高' },
};

export type CompositeRow = {
  slug: string;
  title: string;
  tier: number;
  family: string;
  /** 籌碼強度 0–100 */
  flowScore: number;
  /** 價動能 0–100；缺 RS 時為 null */
  priceScore: number | null;
  /** 綜合分 S */
  scoreS: number;
  net5dYi: number;
  accelYi: number;
  net20dYi: number;
  tideLabel: string;
  tideState: string;
  quadrantLabel: string;
  rsRatio: number | null;
  rsMomentum: number | null;
  resonance: boolean;
  hasPrice: boolean;
  stockCount: number;
};

export type CompositeFramePoint = {
  slug: string;
  title: string;
  flowScore: number;
  priceScore: number | null;
  scoreS: number;
  net5dYi: number;
  accelYi: number;
};

export type CompositeFrame = {
  date: string;
  points: CompositeFramePoint[];
};

/** 百分位 0–100（同值取平均名次） */
export function percentileScores(values: number[]): number[] {
  const n = values.length;
  if (!n) return [];
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && order[j + 1].v === order[i].v) j++;
    const avgRank = (i + j) / 2;
    const pct = n === 1 ? 50 : (avgRank / (n - 1)) * 100;
    for (let k = i; k <= j; k++) ranks[order[k].i] = pct;
    i = j + 1;
  }
  return ranks;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 籌碼分：淨額為主、加速度為輔 */
function flowRaw(r: { net5dYi: number; accelYi: number }): number {
  return r.net5dYi + 0.35 * r.accelYi;
}

/** 價動能分：RS 與動量混合（已在 100 附近） */
function priceRaw(r: ThemeRsRow): number {
  return 0.55 * r.rsRatio + 0.45 * r.rsMomentum;
}

export function buildCompositeRows(
  flowRows: ThemeFlowRow[],
  rsRows: ThemeRsRow[],
  mode: CompositeWeightMode = 'balanced',
): CompositeRow[] {
  const w = COMPOSITE_WEIGHTS[mode];
  const rsMap = new Map(rsRows.map((r) => [r.slug, r]));

  const flowRaws = flowRows.map((r) => flowRaw(r));
  const flowPct = percentileScores(flowRaws);

  const withRs = flowRows.map((r) => rsMap.get(r.slug));
  const priceRaws = withRs.map((rs) => (rs ? priceRaw(rs) : NaN));
  const validPrice = priceRaws.map((v) => (Number.isFinite(v) ? v : null));
  const finiteIdx = validPrice
    .map((v, i) => (v == null ? -1 : i))
    .filter((i) => i >= 0);
  const finiteVals = finiteIdx.map((i) => validPrice[i] as number);
  const finitePct = percentileScores(finiteVals);
  const pricePct = validPrice.map(() => null as number | null);
  finiteIdx.forEach((i, k) => {
    pricePct[i] = finitePct[k];
  });

  const rows: CompositeRow[] = flowRows.map((r, i) => {
    const rs = rsMap.get(r.slug);
    const fs = flowPct[i] ?? 50;
    const ps = pricePct[i];
    const hasPrice = ps != null;
    // 缺價時 S 主要看籌碼，並略降可解釋性
    const scoreS = hasPrice
      ? w.flow * fs + w.price * (ps as number)
      : fs;
    const quadrant = rs?.quadrant || null;
    const resonance =
      r.net5dYi > 0 &&
      (quadrant === 'leading' || quadrant === 'improving');

    return {
      slug: r.slug,
      title: r.title,
      tier: r.tier,
      family: r.family,
      flowScore: round1(fs),
      priceScore: ps == null ? null : round1(ps),
      scoreS: round1(clamp(scoreS)),
      net5dYi: r.net5dYi,
      accelYi: r.accelYi,
      net20dYi: r.net20dYi,
      tideLabel: r.stateLabel,
      tideState: r.state,
      quadrantLabel: rs?.quadrantLabel || '—',
      rsRatio: rs?.rsRatio ?? null,
      rsMomentum: rs?.rsMomentum ?? null,
      resonance,
      hasPrice,
      stockCount: r.stockCount,
    };
  });

  rows.sort((a, b) => b.scoreS - a.scoreS);
  return rows;
}

/**
 * 回放 frame：X=當日籌碼截面百分位；Y=最新價動能分（固定，缺則用當日加速度百分位）
 */
export function buildCompositeFrames(
  flowFrames: ThemeFlowFrame[],
  latestComposite: CompositeRow[],
  mode: CompositeWeightMode = 'balanced',
): CompositeFrame[] {
  const w = COMPOSITE_WEIGHTS[mode];
  const priceBySlug = new Map(
    latestComposite.map((r) => [r.slug, r.priceScore] as const),
  );
  const titleBySlug = new Map(latestComposite.map((r) => [r.slug, r.title]));

  return flowFrames.map((fr) => {
    const raws = fr.points.map((p) => flowRaw(p));
    const fp = percentileScores(raws);
    // fallback price from accel percentile if no RS
    const accelRaws = fr.points.map((p) => p.accelYi);
    const ap = percentileScores(accelRaws);

    const points: CompositeFramePoint[] = fr.points.map((p, i) => {
      const fs = fp[i] ?? 50;
      const latestP = priceBySlug.get(p.slug);
      const ps = latestP != null ? latestP : ap[i] ?? 50;
      const scoreS = latestP != null ? w.flow * fs + w.price * ps : fs;
      return {
        slug: p.slug,
        title: titleBySlug.get(p.slug) || p.title,
        flowScore: round1(fs),
        priceScore: round1(ps),
        scoreS: round1(clamp(scoreS)),
        net5dYi: p.net5dYi,
        accelYi: p.accelYi,
      };
    });
    return { date: fr.date, points };
  });
}

export function parseWeightMode(raw: string | null | undefined): CompositeWeightMode {
  const v = (raw || '').toLowerCase();
  if (v === 'flow' || v === 'price' || v === 'balanced') return v;
  return 'balanced';
}

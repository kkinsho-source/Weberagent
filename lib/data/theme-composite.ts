/**
 * 綜合指標泡泡（G1–G3）+ 回放 P1 短動能
 * X=籌碼強度 0–100 · Y=價動能/短動能 0–100 · S=加權綜合分
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
  flowScore: number;
  priceScore: number | null;
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
  /** 熱/觀察/降溫/冷 */
  zone: CompositeZone;
};

export type CompositeZone = 'hot' | 'watch' | 'cool' | 'cold';

export type CompositeFramePoint = {
  slug: string;
  title: string;
  flowScore: number;
  /** P1：當日短動能百分位 */
  priceScore: number;
  scoreS: number;
  net5dYi: number;
  accelYi: number;
  zone: CompositeZone;
  resonance: boolean;
};

export type CompositeFrame = {
  date: string;
  points: CompositeFramePoint[];
  /** U5 當日一句導讀 */
  guide: string;
};

export function percentileScores(values: number[]): number[] {
  const n = values.length;
  if (!n) return [];
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
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

function flowRaw(r: { net5dYi: number; accelYi: number }): number {
  return r.net5dYi + 0.35 * r.accelYi;
}

function priceRaw(r: ThemeRsRow): number {
  return 0.55 * r.rsRatio + 0.45 * r.rsMomentum;
}

/** 象限語意（相對中心 50） */
export function compositeZone(flow: number, price: number): CompositeZone {
  const f = flow >= 50;
  const p = price >= 50;
  if (f && p) return 'hot';
  if (!f && p) return 'watch';
  if (f && !p) return 'cool';
  return 'cold';
}

export const ZONE_META: Record<
  CompositeZone,
  { label: string; blurb: string; corner: string }
> = {
  hot: { label: '熱區', blurb: '籌偏強 × 價偏強', corner: '右上' },
  watch: { label: '觀察', blurb: '價偏強、籌未明顯', corner: '左上' },
  cool: { label: '降溫', blurb: '籌仍偏、價偏弱', corner: '右下' },
  cold: { label: '冷區', blurb: '籌弱 × 價弱', corner: '左下' },
};

export function buildCompositeRows(
  flowRows: ThemeFlowRow[],
  rsRows: ThemeRsRow[],
  mode: CompositeWeightMode = 'balanced',
): CompositeRow[] {
  const w = COMPOSITE_WEIGHTS[mode];
  const rsMap = new Map(rsRows.map((r) => [r.slug, r]));

  const flowPct = percentileScores(flowRows.map((r) => flowRaw(r)));
  const withRs = flowRows.map((r) => rsMap.get(r.slug));
  const priceRaws = withRs.map((rs) => (rs ? priceRaw(rs) : NaN));
  const validPrice = priceRaws.map((v) => (Number.isFinite(v) ? v : null));
  const finiteIdx = validPrice.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  const finitePct = percentileScores(finiteIdx.map((i) => validPrice[i] as number));
  const pricePct = validPrice.map(() => null as number | null);
  finiteIdx.forEach((i, k) => {
    pricePct[i] = finitePct[k];
  });

  const rows: CompositeRow[] = flowRows.map((r, i) => {
    const rs = rsMap.get(r.slug);
    const fs = flowPct[i] ?? 50;
    const ps = pricePct[i];
    const hasPrice = ps != null;
    const scoreS = hasPrice ? w.flow * fs + w.price * (ps as number) : fs;
    const quadrant = rs?.quadrant || null;
    const resonance =
      r.net5dYi > 0 && (quadrant === 'leading' || quadrant === 'improving');
    const pShow = ps == null ? 50 : ps;
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
      zone: compositeZone(fs, pShow),
    };
  });

  rows.sort((a, b) => b.scoreS - a.scoreS);
  return rows;
}

/**
 * P1 回放：X=當日籌碼百分位，Y=當日短動能（加速度）百分位
 * → 泡泡可斜向／繞中心換象限
 */
export function buildCompositeFrames(
  flowFrames: ThemeFlowFrame[],
  latestComposite: CompositeRow[],
  mode: CompositeWeightMode = 'balanced',
): CompositeFrame[] {
  const w = COMPOSITE_WEIGHTS[mode];
  const titleBySlug = new Map(latestComposite.map((r) => [r.slug, r.title]));

  return flowFrames.map((fr) => {
    const fp = percentileScores(fr.points.map((p) => flowRaw(p)));
    // 短動能：加速度為主，近5日淨額為輔（當日截面）
    const shortRaw = fr.points.map((p) => p.accelYi + 0.25 * p.net5dYi);
    const sp = percentileScores(shortRaw);

    const points: CompositeFramePoint[] = fr.points.map((p, i) => {
      const fs = fp[i] ?? 50;
      const ps = sp[i] ?? 50;
      const scoreS = w.flow * fs + w.price * ps;
      const zone = compositeZone(fs, ps);
      const resonance = fs >= 60 && ps >= 60;
      return {
        slug: p.slug,
        title: titleBySlug.get(p.slug) || p.title,
        flowScore: round1(fs),
        priceScore: round1(ps),
        scoreS: round1(clamp(scoreS)),
        net5dYi: p.net5dYi,
        accelYi: p.accelYi,
        zone,
        resonance,
      };
    });

    return {
      date: fr.date,
      points,
      guide: buildFrameGuide(fr.date, points),
    };
  });
}

/** U5 當日一句導讀 */
export function buildFrameGuide(date: string, points: CompositeFramePoint[]): string {
  if (!points.length) return `${date}：無資料。`;
  const hot = [...points]
    .filter((p) => p.zone === 'hot')
    .sort((a, b) => b.scoreS - a.scoreS);
  const cold = [...points]
    .filter((p) => p.zone === 'cold')
    .sort((a, b) => a.scoreS - b.scoreS);
  const rising = [...points]
    .filter((p) => p.resonance)
    .sort((a, b) => b.scoreS - a.scoreS);

  const hotTxt = hot.length
    ? `熱區（籌＋短動能都偏強）：${hot
        .slice(0, 3)
        .map((p) => p.title)
        .join('、')}`
    : '熱區較空';
  const coldTxt = cold.length
    ? `冷區：${cold
        .slice(0, 2)
        .map((p) => p.title)
        .join('、')}`
    : '';
  const starTxt = rising.length
    ? `連續偏共振★：${rising
        .slice(0, 2)
        .map((p) => p.title)
        .join('、')}`
    : '';

  return [`${date}｜${hotTxt}`, coldTxt, starTxt, '（相對位置，非買賣建議）']
    .filter(Boolean)
    .join('。');
}

export function buildStaticGuide(rows: CompositeRow[]): string {
  const hot = rows.filter((r) => r.zone === 'hot').slice(0, 3);
  const res = rows.filter((r) => r.resonance).slice(0, 3);
  const hotTxt = hot.length
    ? `目前較靠熱區：${hot.map((r) => r.title).join('、')}`
    : '熱區題材不多';
  const resTxt = res.length
    ? `共振★：${res.map((r) => r.title).join('、')}`
    : '';
  return `${hotTxt}${resTxt ? `；${resTxt}` : ''}。中心=普通；越右上越像「錢有進、價也相對強」。`;
}

export function parseWeightMode(raw: string | null | undefined): CompositeWeightMode {
  const v = (raw || '').toLowerCase();
  if (v === 'flow' || v === 'price' || v === 'balanced') return v;
  return 'balanced';
}

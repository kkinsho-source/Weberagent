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

/** C50：百分位 0–100 → 中心在 0 的座標 −50～+50 */
export const C50_AXIS_MIN = -50;
export const C50_AXIS_MAX = 50;

export function toC50(percentile0to100: number): number {
  return round1(percentile0to100 - 50);
}

/** 象限語意（相對中心 0,0；C50） */
export function compositeZone(flowC50: number, priceC50: number): CompositeZone {
  const f = flowC50 >= 0;
  const p = priceC50 >= 0;
  if (f && p) return 'hot';
  if (!f && p) return 'watch';
  if (f && !p) return 'cool';
  return 'cold';
}

export const ZONE_META: Record<
  CompositeZone,
  {
    label: string;
    blurb: string;
    corner: string;
    /** 象限底色（半透明） */
    area: string;
    /** 泡泡填色 */
    bubble: string;
    /** 泡泡邊框 */
    border: string;
    /** 文字／圖例 */
    text: string;
    /** 表格小徽章底 */
    badgeBg: string;
  }
> = {
  // 右上：熱 — 玫瑰紅
  hot: {
    label: '熱區',
    blurb: '籌偏強 × 價偏強',
    corner: '右上',
    area: 'rgba(244, 63, 94, 0.12)',
    bubble: '#f43f5e',
    border: '#9f1239',
    text: '#9f1239',
    badgeBg: 'bg-rose-100 text-rose-800',
  },
  // 左上：觀察 — 琥珀金
  watch: {
    label: '觀察',
    blurb: '價偏強、籌未明顯',
    corner: '左上',
    area: 'rgba(245, 158, 11, 0.14)',
    bubble: '#f59e0b',
    border: '#b45309',
    text: '#b45309',
    badgeBg: 'bg-amber-100 text-amber-900',
  },
  // 右下：降溫 — 紫色
  cool: {
    label: '降溫',
    blurb: '籌仍偏、價偏弱',
    corner: '右下',
    area: 'rgba(139, 92, 246, 0.12)',
    bubble: '#8b5cf6',
    border: '#6d28d9',
    text: '#6d28d9',
    badgeBg: 'bg-violet-100 text-violet-800',
  },
  // 左下：冷 — 石板灰藍
  cold: {
    label: '冷區',
    blurb: '籌弱 × 價弱',
    corner: '左下',
    area: 'rgba(100, 116, 139, 0.14)',
    bubble: '#64748b',
    border: '#334155',
    text: '#334155',
    badgeBg: 'bg-slate-200 text-slate-700',
  },
};

/** ECharts 四象限 markArea（C50：−50～+50，中心 0） */
export function zoneMarkAreaData() {
  const lo = C50_AXIS_MIN;
  const hi = C50_AXIS_MAX;
  return [
    [
      {
        name: 'watch',
        xAxis: lo,
        yAxis: 0,
        itemStyle: { color: ZONE_META.watch.area },
        label: {
          show: true,
          position: 'insideTopLeft',
          formatter: '觀察 · 左上\n價強籌弱',
          color: ZONE_META.watch.text,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      { xAxis: 0, yAxis: hi },
    ],
    [
      {
        name: 'hot',
        xAxis: 0,
        yAxis: 0,
        itemStyle: { color: ZONE_META.hot.area },
        label: {
          show: true,
          position: 'insideTopRight',
          formatter: '熱區 · 右上\n籌強價強',
          color: ZONE_META.hot.text,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      { xAxis: hi, yAxis: hi },
    ],
    [
      {
        name: 'cold',
        xAxis: lo,
        yAxis: lo,
        itemStyle: { color: ZONE_META.cold.area },
        label: {
          show: true,
          position: 'insideBottomLeft',
          formatter: '冷區 · 左下\n雙弱',
          color: ZONE_META.cold.text,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      { xAxis: 0, yAxis: 0 },
    ],
    [
      {
        name: 'cool',
        xAxis: 0,
        yAxis: lo,
        itemStyle: { color: ZONE_META.cool.area },
        label: {
          show: true,
          position: 'insideBottomRight',
          formatter: '降溫 · 右下\n籌在價軟',
          color: ZONE_META.cool.text,
          fontSize: 11,
          fontWeight: 600,
        },
      },
      { xAxis: hi, yAxis: 0 },
    ],
  ];
}

export function zoneBubbleStyle(zone: CompositeZone, opts?: { resonance?: boolean; muted?: boolean }) {
  const z = ZONE_META[zone];
  return {
    color: z.bubble,
    borderColor: opts?.resonance ? '#0f172a' : z.border,
    borderWidth: opts?.resonance ? 3 : 2,
    opacity: opts?.muted ? 0.45 : 0.92,
    shadowBlur: opts?.resonance ? 10 : 0,
    shadowColor: opts?.resonance ? 'rgba(15,23,42,0.25)' : undefined,
  };
}

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
    const fsPct = flowPct[i] ?? 50;
    const psPct = pricePct[i];
    const hasPrice = psPct != null;
    // S 仍用 0–100 百分位加權，方便排序解讀
    const scoreS = hasPrice ? w.flow * fsPct + w.price * (psPct as number) : fsPct;
    const quadrant = rs?.quadrant || null;
    const resonance =
      r.net5dYi > 0 && (quadrant === 'leading' || quadrant === 'improving');
    const fs = toC50(fsPct);
    const ps = psPct == null ? null : toC50(psPct);
    const pShow = ps == null ? 0 : ps;
    return {
      slug: r.slug,
      title: r.title,
      tier: r.tier,
      family: r.family,
      flowScore: fs,
      priceScore: ps,
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
 * P1 回放：X/Y 為當日截面百分位再轉 C50（−50～+50，中心 0）
 * Y＝當日短動能 → 可斜向／繞中心換象限
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
      const fsPct = fp[i] ?? 50;
      const psPct = sp[i] ?? 50;
      const scoreS = w.flow * fsPct + w.price * psPct;
      const fs = toC50(fsPct);
      const ps = toC50(psPct);
      const zone = compositeZone(fs, ps);
      // 原 0–100 的 ≥60 → C50 ≥ +10
      const resonance = fs >= 10 && ps >= 10;
      return {
        slug: p.slug,
        title: titleBySlug.get(p.slug) || p.title,
        flowScore: fs,
        priceScore: ps,
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
  return `${hotTxt}${resTxt ? `；${resTxt}` : ''}。中心 (0,0)＝普通（C50）；越右上越像「錢有進、價也相對強」。`;
}

export function parseWeightMode(raw: string | null | undefined): CompositeWeightMode {
  const v = (raw || '').toLowerCase();
  if (v === 'flow' || v === 'price' || v === 'balanced') return v;
  return 'balanced';
}

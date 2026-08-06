/**
 * 雷達 HUD SSOT（③ 精煉 · 2026-08）
 * 深色面板 + 柔霧象限 + 距離環
 * 標記預設 M1 柔光圓；軌跡預設 T2 彗星尾；無掃描線
 */

import {
  C100_AXIS_MAX,
  C100_AXIS_MIN,
  ZONE_META,
  type CompositeZone,
} from '@/lib/data/theme-composite';

export const HUD = {
  bg: '#070b14',
  panel: '#0b1220',
  grid: 'rgba(56, 189, 248, 0.08)',
  axis: 'rgba(148, 163, 184, 0.85)',
  axisName: 'rgba(186, 230, 253, 0.9)',
  cross: 'rgba(125, 211, 252, 0.9)',
  crossCore: '#7dd3fc',
  ring: 'rgba(34, 211, 238, 0.28)',
  ringLabel: 'rgba(103, 232, 249, 0.75)',
  trail: 'rgba(34, 211, 238, 0.55)',
  trailFocus: 'rgba(165, 243, 252, 0.9)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  tooltipBg: 'rgba(15, 23, 42, 0.94)',
  tooltipBorder: 'rgba(56, 189, 248, 0.35)',
} as const;

/** 柔霧象限（③：比硬色塊更淡，讓環／點透出來） */
export const HUD_ZONE_AREA: Record<CompositeZone, string> = {
  hot: 'rgba(244, 63, 94, 0.08)',
  watch: 'rgba(251, 191, 36, 0.07)',
  cool: 'rgba(167, 139, 250, 0.07)',
  cold: 'rgba(71, 85, 105, 0.12)',
};

export function hudZoneMarkAreaData() {
  const lo = C100_AXIS_MIN;
  const hi = C100_AXIS_MAX;
  const lab = (z: CompositeZone, name: string) => ({
    name,
    itemStyle: { color: HUD_ZONE_AREA[z] },
    label: {
      show: true,
      formatter: `${ZONE_META[z].corner} ${ZONE_META[z].label}`,
      color: ZONE_META[z].bubble,
      fontSize: 11,
      fontWeight: 600 as const,
    },
  });
  return [
    [
      { ...lab('watch', 'watch'), xAxis: lo, yAxis: 0 },
      { xAxis: 0, yAxis: hi },
    ],
    [
      { ...lab('hot', 'hot'), xAxis: 0, yAxis: 0 },
      { xAxis: hi, yAxis: hi },
    ],
    [
      { ...lab('cold', 'cold'), xAxis: lo, yAxis: lo },
      { xAxis: 0, yAxis: 0 },
    ],
    [
      { ...lab('cool', 'cool'), xAxis: 0, yAxis: lo },
      { xAxis: hi, yAxis: 0 },
    ],
  ];
}

export function hudAxisCommon(name: string, nameGap: number) {
  return {
    name,
    nameLocation: 'middle' as const,
    nameGap,
    nameTextStyle: { color: HUD.axisName, fontSize: 12 },
    min: C100_AXIS_MIN,
    max: C100_AXIS_MAX,
    scale: false,
    splitNumber: 4,
    splitLine: {
      show: true,
      lineStyle: { color: HUD.grid, type: 'dashed' as const, width: 1 },
    },
    axisLine: { lineStyle: { color: HUD.axis, width: 1.25 } },
    axisTick: { lineStyle: { color: HUD.axis } },
    axisLabel: {
      color: HUD.textMuted,
      formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
    },
  };
}

export function hudTooltipBase() {
  return {
    backgroundColor: HUD.tooltipBg,
    borderColor: HUD.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: HUD.text, fontSize: 12 },
    extraCssText:
      'backdrop-filter:blur(6px);box-shadow:0 0 20px rgba(56,189,248,0.12);',
  };
}

/**
 * M1 柔光圓（預設標記）
 * 區色實心 + 克制外暈；非遊戲感火球
 */
export function hudSoftDiscStyle(
  zone: CompositeZone,
  opts?: { resonance?: boolean; muted?: boolean; focus?: boolean },
) {
  const z = ZONE_META[zone];
  if (opts?.muted) {
    return {
      color: 'rgba(148,163,184,0.22)',
      borderColor: 'rgba(148,163,184,0.32)',
      borderWidth: 1,
      shadowBlur: 6,
      shadowColor: 'rgba(148,163,184,0.2)',
    };
  }
  const core = opts?.resonance ? '#fde68a' : z.bubble;
  const glow = opts?.resonance
    ? 'rgba(253, 224, 71, 0.45)'
    : hexToRgba(z.bubble, 0.32);
  return {
    color: core,
    borderColor: opts?.resonance
      ? 'rgba(255,247,237,0.85)'
      : 'rgba(255,255,255,0.42)',
    borderWidth: opts?.focus || opts?.resonance ? 1.75 : 1.15,
    shadowBlur: opts?.focus || opts?.resonance ? 16 : 10,
    shadowColor: glow,
  };
}

/** @deprecated 別名 → M1 柔光圓（舊火球已退役） */
export function hudFireballStyle(
  zone: CompositeZone,
  opts?: { resonance?: boolean; muted?: boolean; focus?: boolean },
) {
  return hudSoftDiscStyle(zone, opts);
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(56,189,248,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** 固定段數 → series id 穩定，ECharts merge 才能平滑延續 */
export const TRAIL_SEG_COUNT = 14;

/** 折線重採樣成固定點數（含端點） */
function resamplePolyline(line: number[][], count: number): number[][] {
  if (line.length === 0 || count <= 0) return [];
  const last = line[line.length - 1];
  if (!last || line.length === 1 || count <= 1) {
    return last ? [last.slice() as number[]] : [];
  }
  // 累積弧長（跳過缺點，避免 undefined[0]）
  const pts: number[][] = [];
  for (const p of line) {
    if (!p || p.length < 2) continue;
    const x = Number(p[0]);
    const y = Number(p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    pts.push([x, y]);
  }
  if (pts.length === 0) return [];
  if (pts.length === 1) {
    return Array.from({ length: count }, () => pts[0]!.slice() as number[]);
  }

  const segLen: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]![0]! - pts[i - 1]![0]!;
    const dy = pts[i]![1]! - pts[i - 1]![1]!;
    total += Math.hypot(dx, dy);
    segLen.push(total);
  }
  if (!Number.isFinite(total) || total < 1e-9) {
    return Array.from({ length: count }, () => pts[pts.length - 1]!.slice() as number[]);
  }
  const out: number[][] = [];
  const lastIdx = pts.length - 1;
  for (let k = 0; k < count; k++) {
    // 夾在 [0, total]：避免 float 讓 target 略大於 total → j 走到 length → undefined[0]
    const target = Math.min(total, Math.max(0, (total * k) / (count - 1)));
    let j = 1;
    while (j < segLen.length && segLen[j]! < target) j++;
    // j 最大只能是 lastIdx（segLen/pts 最後一個有效下標）
    const j0 = Math.min(Math.max(1, j), lastIdx);
    const a = segLen[j0 - 1] ?? 0;
    const b = segLen[j0] ?? total;
    const t = b - a < 1e-9 ? 0 : (target - a) / (b - a);
    const p0 = pts[j0 - 1]!;
    const p1 = pts[j0]!;
    out.push([p0[0]! + (p1[0]! - p0[0]!) * t, p0[1]! + (p1[1]! - p0[1]!) * t]);
  }
  return out;
}

export type HudTrailMode = 'comet' | 'soft' | 'sonar' | 'zone';

/**
 * 回放軌跡：固定 14 段 id（merge 延續）
 * - comet (T2 預設)：頭亮尾淡、偏青白
 * - soft / sonar：淡跡
 * - zone：四色區色
 */
export function hudFadingTrailSeries(opts: {
  slug: string;
  title: string;
  line: number[][];
  focus: boolean;
  mode: HudTrailMode;
  zoneColor?: string;
  /** 無軌跡時仍輸出空 series 以保持 id（可選） */
  alwaysSlots?: boolean;
}): object[] {
  const { slug, title, line, focus, mode, zoneColor } = opts;
  const isComet = mode === 'comet';
  const isZone = mode === 'zone';
  const baseColor = isZone
    ? zoneColor || HUD.trail
    : isComet
      ? focus
        ? '#ecfeff'
        : 'rgba(165,243,252,0.92)'
      : focus
        ? HUD.trailFocus
        : HUD.trail;
  const segs: object[] = [];
  const nSeg = TRAIL_SEG_COUNT;

  const pts =
    line.length >= 2 ? resamplePolyline(line, nSeg + 1) : ([] as number[][]);

  for (let i = 0; i < nSeg; i++) {
    const t = (i + 1) / nSeg;
    // 彗星：更陡的頭亮尾淡；淡跡：較平
    const fade = isComet ? Math.pow(t, 1.65) : Math.pow(t, 1.25);
    const has = pts.length > i + 1;
    let opacity = 0;
    let width = 0;
    if (has) {
      if (isComet) {
        opacity = focus ? 0.04 + fade * 0.92 : 0.03 + fade * 0.62;
        width = focus ? 0.7 + fade * 2.8 : 0.55 + fade * 2.0;
      } else if (focus) {
        opacity = 0.06 + fade * 0.88;
        width = 1.2 + fade * 2.4;
      } else {
        opacity = 0.03 + fade * 0.48;
        width = 0.85 + fade * 1.5;
      }
    }

    segs.push({
      type: 'line' as const,
      id: `trail-${slug}-s${i}`,
      name: title,
      data: has ? [pts[i], pts[i + 1]] : [],
      showSymbol: false,
      silent: true,
      clip: true,
      z: focus ? 2 : 1,
      animation: true,
      animationDurationUpdate: 0,
      lineStyle: {
        color: baseColor,
        width,
        opacity,
        type: 'solid' as const,
        shadowBlur: isComet
          ? focus && t > 0.55
            ? 14
            : t > 0.8
              ? 8
              : 0
          : focus && t > 0.65
            ? 12
            : t > 0.85
              ? 6
              : 0,
        shadowColor: isComet
          ? focus && t > 0.55
            ? 'rgba(224,242,254,0.55)'
            : 'rgba(125,211,252,0.28)'
          : focus && t > 0.65
            ? 'rgba(165,243,252,0.5)'
            : mode === 'sonar' || mode === 'soft'
              ? 'rgba(34,211,238,0.22)'
              : undefined,
      },
    });
  }

  const tip = pts.length ? pts[pts.length - 1] : line[line.length - 1];
  segs.push({
    type: 'scatter' as const,
    id: `trail-${slug}-tip`,
    name: title,
    data: tip ? [{ value: tip }] : [],
    symbolSize: isComet ? (focus ? 11 : 7) : focus ? 10 : 6,
    silent: true,
    z: focus ? 2.5 : 1.5,
    animation: true,
    itemStyle: {
      color: isComet ? (focus ? '#f0fdfa' : '#a5f3fc') : focus ? HUD.trailFocus : baseColor,
      shadowBlur: isComet ? (focus ? 22 : 14) : focus ? 18 : 10,
      shadowColor: isComet
        ? 'rgba(207,250,254,0.9)'
        : focus
          ? 'rgba(165,243,252,0.85)'
          : 'rgba(34,211,238,0.45)',
      opacity: tip ? (focus ? 0.98 : isComet ? 0.72 : 0.55) : 0,
    },
  });

  return segs;
}

/** @deprecated 單一段樣式；新軌跡請用 hudFadingTrailSeries */
export function hudSonarTrailStyle(opts: {
  focus: boolean;
  zoneColor?: string;
  mode: 'sonar' | 'zone' | 'off';
}) {
  if (opts.mode === 'off') return null;
  if (opts.mode === 'zone') {
    return {
      width: opts.focus ? 2.6 : 1.4,
      opacity: opts.focus ? 0.8 : 0.32,
      color: opts.zoneColor || HUD.trail,
      type: 'solid' as const,
      shadowBlur: opts.focus ? 8 : 0,
      shadowColor: opts.focus ? 'rgba(253,224,71,0.35)' : undefined,
    };
  }
  return {
    width: opts.focus ? 2.4 : 1.35,
    opacity: opts.focus ? 0.9 : 0.4,
    color: opts.focus ? HUD.trailFocus : HUD.trail,
    type: (opts.focus ? 'solid' : 'dashed') as 'solid' | 'dashed',
    shadowBlur: opts.focus ? 10 : 4,
    shadowColor: opts.focus
      ? 'rgba(165, 243, 252, 0.55)'
      : 'rgba(34, 211, 238, 0.25)',
  };
}

/** 相容舊 import */
export function hudDiamondStyle(
  zone: CompositeZone,
  opts?: { resonance?: boolean; muted?: boolean; focus?: boolean },
) {
  return hudSoftDiscStyle(zone, opts);
}

function circlePolyline(radius: number, steps = 72): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return pts;
}

export const SONAR_RINGS: ReadonlyArray<{ r: number; label: string }> = [
  { r: 25, label: '近' },
  { r: 50, label: '中' },
  { r: 75, label: '遠' },
  { r: 100, label: '外' },
];

/** 聲納距離環 series */
export function hudSonarRingSeries(): object[] {
  return SONAR_RINGS.map(({ r, label }, idx) => ({
    type: 'line' as const,
    id: `sonar-ring-${r}`,
    name: `__sonar_${r}`,
    data: circlePolyline(r),
    showSymbol: false,
    silent: true,
    clip: true,
    z: 0,
    animation: false,
    lineStyle: {
      color: HUD.ring,
      width: r === 50 ? 1.35 : 1,
      type: (r === 50 ? 'solid' : 'dashed') as 'solid' | 'dashed',
      opacity: 0.55 + idx * 0.05,
    },
    markPoint: {
      silent: true,
      animation: false,
      symbol: 'none',
      data: [
        {
          coord: [r * 0.707, r * 0.707],
          label: {
            show: true,
            formatter: label,
            color: HUD.ringLabel,
            fontSize: 10,
            fontWeight: 600,
            distance: 0,
            backgroundColor: 'rgba(7,11,20,0.65)',
            padding: [2, 4],
            borderRadius: 3,
          },
        },
      ],
    },
  }));
}

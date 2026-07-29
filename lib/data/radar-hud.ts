/**
 * V-穩 + V-聲納：雷達主圖 HUD
 * 深色面板 + 菱形 + 霓虹區 + 掃描線 + 距離環 + 聲納軌跡
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

/** 深色底上較亮的象限填充（聲納環要透出來，略淡） */
export const HUD_ZONE_AREA: Record<CompositeZone, string> = {
  hot: 'rgba(244, 63, 94, 0.11)',
  watch: 'rgba(251, 191, 36, 0.1)',
  cool: 'rgba(167, 139, 250, 0.1)',
  cold: 'rgba(71, 85, 105, 0.16)',
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

/** 火球光暈核心（取代菱形） */
export function hudFireballStyle(
  zone: CompositeZone,
  opts?: { resonance?: boolean; muted?: boolean; focus?: boolean },
) {
  const z = ZONE_META[zone];
  if (opts?.muted) {
    return {
      color: 'rgba(148,163,184,0.25)',
      borderColor: 'rgba(148,163,184,0.35)',
      borderWidth: 1,
      shadowBlur: 8,
      shadowColor: 'rgba(148,163,184,0.25)',
    };
  }
  const core = opts?.resonance ? '#fde68a' : z.bubble;
  const glow = opts?.resonance
    ? 'rgba(253, 224, 71, 0.75)'
    : hexToRgba(z.bubble, 0.65);
  return {
    color: core,
    borderColor: opts?.resonance ? '#fff7ed' : lightenHex(z.bubble),
    borderWidth: opts?.focus || opts?.resonance ? 2.5 : 1.5,
    shadowBlur: opts?.focus || opts?.resonance ? 28 : 18,
    shadowColor: glow,
  };
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(56,189,248,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lightenHex(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#e0f2fe';
  const ch = (i: number) =>
    Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * 0.45 + 255 * 0.55))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/**
 * 回放軌跡：分段漸隱（舊淡 → 新亮），像拖曳餘暉
 * 回傳多條 line series
 */
export function hudFadingTrailSeries(opts: {
  slug: string;
  title: string;
  line: number[][];
  focus: boolean;
  mode: 'sonar' | 'zone';
  zoneColor?: string;
}): object[] {
  const { slug, title, line, focus, mode, zoneColor } = opts;
  if (line.length < 2) return [];

  const baseColor =
    mode === 'zone' ? zoneColor || HUD.trail : focus ? HUD.trailFocus : HUD.trail;
  const segs: object[] = [];
  const n = line.length - 1;

  for (let i = 0; i < n; i++) {
    // t: 0=最舊 … 1=最新
    const t = n === 1 ? 1 : (i + 1) / n;
    const fade = Math.pow(t, 1.35); // 尾巴更快消失
    const opacity = focus
      ? 0.08 + fade * 0.85
      : 0.04 + fade * 0.42;
    const width = focus
      ? 1.1 + fade * 2.2
      : 0.8 + fade * 1.4;

    segs.push({
      type: 'line' as const,
      id: `trail-${slug}-s${i}`,
      name: title,
      data: [line[i], line[i + 1]],
      showSymbol: false,
      silent: true,
      clip: true,
      z: focus ? 2 : 1,
      animation: false,
      lineStyle: {
        color: baseColor,
        width,
        opacity,
        type: focus && t > 0.85 ? ('solid' as const) : ('solid' as const),
        shadowBlur: focus && t > 0.7 ? 10 : t > 0.85 ? 6 : 0,
        shadowColor:
          focus && t > 0.7
            ? 'rgba(165,243,252,0.45)'
            : mode === 'sonar'
              ? 'rgba(34,211,238,0.2)'
              : undefined,
      },
    });
  }

  // 最新端：回波火點
  const tip = line[line.length - 1];
  segs.push({
    type: 'scatter' as const,
    id: `trail-${slug}-tip`,
    name: title,
    data: [{ value: tip }],
    symbolSize: focus ? 9 : 5,
    silent: true,
    z: focus ? 2.5 : 1.5,
    animation: false,
    itemStyle: {
      color: focus ? HUD.trailFocus : baseColor,
      shadowBlur: focus ? 16 : 8,
      shadowColor: focus
        ? 'rgba(165,243,252,0.8)'
        : 'rgba(34,211,238,0.4)',
      opacity: focus ? 0.95 : 0.55,
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
  return hudFireballStyle(zone, opts);
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

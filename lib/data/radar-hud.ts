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

/** 菱形標記 */
export function hudDiamondStyle(
  zone: CompositeZone,
  opts?: { resonance?: boolean; muted?: boolean },
) {
  const z = ZONE_META[zone];
  return {
    color: opts?.muted ? 'rgba(148,163,184,0.35)' : z.bubble,
    borderColor: opts?.resonance ? '#fde68a' : z.border,
    borderWidth: opts?.resonance ? 2.5 : 1.5,
    shadowBlur: opts?.resonance ? 12 : 6,
    shadowColor: opts?.resonance
      ? 'rgba(253, 224, 71, 0.55)'
      : `${z.bubble}99`,
  };
}

/** 聲納距離環：C100 平面上以原點為心的同心圓 */
function circlePolyline(radius: number, steps = 72): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return pts;
}

/** 環半徑（C100 距離）與短標 */
export const SONAR_RINGS: ReadonlyArray<{ r: number; label: string }> = [
  { r: 25, label: '近' },
  { r: 50, label: '中' },
  { r: 75, label: '遠' },
  { r: 100, label: '外' },
];

/**
 * 獨立 series：距離環 + 環標（z 最低）
 * 語意：離 (0,0) 越遠＝越極端
 */
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

/** 回放軌跡：聲納樣式 */
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

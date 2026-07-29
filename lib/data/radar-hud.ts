/**
 * V-穩：雷達主圖 HUD 換皮（不改座標／S／zone 語意）
 * 深色面板 + 菱形標記 + 霓虹區 + 弱掃描線
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
  grid: 'rgba(56, 189, 248, 0.12)',
  axis: 'rgba(148, 163, 184, 0.85)',
  axisName: 'rgba(186, 230, 253, 0.9)',
  cross: 'rgba(125, 211, 252, 0.85)',
  crossCore: '#7dd3fc',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  tooltipBg: 'rgba(15, 23, 42, 0.94)',
  tooltipBorder: 'rgba(56, 189, 248, 0.35)',
} as const;

/** 深色底上較亮的象限填充 */
export const HUD_ZONE_AREA: Record<CompositeZone, string> = {
  hot: 'rgba(244, 63, 94, 0.16)',
  watch: 'rgba(251, 191, 36, 0.14)',
  cool: 'rgba(167, 139, 250, 0.14)',
  cold: 'rgba(71, 85, 105, 0.22)',
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
    extraCssText: 'backdrop-filter:blur(6px);box-shadow:0 0 20px rgba(56,189,248,0.12);',
  };
}

/** 菱形標記；共振用稍尖的菱形感（仍 diamond + 外框） */
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

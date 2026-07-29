/**
 * 雷達圖座標軸：讓中心點固定在畫面正中
 */

/** 以 0 為中心的對稱半軸長（籌碼億、加速度等） */
export function halfRangeAroundZero(
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): number {
  const minHalf = opts?.minHalf ?? 1;
  const pad = opts?.pad ?? 1.15;
  let half = minHalf;
  for (const v of values) {
    if (Number.isFinite(v)) half = Math.max(half, Math.abs(v));
  }
  return niceCeil(half * pad);
}

/** 以 center 為中心的對稱半軸長（RS 中性=100） */
export function halfRangeAroundCenter(
  center: number,
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): number {
  const minHalf = opts?.minHalf ?? 10;
  const pad = opts?.pad ?? 1.15;
  let half = minHalf;
  for (const v of values) {
    if (Number.isFinite(v)) half = Math.max(half, Math.abs(v - center));
  }
  return niceCeil(half * pad);
}

/** @deprecated */
export function symmetricAroundZero(
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): { min: number; max: number } {
  const h = halfRangeAroundZero(values, opts);
  return { min: -h, max: h };
}

/** @deprecated */
export function symmetricAroundCenter(
  center: number,
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): { min: number; max: number } {
  const h = halfRangeAroundCenter(center, values, opts);
  return { min: center - h, max: center + h };
}

function niceCeil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const m = n / base;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * base;
}

/** 固定中心十字（獨立 series，不跟泡泡 data 一起重繪） */
export function fixedCenterCrossSeries(center: [number, number] = [0, 0], label = '中性') {
  return {
    id: 'fixed-center-cross',
    type: 'scatter' as const,
    name: '__center__',
    data: [{ value: center, name: label }],
    symbolSize: 0,
    silent: true,
    tooltip: { show: false },
    z: 2,
    animation: false,
    markLine: {
      silent: true,
      symbol: 'none',
      animation: false,
      lineStyle: { color: '#64748b', width: 1.5, type: 'solid' as const },
      data: [{ xAxis: center[0] }, { yAxis: center[1] }],
      label: { show: false },
    },
    markPoint: {
      silent: true,
      animation: false,
      data: [
        {
          coord: center,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#475569',
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: label,
            position: 'right' as const,
            color: '#475569',
            fontSize: 11,
            fontWeight: 600,
            distance: 6,
          },
        },
      ],
    },
  };
}

/** 繪圖區四邊等距，讓資料中心≈畫面視覺中心 */
export const SQUARE_GRID = { left: 52, right: 52, top: 44, bottom: 52 };

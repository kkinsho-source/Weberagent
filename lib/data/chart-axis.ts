/**
 * 雷達圖座標軸：讓中心點固定在畫面正中
 * （避免 ECharts 依資料單邊伸縮，導致 0 或 100 跑偏）
 */

/** 以 0 為中心的對稱範圍（籌碼億、加速度等） */
export function symmetricAroundZero(
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): { min: number; max: number } {
  const minHalf = opts?.minHalf ?? 1;
  const pad = opts?.pad ?? 1.12;
  let half = minHalf;
  for (const v of values) {
    if (Number.isFinite(v)) half = Math.max(half, Math.abs(v));
  }
  half = niceCeil(half * pad);
  return { min: -half, max: half };
}

/** 以 center 為中心的對稱範圍（RS 中性=100） */
export function symmetricAroundCenter(
  center: number,
  values: number[],
  opts?: { minHalf?: number; pad?: number },
): { min: number; max: number } {
  const minHalf = opts?.minHalf ?? 10;
  const pad = opts?.pad ?? 1.12;
  let half = minHalf;
  for (const v of values) {
    if (Number.isFinite(v)) half = Math.max(half, Math.abs(v - center));
  }
  half = niceCeil(half * pad);
  return { min: center - half, max: center + half };
}

function niceCeil(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1;
  if (n <= 1) return 1;
  if (n <= 2) return 2;
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  // 10 以上：取 1/2/5 × 10^k
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const m = n / base;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * base;
}

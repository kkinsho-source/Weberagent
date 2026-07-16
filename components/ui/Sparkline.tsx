'use client';

/** 迷你走勢線（純 SVG，無依賴） */
export function Sparkline({
  values,
  width = 72,
  height = 22,
  stroke = '#3b82f6',
}: {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length < 2) {
    return <span className="inline-block w-[72px] text-center text-[10px] text-slate-300">—</span>;
  }
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pts = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * (width - 2) + 1;
      const y = height - 1 - ((v - min) / span) * (height - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = nums[nums.length - 1] >= nums[0];
  return (
    <svg width={width} height={height} className="inline-block align-middle" aria-hidden>
      <polyline
        fill="none"
        stroke={up ? '#ef4444' : '#10b981'}
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}

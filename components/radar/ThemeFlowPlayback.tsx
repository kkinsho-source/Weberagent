'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ThemeFamily } from '@/lib/types';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';
import { symmetricAroundZero } from '@/lib/data/chart-axis';

export type PlayFrame = {
  date: string;
  points: Array<{
    slug: string;
    title: string;
    net5dYi: number;
    accelYi: number;
    net20dYi: number;
    stateLabel: string;
    state?: string;
    family?: ThemeFamily;
  }>;
};

const STATE_COLOR: Record<string, string> = {
  inflow_accel: 'rgba(225, 29, 72, 0.72)',
  inflow_slow: 'rgba(217, 119, 6, 0.65)',
  outflow_slow: 'rgba(14, 165, 233, 0.55)',
  outflow_accel: 'rgba(100, 116, 139, 0.55)',
};

const SOFT_TRAIL = 'rgba(148, 163, 184, 0.45)';

export function ThemeFlowPlayback({
  frames,
  familyBySlug: _familyBySlug,
}: {
  frames: PlayFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  void _familyBySlug;
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  /** B2：預設淡灰軌跡，避免彩虹亂 */
  const [trailMode, setTrailMode] = useState<'off' | 'soft'>('soft');

  useEffect(() => {
    setIdx(Math.max(0, frames.length - 1));
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 650);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  const frame = frames[idx] || frames[frames.length - 1];

  const option = useMemo(() => {
    const pts = frame?.points || [];
    // 全序列取範圍，回放時軸不跳；中心 (0,0) 固定
    const allX: number[] = [];
    const allY: number[] = [];
    for (const f of frames) {
      for (const p of f.points) {
        allX.push(p.net5dYi);
        allY.push(p.accelYi);
      }
    }
    const rx = symmetricAroundZero(allX.length ? allX : [0], { minHalf: 0.5 });
    const ry = symmetricAroundZero(allY.length ? allY : [0], { minHalf: 0.2 });
    const half = Math.max(rx.max, ry.max);
    const xMin = -half;
    const xMax = half;
    const yMin = -half;
    const yMax = half;

    const scatter = pts.map((r) => {
      const st = (r as { state?: string }).state || '';
      const color = STATE_COLOR[st] || 'rgba(100, 116, 139, 0.6)';
      return {
        name: r.title,
        value: [
          r.net5dYi,
          r.accelYi,
          Math.max(8, Math.min(56, Math.sqrt(Math.abs(r.net20dYi)) * 4 + 8)),
        ],
        itemStyle: {
          color,
          borderColor: '#fff',
          borderWidth: 1,
        },
      };
    });

    const trailSeries: object[] = [];
    if (trailMode === 'soft' && idx > 0) {
      const slugs = new Set<string>();
      for (const f of frames.slice(0, idx + 1)) {
        for (const p of f.points) slugs.add(p.slug);
      }
      const limited = [...slugs].slice(0, 8);
      for (const slug of limited) {
        const line: number[][] = [];
        let title = slug;
        for (let i = 0; i <= idx; i++) {
          const p = frames[i]?.points.find((x) => x.slug === slug);
          if (!p) continue;
          title = p.title;
          line.push([p.net5dYi, p.accelYi]);
        }
        if (line.length < 2) continue;
        trailSeries.push({
          type: 'line',
          name: title,
          data: line,
          showSymbol: false,
          lineStyle: { width: 1.25, color: SOFT_TRAIL },
          z: 1,
          silent: true,
        });
      }
    }

    return {
      animationDurationUpdate: 400,
      grid: { left: 56, right: 28, top: 36, bottom: 48 },
      tooltip: {
        trigger: 'item',
        formatter: (p: {
          seriesType?: string;
          data?: { name?: string; value?: number[] };
        }) => {
          if (p.seriesType === 'line') return '';
          const d = p.data;
          if (!d?.value) return '';
          return `${d.name}<br/>近5日 ${d.value[0].toFixed(2)} 億<br/>加速度 ${d.value[1].toFixed(2)}`;
        },
      },
      xAxis: {
        name: '近5日淨額（億）',
        nameGap: 28,
        nameLocation: 'middle',
        min: xMin,
        max: xMax,
        scale: false,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '加速度',
        nameGap: 42,
        nameLocation: 'middle',
        min: yMin,
        max: yMax,
        scale: false,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series: [
        ...trailSeries,
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data: scatter,
          z: 3,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#64748b', width: 1.25 },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
            label: { show: false },
          },
          markPoint: {
            silent: true,
            data: [
              {
                coord: [0, 0],
                symbol: 'circle',
                symbolSize: 7,
                itemStyle: { color: '#64748b', borderColor: '#fff', borderWidth: 2 },
                label: {
                  show: true,
                  formatter: '中性',
                  position: 'right',
                  color: '#64748b',
                  fontSize: 11,
                  fontWeight: 600,
                  distance: 6,
                },
              },
            ],
          },
        },
      ],
    };
  }, [frame, frames, idx, trailMode]);

  const onPlay = useCallback(() => {
    if (idx >= frames.length - 1) setIdx(0);
    setPlaying(true);
  }, [idx, frames.length]);

  if (!frames.length) {
    return (
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          三、舊版籌碼回放
        </p>
        <RadarEmptyBlock title="籌碼回放暫時沒有資料">
          需要多個交易日的法人紀錄。主路徑請用上方「最近怎麼移動」。
        </RadarEmptyBlock>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          三、舊版籌碼回放
        </p>
        <h3 className="text-base font-semibold text-slate-800">資金軌跡回放</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          純法人座標逐日移動。若要看綜合座標（籌×價），請用上方主回放。
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            目前{' '}
            <span className="font-semibold tabular-nums text-slate-800">{frame?.date}</span>
            <span className="text-slate-400">
              {' '}
              （{idx + 1}/{frames.length}）
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
              {(
                [
                  ['soft', '淡軌跡'],
                  ['off', '關軌跡'],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTrailMode(k)}
                  className={`rounded-md px-2 py-0.5 ${
                    trailMode === k
                      ? 'bg-white font-medium text-slate-800 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {lab}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              暫停
            </button>
            <button
              type="button"
              onClick={onPlay}
              className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              {playing ? '播放中…' : '▶ 播放'}
            </button>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
          className="mb-3 w-full accent-brand-600"
          aria-label="回放進度"
        />

        <ReactECharts
          option={option}
          style={{ height: 380 }}
          opts={{ renderer: 'canvas' }}
          notMerge
        />
        <p className="mt-2 text-[11px] text-slate-400">
          軌跡預設淡灰、最多 8 條；泡泡色依當日籌碼四態。
        </p>
      </div>
    </section>
  );
}

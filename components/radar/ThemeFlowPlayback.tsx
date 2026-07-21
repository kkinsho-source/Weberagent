'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { themeColor } from '@/lib/data/theme-colors';
import type { ThemeFamily } from '@/lib/types';

export type PlayFrame = {
  date: string;
  points: Array<{
    slug: string;
    title: string;
    net5dYi: number;
    accelYi: number;
    net20dYi: number;
    stateLabel: string;
    family?: ThemeFamily;
  }>;
};

export function ThemeFlowPlayback({
  frames,
  familyBySlug,
}: {
  frames: PlayFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);

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
    const data = pts.map((r) => ({
      name: r.title,
      value: [
        r.net5dYi,
        r.accelYi,
        Math.max(8, Math.min(56, Math.sqrt(Math.abs(r.net20dYi)) * 4 + 8)),
      ],
      itemStyle: {
        color: themeColor(r.slug, familyBySlug[r.slug]),
      },
    }));
    return {
      animationDurationUpdate: 400,
      grid: { left: 48, right: 20, top: 28, bottom: 40 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { data?: { name?: string; value?: number[] } }) => {
          const d = p.data;
          if (!d?.value) return '';
          return `${d.name}<br/>近5日 ${d.value[0].toFixed(2)} 億<br/>加速度 ${d.value[1].toFixed(2)}`;
        },
      },
      xAxis: {
        name: '近5日淨額（億）',
        nameGap: 26,
        nameLocation: 'middle',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '加速度',
        nameGap: 34,
        nameLocation: 'middle',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#cbd5e1' },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
          },
        },
      ],
    };
  }, [frame, familyBySlug]);

  const onPlay = useCallback(() => {
    if (idx >= frames.length - 1) setIdx(0);
    setPlaying(true);
  }, [idx, frames.length]);

  if (!frames.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        無回放資料（需法人快取多日）
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">資金軌跡回放</h2>
          <p className="text-xs text-slate-400">
            逐日重算近5日淨額與加速度 · 目前{' '}
            <span className="font-medium text-slate-600">{frame?.date}</span> （{idx + 1}/{frames.length}）
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <ReactECharts option={option} style={{ height: 380 }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { CompositeFrame } from '@/lib/data/theme-composite';
import { themeColor } from '@/lib/data/theme-colors';
import type { ThemeFamily } from '@/lib/types';

function scoreColor(s: number): string {
  if (s >= 70) return '#e11d48';
  if (s >= 55) return '#f43f5e';
  if (s >= 45) return '#f59e0b';
  if (s >= 30) return '#64748b';
  return '#334155';
}

export function CompositePlayback({
  frames,
  familyBySlug,
}: {
  frames: CompositeFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [showTrail, setShowTrail] = useState(true);

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
    const scatter = pts.map((r) => ({
      name: r.title,
      value: [
        r.flowScore,
        r.priceScore ?? 50,
        Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.net5dYi)) * 2.2 + 10)),
        r.scoreS,
      ],
      itemStyle: {
        color: scoreColor(r.scoreS),
        borderColor: themeColor(r.slug, familyBySlug[r.slug]),
        borderWidth: 2,
      },
    }));

    const trailSeries: object[] = [];
    if (showTrail && idx > 0) {
      const slugs = new Set<string>();
      for (const f of frames.slice(0, idx + 1)) {
        for (const p of f.points) slugs.add(p.slug);
      }
      for (const slug of slugs) {
        const line: number[][] = [];
        let title = slug;
        for (let i = 0; i <= idx; i++) {
          const p = frames[i]?.points.find((x) => x.slug === slug);
          if (!p) continue;
          title = p.title;
          line.push([p.flowScore, p.priceScore ?? 50]);
        }
        if (line.length < 2) continue;
        trailSeries.push({
          type: 'line',
          name: title,
          data: line,
          showSymbol: false,
          lineStyle: {
            width: 1.5,
            opacity: 0.4,
            color: themeColor(slug, familyBySlug[slug]),
          },
          z: 1,
          silent: true,
        });
      }
    }

    return {
      animationDurationUpdate: 350,
      grid: { left: 52, right: 20, top: 28, bottom: 40 },
      tooltip: {
        formatter: (p: { seriesType?: string; data?: { name?: string; value?: number[] } }) => {
          if (p.seriesType === 'line') return '';
          const d = p.data;
          if (!d?.value) return '';
          return `${d.name}<br/>S ${d.value[3].toFixed(1)} · 籌 ${d.value[0].toFixed(0)} · 價 ${d.value[1].toFixed(0)}`;
        },
      },
      xAxis: {
        name: '籌碼強度',
        min: 0,
        max: 100,
        nameGap: 26,
        nameLocation: 'middle',
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '價動能（最新分，回放中近似固定）',
        min: 0,
        max: 100,
        nameGap: 40,
        nameLocation: 'middle',
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
            lineStyle: { color: '#cbd5e1' },
            data: [{ xAxis: 50 }, { yAxis: 50 }],
          },
        },
      ],
    };
  }, [frame, frames, idx, familyBySlug, showTrail]);

  const onPlay = useCallback(() => {
    if (idx >= frames.length - 1) setIdx(0);
    setPlaying(true);
  }, [idx, frames.length]);

  if (!frames.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        無綜合回放資料
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">綜合座標回放</h2>
          <p className="text-xs text-slate-400">
            X 每日重算籌碼百分位 · Y 用最新價動能分 · {frame?.date}（{idx + 1}/{frames.length}）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={(e) => setShowTrail(e.target.checked)}
              className="rounded border-slate-300"
            />
            軌跡尾巴
          </label>
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
        aria-label="綜合回放進度"
      />
      <ReactECharts option={option} style={{ height: 380 }} opts={{ renderer: 'canvas' }} notMerge />
    </div>
  );
}

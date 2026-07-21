'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import type { CompositeFrame } from '@/lib/data/theme-composite';
import { themeColor } from '@/lib/data/theme-colors';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';

function scoreColor(s: number): string {
  if (s >= 70) return '#e11d48';
  if (s >= 55) return '#f43f5e';
  if (s >= 45) return '#f59e0b';
  if (s >= 30) return '#64748b';
  return '#334155';
}

/** 動畫時長；播放步進略長，避免動畫被下一幀砍掉 */
const ANIM_MS = 900;
const BASE_STEP_MS = 1000;

export function CompositePlayback({
  frames,
  familyBySlug,
}: {
  frames: CompositeFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  const chartRef = useRef<ReactECharts>(null);
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const readyRef = useRef(false);

  useEffect(() => {
    setIdx(Math.max(0, frames.length - 1));
    setPlaying(false);
    readyRef.current = false;
  }, [frames]);

  const slugOrder = useCallback(() => {
    return Array.from(new Set(frames.flatMap((f) => f.points.map((p) => p.slug)))).sort();
  }, [frames]);

  const buildOption = useCallback(
    (frameIdx: number, withTrail: boolean, labels: boolean) => {
      const frame = frames[frameIdx] || frames[frames.length - 1];
      const pts = frame?.points || [];
      const order = slugOrder();
      const bySlug = new Map(pts.map((p) => [p.slug, p]));

      const scatter = order
        .map((slug) => {
          const r = bySlug.get(slug);
          if (!r) return null;
          return {
            // 穩定 id 讓 ECharts 做點對點位移動畫
            id: slug,
            name: r.title,
            value: [
              r.flowScore,
              r.priceScore ?? 50,
              Math.max(14, Math.min(52, Math.sqrt(Math.abs(r.net5dYi)) * 2.2 + 14)),
              r.scoreS,
            ],
            itemStyle: {
              color: scoreColor(r.scoreS),
              borderColor: themeColor(slug, familyBySlug[slug]),
              borderWidth: 2,
            },
            label: {
              show: labels,
              formatter: () => shortThemeLabel(r.title),
              position: 'top' as const,
              distance: 5,
              fontSize: 10,
              fontWeight: 600,
              color: '#1e293b',
              textBorderColor: 'rgba(255,255,255,0.95)',
              textBorderWidth: 3,
            },
          };
        })
        .filter(Boolean);

      const trailSeries: object[] = [];
      if (withTrail && frameIdx > 0) {
        for (const slug of order) {
          const line: number[][] = [];
          let title = slug;
          for (let i = 0; i <= frameIdx; i++) {
            const p = frames[i]?.points.find((x) => x.slug === slug);
            if (!p) continue;
            title = p.title;
            line.push([p.flowScore, p.priceScore ?? 50]);
          }
          if (line.length < 2) continue;
          trailSeries.push({
            type: 'line',
            id: `trail-${slug}`,
            name: title,
            data: line,
            showSymbol: false,
            smooth: 0.35,
            clip: false,
            lineStyle: {
              width: 2,
              opacity: 0.4,
              color: themeColor(slug, familyBySlug[slug]),
            },
            z: 1,
            silent: true,
            animation: false,
          });
        }
      }

      return {
        animation: true,
        animationThreshold: 2000,
        animationDuration: ANIM_MS,
        animationDurationUpdate: ANIM_MS,
        animationEasing: 'cubicOut' as const,
        animationEasingUpdate: 'cubicInOut' as const,
        grid: { left: 52, right: 28, top: 40, bottom: 48 },
        tooltip: {
          confiner: true,
          formatter: (p: {
            seriesType?: string;
            data?: { name?: string; value?: number[] };
          }) => {
            if (p.seriesType === 'line') return '';
            const d = p.data;
            if (!d?.value) return '';
            return `${d.name}<br/>S ${d.value[3].toFixed(1)} · 籌 ${d.value[0].toFixed(0)} · 價 ${d.value[1].toFixed(0)}`;
          },
        },
        xAxis: {
          type: 'value',
          name: '籌碼強度',
          min: 0,
          max: 100,
          nameGap: 26,
          nameLocation: 'middle',
          splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        yAxis: {
          type: 'value',
          name: '價動能（最新分）',
          min: 0,
          max: 100,
          nameGap: 36,
          nameLocation: 'middle',
          splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        series: [
          ...trailSeries,
          {
            type: 'scatter',
            id: 'bubbles',
            name: '題材',
            // 讓同 id 資料點在更新時平滑插值
            universalTransition: { enabled: true, divideShape: 'clone' },
            symbolSize: (val: number[]) => val[2],
            data: scatter,
            z: 3,
            markLine: {
              silent: true,
              symbol: 'none',
              animation: false,
              lineStyle: { color: '#cbd5e1' },
              data: [{ xAxis: 50 }, { yAxis: 50 }],
            },
          },
        ],
      };
    },
    [frames, familyBySlug, slugOrder],
  );

  const applyFrame = useCallback(
    (frameIdx: number, full = false) => {
      const chart = chartRef.current?.getEchartsInstance() as ECharts | undefined;
      if (!chart || !frames.length) return;
      const opt = buildOption(frameIdx, showTrail, showLabels);
      if (full || !readyRef.current) {
        chart.setOption(opt, { notMerge: true, lazyUpdate: false });
        readyRef.current = true;
      } else {
        chart.setOption(opt, {
          notMerge: false,
          lazyUpdate: false,
          replaceMerge: ['series'],
        });
      }
    },
    [buildOption, frames.length, showTrail, showLabels],
  );

  useEffect(() => {
    applyFrame(idx, true);
  }, [frames, showTrail, showLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!readyRef.current) return;
    applyFrame(idx, false);
  }, [idx, applyFrame]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const ms = Math.round(BASE_STEP_MS / speed);
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => clearInterval(t);
  }, [playing, frames.length, speed]);

  const frame = frames[idx] || frames[frames.length - 1];

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
            泡泡平滑位移（{ANIM_MS}ms 緩動）· 顯示題材簡稱 ·{' '}
            <span className="font-medium text-slate-700">{frame?.date}</span>（{idx + 1}/
            {frames.length}）
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded border-slate-300"
            />
            名稱
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={(e) => setShowTrail(e.target.checked)}
              className="rounded border-slate-300"
            />
            軌跡
          </label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as 1 | 1.5 | 2)}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600"
            aria-label="播放速度"
          >
            <option value={1}>1× 順暢</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2× 快</option>
          </select>
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
      <ReactECharts
        ref={chartRef}
        option={{}}
        onChartReady={() => applyFrame(idx, true)}
        style={{ height: 420 }}
        opts={{ renderer: 'canvas' }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}

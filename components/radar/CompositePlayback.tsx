'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import {
  C50_AXIS_MAX,
  C50_AXIS_MIN,
  ZONE_META,
  zoneBubbleStyle,
  zoneMarkAreaData,
  type CompositeFrame,
  type CompositeFramePoint,
  type CompositeZone,
} from '@/lib/data/theme-composite';
import { themeColor } from '@/lib/data/theme-colors';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';

const ANIM_MS = 900;
const BASE_STEP_MS = 1000;

function fmtC50(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(0)}`;
}

export function CompositePlayback({
  frames,
  familyBySlug,
}: {
  frames: CompositeFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  const chartRef = useRef<ReactECharts>(null);
  const readyRef = useRef(false);
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [showTrail, setShowTrail] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);
  const [selected, setSelected] = useState<CompositeFramePoint | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  /** null = 全部顯示 */
  const [picked, setPicked] = useState<Set<string> | null>(null);

  useEffect(() => {
    setIdx(Math.max(0, frames.length - 1));
    setPlaying(false);
    readyRef.current = false;
    setSelected(null);
    setPicked(null);
  }, [frames]);

  const allThemes = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of frames) {
      for (const p of f.points) m.set(p.slug, p.title);
    }
    return Array.from(m.entries())
      .map(([slug, title]) => ({ slug, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant'));
  }, [frames]);

  const toggleSlug = (slug: string) => {
    setPicked((prev) => {
      const base = prev ? new Set(prev) : new Set(allThemes.map((t) => t.slug));
      if (base.has(slug)) base.delete(slug);
      else base.add(slug);
      if (base.size === allThemes.length) return null;
      return base;
    });
  };

  const selectAll = () => setPicked(null);
  const selectNone = () => setPicked(new Set());
  const selectTop8 = () => {
    const last = frames[frames.length - 1];
    if (!last) return;
    const top = [...last.points].sort((a, b) => b.scoreS - a.scoreS).slice(0, 8);
    setPicked(new Set(top.map((p) => p.slug)));
  };

  const buildOption = useCallback(
    (frameIdx: number, withTrail: boolean, labels: boolean) => {
      const frame = frames[frameIdx] || frames[frames.length - 1];
      const ptsAll = frame?.points || [];
      const pts =
        picked == null ? ptsAll : ptsAll.filter((p) => picked.has(p.slug));
      const orderAll = Array.from(
        new Set(frames.flatMap((f) => f.points.map((p) => p.slug))),
      ).sort();
      const order =
        picked == null ? orderAll : orderAll.filter((s) => picked.has(s));
      const bySlug = new Map(pts.map((p) => [p.slug, p]));

      const scatter = order
        .map((slug) => {
          const r = bySlug.get(slug);
          if (!r) return null;
          return {
            id: slug,
            name: r.title,
            value: [
              r.flowScore,
              r.priceScore,
              Math.max(16, Math.min(52, Math.sqrt(Math.abs(r.net5dYi)) * 2.2 + 16)),
              r.scoreS,
            ],
            itemStyle: {
              ...zoneBubbleStyle(r.zone, { resonance: r.resonance }),
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
            line.push([p.flowScore, p.priceScore]);
          }
          if (line.length < 2) continue;
          trailSeries.push({
            type: 'line',
            id: `trail-${slug}`,
            name: title,
            data: line,
            showSymbol: false,
            smooth: 0.35,
            lineStyle: {
              width: 2,
              opacity: 0.38,
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
        grid: { left: 56, right: 28, top: 44, bottom: 48 },
        tooltip: {
          formatter: (p: {
            seriesType?: string;
            data?: { id?: string; name?: string; value?: number[] };
          }) => {
            if (p.seriesType === 'line') return '';
            const d = p.data;
            if (!d?.value) return '';
            const pt = pts.find((x) => x.slug === d.id || x.title === d.name);
            const z = pt ? ZONE_META[pt.zone] : null;
            return [
              `<b>${d.name}</b>`,
              z ? `${z.label}（${z.blurb}）` : '',
              `S ${d.value[3].toFixed(1)} · 籌 ${fmtC50(d.value[0])} · 短動能 ${fmtC50(d.value[1])}`,
              '<span style="opacity:.7">點擊看詳情</span>',
            ]
              .filter(Boolean)
              .join('<br/>');
          },
        },
        xAxis: {
          type: 'value' as const,
          name: '籌碼強度 →（C50）',
          min: C50_AXIS_MIN,
          max: C50_AXIS_MAX,
          nameGap: 28,
          nameLocation: 'middle' as const,
          splitLine: { show: false },
          axisLabel: {
            formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
          },
        },
        yAxis: {
          type: 'value' as const,
          name: '當日短動能 →（C50）',
          min: C50_AXIS_MIN,
          max: C50_AXIS_MAX,
          nameGap: 40,
          nameLocation: 'middle' as const,
          splitLine: { show: false },
          axisLabel: {
            formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
          },
        },
        series: [
          ...trailSeries,
          {
            type: 'scatter',
            id: 'bubbles',
            name: '題材',
            universalTransition: { enabled: true, divideShape: 'clone' },
            symbolSize: (val: number[]) => val[2],
            data: scatter,
            z: 3,
            markArea: {
              silent: true,
              data: zoneMarkAreaData() as unknown as object[],
            },
            markLine: {
              silent: true,
              symbol: 'none',
              animation: false,
              lineStyle: { color: '#94a3b8' },
              data: [{ xAxis: 0 }, { yAxis: 0 }],
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
                    formatter: '普通',
                    position: 'right',
                    color: '#64748b',
                    fontSize: 10,
                    fontWeight: 600,
                  },
                },
              ],
            },
          },
        ],
      };
    },
    [frames, familyBySlug, picked],
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
  }, [frames, showTrail, showLabels, picked]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const pickLabel =
    picked == null ? '全部' : `${picked.size}/${allThemes.length}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">綜合座標回放</h2>
          <p className="text-xs text-slate-400">
            C50 中心 (0,0) · Y＝當日短動能 · 可挑選題材 · 平滑位移
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
          >
            <option value={1}>1× 順暢</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            題材 {pickLabel}
          </button>
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

      {showPicker ? (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-700">顯示題材</span>
            <button
              type="button"
              onClick={selectAll}
              className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
            >
              全選
            </button>
            <button
              type="button"
              onClick={selectTop8}
              className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
            >
              Top8
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
            >
              清空
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="ml-auto text-[11px] text-brand-600"
            >
              收起
            </button>
          </div>
          <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {allThemes.map((th) => {
              const on = picked == null || picked.has(th.slug);
              return (
                <label
                  key={th.slug}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                    on ? 'bg-white text-slate-800 ring-1 ring-brand-200' : 'text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleSlug(th.slug)}
                    className="rounded border-slate-300"
                  />
                  <span className="truncate">{th.title}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-2 flex flex-wrap items-end justify-between gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-400">播放日期</div>
          <div className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
            {frame?.date || '—'}
          </div>
        </div>
        <div className="text-right text-xs text-slate-300">
          {idx + 1} / {frames.length}
          <div className="text-slate-500">交易日進度</div>
        </div>
      </div>

      {frame?.guide ? (
        <p className="mb-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
          {frame.guide}
        </p>
      ) : null}

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

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
          <ReactECharts
            ref={chartRef}
            option={{}}
            onChartReady={() => applyFrame(idx, true)}
            style={{ height: 420 }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
            onEvents={{
              click: (params: { data?: { id?: string; name?: string } }) => {
                const id = params?.data?.id;
                const pt =
                  frame?.points.find((p) => p.slug === id) ||
                  frame?.points.find((p) => p.title === params?.data?.name);
                if (pt) setSelected(pt);
              },
            }}
          />
        </div>
        {selected ? (
          <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:w-64">
            <div className="flex justify-between gap-2">
              <h4 className="font-semibold text-slate-800">{selected.title}</h4>
              <button
                type="button"
                className="text-xs text-slate-500"
                onClick={() => setSelected(null)}
              >
                關閉
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ZONE_META[selected.zone as CompositeZone].label} · {frame?.date}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-slate-500">S</span>
                <span className="font-semibold">{selected.scoreS.toFixed(1)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">籌碼 C50</span>
                <span>{fmtC50(selected.flowScore)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">短動能 C50</span>
                <span>{fmtC50(selected.priceScore)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">近5日</span>
                <span
                  className={
                    selected.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'
                  }
                >
                  {selected.net5dYi >= 0 ? '+' : ''}
                  {selected.net5dYi.toFixed(2)} 億
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">共振</span>
                <span>{selected.resonance ? '★' : '—'}</span>
              </li>
            </ul>
            <Link
              href={`/themes/${selected.slug}`}
              className="mt-3 block rounded-lg bg-brand-600 py-1.5 text-center text-xs font-medium text-white"
            >
              題材頁
            </Link>
          </aside>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        回放軸為 C50（−50～+50）；Y＝當日短動能（非主圖中期 RS）。相對位置，非買賣建議。
      </p>
    </div>
  );
}

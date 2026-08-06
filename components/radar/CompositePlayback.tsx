'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import {
  ZONE_META,
  compositeZone,
  type CompositeFrame,
  type CompositeFramePoint,
  type CompositeZone,
} from '@/lib/data/theme-composite';
import {
  HUD,
  hudAxisCommon,
  hudFadingTrailSeries,
  hudSoftDiscStyle,
  type HudTrailMode,
  hudSonarRingSeries,
  hudTooltipBase,
  hudZoneMarkAreaData,
} from '@/lib/data/radar-hud';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';
import { useRadarPref } from '@/components/radar/useRadarPref';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';

const BASE_STEP_MS = 1450; // 略放慢；動畫 ≈ 0.96×步長，減少斷層感

function stepMsFor(speed: number) {
  return Math.round(BASE_STEP_MS / speed);
}

function animMsFor(speed: number) {
  return Math.round(stepMsFor(speed) * 0.96);
}

/** 軌跡：TA 區色彗星（預設）｜雙重編碼｜青白彗星｜淡跡｜關 */
type TrailStyle = 'zone' | 'dual' | 'comet' | 'soft' | 'off';

function normalizeTrailStyle(v: string | null | undefined): TrailStyle {
  if (
    v === 'zone' ||
    v === 'off' ||
    v === 'soft' ||
    v === 'comet' ||
    v === 'dual'
  )
    return v;
  // 舊 pref → TA
  if (v === 'sonar') return 'zone';
  return 'zone';
}

function trailModeOf(style: TrailStyle): HudTrailMode {
  if (style === 'zone') return 'zone';
  if (style === 'soft') return 'soft';
  if (style === 'comet') return 'comet';
  if (style === 'dual') return 'dual';
  return 'zone';
}

function fmtC100(n: number): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(0)}`;
}

export function CompositePlayback({
  frames,
  familyBySlug: _familyBySlug,
}: {
  frames: CompositeFrame[];
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  void _familyBySlug;
  const chartRef = useRef<ReactECharts>(null);
  const readyRef = useRef(false);
  const [idx, setIdx] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [trailStyle, setTrailStyle] = useRadarPref<TrailStyle>('play-trail-v4', 'zone');
  const [density] = useRadarPref<'compact' | 'full'>('radar-density-v1', 'compact');
  const compact = density === 'compact';
  const [showLabels, setShowLabels] = useRadarPref('play-labels', true);
  const [speed, setSpeed] = useRadarPref<1 | 1.5 | 2>('play-speed', 1);
  const [selected, setSelected] = useState<CompositeFramePoint | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  /** null = 全部顯示 */
  const [picked, setPicked] = useState<Set<string> | null>(null);
  /** 軌跡只畫被點選／聚焦的一條（最不亂） */
  const [trailFocusOnly, setTrailFocusOnly] = useRadarPref('play-focusOnly', true);
  /** R7：進階控制預設收合 */
  const [showMore, setShowMore] = useRadarPref('play-showMore', false);

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
    (frameIdx: number, labels: boolean, animMs: number) => {
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
          const isFocus = selected?.slug === slug;
          // S0 固定球徑；色依當幀座標重算象限（跑進哪區就變哪色）
          const zoneNow = compositeZone(r.flowScore, r.priceScore);
          const BASE_R = 22;
          return {
            id: slug,
            name: r.title,
            value: [
              r.flowScore,
              r.priceScore,
              isFocus ? BASE_R + 5 : BASE_R,
              r.scoreS,
            ],
            itemStyle: {
              ...hudSoftDiscStyle(zoneNow, {
                resonance: r.resonance || isFocus,
                focus: isFocus,
              }),
              opacity: isFocus || !selected ? 0.95 : 0.38,
            },
            label: {
              show: labels,
              formatter: () => shortThemeLabel(r.title),
              position: 'top' as const,
              distance: 6,
              fontSize: isFocus ? 11 : 10,
              fontWeight: 600,
              color: HUD.text,
              textBorderColor: 'rgba(7,11,20,0.92)',
              textBorderWidth: 3,
            },
          };
        })
        .filter(Boolean);

      const trailSeries: object[] = [];
      if (trailStyle !== 'off' && frameIdx > 0) {
        let trailSlugs = order;
        if (trailFocusOnly && selected) {
          trailSlugs = order.filter((s) => s === selected.slug);
        } else {
          const maxTrails = compact ? 3 : 6; // P1 簡潔最多 3 條
          if (trailSlugs.length > maxTrails) {
            const ranked = [...pts]
              .sort((a, b) => b.scoreS - a.scoreS)
              .slice(0, maxTrails);
            const keep = new Set(ranked.map((p) => p.slug));
            trailSlugs = trailSlugs.filter((s) => keep.has(s));
          }
        }

        for (const slug of trailSlugs) {
          const line: number[][] = [];
          let title = slug;
          let lastFx = 0;
          let lastPy = 0;
          for (let i = 0; i <= frameIdx; i++) {
            const p = frames[i]?.points.find((x) => x.slug === slug);
            if (!p) continue;
            title = p.title;
            lastFx = p.flowScore;
            lastPy = p.priceScore;
            line.push([p.flowScore, p.priceScore]);
          }
          if (line.length < 2) continue;
          const isFocus = selected?.slug === slug;
          const mode = trailModeOf(normalizeTrailStyle(trailStyle));
          // 軌跡色跟「當下所在象限」走（與球體一致）
          const trailZone = compositeZone(lastFx, lastPy);
          trailSeries.push(
            ...hudFadingTrailSeries({
              slug,
              title,
              line,
              focus: isFocus,
              mode,
              zoneColor: ZONE_META[trailZone].bubble,
              // P4：簡潔再淡細；完整稍亮
              intensity: compact ? 0.72 : 0.9,
              // 線段與球同一套 update 時長 → 延續感
              animMs,
            }),
          );
        }
      }

      return {
        animation: true,
        animationThreshold: 8000,
        animationDuration: animMs,
        animationDurationUpdate: animMs,
        animationEasing: 'linear' as const,
        animationEasingUpdate: 'linear' as const,
        grid: { left: 56, right: 28, top: 44, bottom: 48 },
        backgroundColor: 'transparent',
        tooltip: {
          ...hudTooltipBase(),
          formatter: (p: {
            seriesType?: string;
            seriesId?: string;
            data?: { id?: string; name?: string; value?: number[] };
          }) => {
            if (p.seriesType === 'line') return '';
            if (String(p.seriesId || '').startsWith('trail-')) return '';
            const d = p.data;
            if (!d?.value) return '';
            const pt = pts.find((x) => x.slug === d.id || x.title === d.name);
            const z = pt ? ZONE_META[pt.zone] : null;
            return [
              `<b>${d.name}</b>`,
              z ? `${z.label}（${z.blurb}）` : '',
              `S ${d.value[3].toFixed(1)} · 籌 ${fmtC100(d.value[0])} · 短動能 ${fmtC100(d.value[1])}`,
              '<span style="opacity:.7">點擊聚焦軌跡</span>',
            ]
              .filter(Boolean)
              .join('<br/>');
          },
        },
        xAxis: { type: 'value' as const, ...hudAxisCommon('錢有沒有比較多進 →', 28) },
        yAxis: {
          type: 'value' as const,
          ...hudAxisCommon('價相對強弱（當日） →', 40),
        },
        series: [
          ...hudSonarRingSeries(),
          ...trailSeries,
          {
            type: 'scatter',
            id: 'bubbles',
            name: '題材',
            symbol: 'circle',
            // 同 id 點位插值 → 柔光圓平滑滑移
            universalTransition: { enabled: false },
            animation: true,
            animationDurationUpdate: animMs,
            animationEasingUpdate: 'linear',
            symbolSize: (val: unknown) => {
              if (Array.isArray(val) && typeof val[2] === 'number') return val[2];
              return 20;
            },
            data: scatter,
            z: 3,
            markArea: {
              silent: true,
              animation: false,
              data: hudZoneMarkAreaData() as unknown as object[],
            },
            markLine: {
              silent: true,
              symbol: 'none',
              animation: false,
              lineStyle: { color: HUD.cross, width: 1.25 },
              data: [{ xAxis: 0 }, { yAxis: 0 }],
            },
            markPoint: {
              silent: true,
              animation: false,
              data: [
                {
                  coord: [0, 0],
                  symbol: 'circle',
                  symbolSize: 8,
                  itemStyle: {
                    color: HUD.crossCore,
                    borderColor: '#0b1220',
                    borderWidth: 2,
                    shadowBlur: 10,
                    shadowColor: 'rgba(125,211,252,0.7)',
                  },
                  label: {
                    show: true,
                    formatter: '普通',
                    position: 'right',
                    color: HUD.crossCore,
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
    [frames, picked, trailStyle, trailFocusOnly, selected, compact],
  );

  const applyFrame = useCallback(
    (frameIdx: number, full = false) => {
      const chart = chartRef.current?.getEchartsInstance() as ECharts | undefined;
      if (!chart || !frames.length) return;
      const animMs = animMsFor(speed);
      let opt: ReturnType<typeof buildOption>;
      try {
        opt = buildOption(frameIdx, showLabels, animMs);
      } catch (err) {
        console.error('[CompositePlayback] buildOption failed', err);
        return;
      }
      try {
        if (full || !readyRef.current) {
          chart.setOption(opt, { notMerge: true, lazyUpdate: false });
          readyRef.current = true;
          return;
        }
        // 只 merge 動態 series（圓點 + 軌跡），軸／距離環不動 → 延續感
        const dynSeries = (opt.series as { id?: string }[]).filter((s) => {
          const id = String(s.id || '');
          return id === 'bubbles' || id.startsWith('trail-');
        });
        chart.setOption(
          {
            animation: true,
            animationDurationUpdate: animMs,
            animationEasingUpdate: 'linear',
            series: dynSeries,
          },
          { notMerge: false, lazyUpdate: false },
        );
      } catch (err) {
        // setOption 例外不應炸掉整頁（Next Application error）
        console.error('[CompositePlayback] setOption failed', err);
        try {
          chart.setOption(opt, { notMerge: true, lazyUpdate: false });
          readyRef.current = true;
        } catch {
          /* ignore */
        }
      }
    },
    [buildOption, frames.length, showLabels, speed],
  );

  // frames 換池才整圖重建；其餘只 merge，保留動畫延續
  useEffect(() => {
    readyRef.current = false;
    applyFrame(idx, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames]);

  useEffect(() => {
    if (!readyRef.current) {
      applyFrame(idx, true);
      return;
    }
    applyFrame(idx, false);
  }, [idx, showLabels, picked, trailStyle, trailFocusOnly, selected, applyFrame]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const ms = stepMsFor(speed);
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
  // 側欄用當幀資料（不 setState，避免每步雙重 setOption 打斷動畫）
  const liveSelected = useMemo(() => {
    if (!selected) return null;
    return frame?.points.find((x) => x.slug === selected.slug) || selected;
  }, [selected, frame]);

  const onPlay = useCallback(() => {
    if (idx >= frames.length - 1) setIdx(0);
    setPlaying(true);
  }, [idx, frames.length]);

  if (!frames.length) {
    return (
      <RadarEmptyBlock title="回放暫時沒有資料">
        需要多個交易日的法人紀錄，才能播放題材怎麼移動。資料累積後會自動出現，無需設定。
      </RadarEmptyBlock>
    );
  }

  const pickLabel =
    picked == null ? '全部' : `${picked.size}/${allThemes.length}`;

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_0_30px_rgba(56,189,248,0.06)]">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-wide text-cyan-50">最近怎麼移動（回放）</h2>
          <p className="text-xs text-slate-400">柔光圓連續滑移 · 區色軌跡（無端點）· 尾巴漸隱</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            {showMore ? '收起設定' : '更多設定'}
          </button>
        </div>
      </div>

      {showMore ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-cyan-500/15 bg-slate-900/50 px-3 py-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded border-slate-600"
            />
            名稱
          </label>
          <select
            value={normalizeTrailStyle(trailStyle)}
            onChange={(e) => setTrailStyle(e.target.value as TrailStyle)}
            className="rounded-md border border-cyan-500/25 bg-slate-900 px-2 py-1 text-xs text-cyan-100"
            title="軌跡樣式"
          >
            <option value="zone">軌跡·區色彗星</option>
            <option value="dual">軌跡·區色虛實</option>
            <option value="comet">軌跡·青白彗星</option>
            <option value="soft">軌跡·淡跡</option>
            <option value="off">軌跡·關</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={trailFocusOnly}
              onChange={(e) => setTrailFocusOnly(e.target.checked)}
              className="rounded border-slate-600"
              disabled={trailStyle === 'off'}
            />
            只畫聚焦
          </label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as 1 | 1.5 | 2)}
            className="rounded-md border border-cyan-500/25 bg-slate-900 px-2 py-1 text-xs text-cyan-100"
          >
            <option value={1}>1× 順暢</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="rounded-md border border-cyan-500/25 bg-slate-900 px-2.5 py-1 text-xs text-cyan-100 hover:bg-slate-800"
          >
            題材 {pickLabel}
          </button>
        </div>
      ) : null}

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
          <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#070b14]">
            <ReactECharts
              ref={chartRef}
              option={{}}
              onChartReady={() => applyFrame(idx, true)}
              style={{ height: 420 }}
              opts={{ renderer: 'canvas' }}
              lazyUpdate
              onEvents={{
                click: (params: { data?: { id?: string; name?: string } }) => {
                  const id = params?.data?.id;
                  const pt =
                    frame?.points.find((p) => p.slug === id) ||
                    frame?.points.find((p) => p.title === params?.data?.name);
                  if (pt) {
                    setSelected((cur) => (cur?.slug === pt.slug ? null : pt));
                  }
                },
              }}
            />
          </div>
          <p className="mt-1 text-center text-[11px] text-slate-500">
            點圓點聚焦軌跡 · 再點取消 · 未聚焦最多 3 條（簡潔）
          </p>
        </div>
        {liveSelected ? (
          <aside className="w-full shrink-0 rounded-xl border border-cyan-500/20 bg-slate-900/80 p-3 lg:w-64">
            <div className="flex justify-between gap-2">
              <h4 className="font-semibold text-cyan-50">{liveSelected.title}</h4>
              <button
                type="button"
                className="text-xs text-slate-400"
                onClick={() => setSelected(null)}
              >
                關閉
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ZONE_META[compositeZone(liveSelected.flowScore, liveSelected.priceScore)].label} · {frame?.date}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              <li className="flex justify-between">
                <span className="text-slate-500">S</span>
                <span className="font-semibold">{liveSelected.scoreS.toFixed(1)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">籌碼 C100</span>
                <span>{fmtC100(liveSelected.flowScore)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">短動能 C100</span>
                <span>{fmtC100(liveSelected.priceScore)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">近5日</span>
                <span
                  className={
                    liveSelected.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'
                  }
                >
                  {liveSelected.net5dYi >= 0 ? '+' : ''}
                  {liveSelected.net5dYi.toFixed(2)} 億
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">共振</span>
                <span>{liveSelected.resonance ? '★' : '—'}</span>
              </li>
            </ul>
            <Link
              href={`/themes/${liveSelected.slug}?from=radar`}
              className="mt-3 block rounded-lg bg-cyan-500 py-1.5 text-center text-xs font-medium text-slate-950"
            >
              題材頁
            </Link>
          </aside>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        回放縱軸用「當日短動能」方便看出換區；與主圖中期相對強弱略有不同。相對位置，非買賣建議。
      </p>
    </div>
  );
}

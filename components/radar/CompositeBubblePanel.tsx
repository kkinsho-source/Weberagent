'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import {
  COMPOSITE_WEIGHTS,
  ZONE_META,
  buildStaticGuide,
  type CompositeRow,
  type CompositeWeightMode,
  type CompositeZone,
} from '@/lib/data/theme-composite';
import {
  HUD,
  hudAxisCommon,
  hudFireballStyle,
  hudSonarRingSeries,
  hudTooltipBase,
  hudZoneMarkAreaData,
} from '@/lib/data/radar-hud';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';
import { RadarHowTo } from '@/components/radar/RadarHowTo';
import { BubbleDetailPanel } from '@/components/radar/BubbleDetailPanel';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';
import { useRadarPref } from '@/components/radar/useRadarPref';

const TOP_N = 8;

function fmtC100(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(0)}`;
}

export function CompositeBubblePanel({
  rows,
  mode,
  familyBySlug: _familyBySlug,
  asOf,
}: {
  rows: CompositeRow[];
  mode: CompositeWeightMode;
  familyBySlug: Record<string, ThemeFamily | undefined>;
  asOf?: string | null;
}) {
  void _familyBySlug;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const w = COMPOSITE_WEIGHTS[mode];

  const [showLabels, setShowLabels] = useRadarPref('bubble-labels', true);
  const [onlyTop, setOnlyTop] = useRadarPref('bubble-onlyTop', true);
  const [onlyResonance, setOnlyResonance] = useRadarPref('bubble-resonance', false);
  const [showAdvanced, setShowAdvanced] = useRadarPref('bubble-advanced', false);
  const [selected, setSelected] = useState<CompositeRow | null>(null);
  /** R10：null=全顯示；Set=只顯示勾選 */
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickedReady, setPickedReady] = useState(false);
  /** W2：切換權重後短暫提示「排序有變、泡泡位置不變」 */
  const [rankNotice, setRankNotice] = useState<string | null>(null);
  const [rankFlash, setRankFlash] = useState(false);
  const prevOrderRef = useRef<string[]>([]);
  const prevModeRef = useRef<CompositeWeightMode | null>(null);

  // R11：題材勾選持久化
  useEffect(() => {
    try {
      const raw = localStorage.getItem('radar-pref-v1:bubble-picked');
      if (raw) {
        const arr = JSON.parse(raw) as string[] | null;
        if (Array.isArray(arr)) setPicked(new Set(arr));
        else setPicked(null);
      }
    } catch {
      /* ignore */
    }
    setPickedReady(true);
  }, []);

  useEffect(() => {
    if (!pickedReady) return;
    try {
      if (picked == null) localStorage.setItem('radar-pref-v1:bubble-picked', 'null');
      else localStorage.setItem('radar-pref-v1:bubble-picked', JSON.stringify([...picked]));
    } catch {
      /* ignore */
    }
  }, [picked, pickedReady]);

  const setMode = (m: CompositeWeightMode) => {
    const next = new URLSearchParams(sp.toString());
    if (m === 'balanced') next.delete('w');
    else next.set('w', m);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const allThemes = useMemo(
    () =>
      [...rows]
        .map((r) => ({ slug: r.slug, title: r.title, scoreS: r.scoreS }))
        .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hant')),
    [rows],
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (picked != null) list = list.filter((r) => picked.has(r.slug));
    if (onlyResonance) list = list.filter((r) => r.resonance);
    // 排序以 S 為準（權重會改 S）
    list = [...list].sort((a, b) => b.scoreS - a.scoreS);
    if (onlyTop) list = list.slice(0, TOP_N);
    return list;
  }, [rows, onlyTop, onlyResonance, picked]);

  // W2：權重變更時比對排序
  useEffect(() => {
    const order = filtered.map((r) => r.slug);
    const prevMode = prevModeRef.current;
    const prevOrder = prevOrderRef.current;
    if (prevMode != null && prevMode !== mode && prevOrder.length > 0) {
      let moved = 0;
      const n = Math.min(order.length, prevOrder.length);
      for (let i = 0; i < n; i++) {
        if (order[i] !== prevOrder[i]) moved += 1;
      }
      const top = filtered[0]?.title;
      setRankNotice(
        moved === 0
          ? `權重改為「${w.label}」：前 ${n} 名順序不變（泡泡在圖上的位置本來就不會動）。`
          : `權重改為「${w.label}」：綜合排序 S 有 ${moved} 個名次變動${top ? `，目前第 1 為「${top}」` : ''}。泡泡座標不變，只改排序／前 ${TOP_N} 名單。`,
      );
      setRankFlash(true);
      const t = window.setTimeout(() => setRankFlash(false), 2200);
      const t2 = window.setTimeout(() => setRankNotice(null), 6000);
      prevOrderRef.current = order;
      prevModeRef.current = mode;
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(t2);
      };
    }
    prevOrderRef.current = order;
    prevModeRef.current = mode;
  }, [mode, filtered, w.label]);

  const guide = useMemo(
    () => buildStaticGuide(filtered.length ? filtered : rows),
    [filtered, rows],
  );

  const toggleSlug = (slug: string) => {
    setPicked((prev) => {
      const base = prev ? new Set(prev) : new Set(allThemes.map((t) => t.slug));
      if (base.has(slug)) base.delete(slug);
      else base.add(slug);
      if (base.size === allThemes.length) return null;
      return base;
    });
  };

  const option = useMemo(() => {
    const data = filtered.map((r) => ({
      id: r.slug,
      name: r.title,
      value: [
        r.flowScore,
        r.priceScore ?? 0,
        Math.max(16, Math.min(56, Math.sqrt(Math.abs(r.net20dYi)) * 3.5 + 16)),
        r.scoreS,
      ],
      symbol: 'circle',
      itemStyle: {
        ...hudFireballStyle(r.zone, { resonance: r.resonance, muted: !r.hasPrice }),
      },
      label: {
        show: showLabels,
        formatter: () => shortThemeLabel(r.title),
        position: 'top' as const,
        distance: 6,
        fontSize: 11,
        fontWeight: 600,
        color: HUD.text,
        textBorderColor: 'rgba(7, 11, 20, 0.92)',
        textBorderWidth: 3,
      },
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 450,
      grid: { left: 56, right: 36, top: 48, bottom: 52 },
      tooltip: {
        ...hudTooltipBase(),
        formatter: (p: { data?: { name?: string; value?: number[] } }) => {
          const d = p.data;
          if (!d?.value) return '';
          const row =
            filtered.find((x) => x.title === d.name) ||
            rows.find((x) => x.title === d.name);
          if (!row) return d.name || '';
          const z = ZONE_META[row.zone as CompositeZone];
          return [
            `<b>${row.title}</b>`,
            `${z.corner} ${z.label}：${z.blurb}`,
            `S ${row.scoreS.toFixed(1)} · 籌 ${fmtC100(row.flowScore)} · 價 ${fmtC100(row.priceScore)}`,
            `近5日 ${row.net5dYi >= 0 ? '+' : ''}${row.net5dYi.toFixed(2)} 億 · ${row.tideLabel}`,
            row.resonance ? '★ 共振' : '',
            '<span style="opacity:.7">點標記看詳情</span>',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: hudAxisCommon('錢有沒有比較多進 →', 30),
      yAxis: hudAxisCommon('價相對有沒有變強 →', 40),
      series: [
        ...hudSonarRingSeries(),
        {
          type: 'scatter',
          symbol: 'circle',
          symbolSize: (val: number[]) => val[2],
          data,
          markArea: {
            silent: true,
            data: hudZoneMarkAreaData() as unknown as object[],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: HUD.cross, width: 1.25, type: 'solid' },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
            label: { show: false },
          },
          markPoint: {
            silent: true,
            data: [
              {
                coord: [0, 0],
                symbol: 'circle',
                symbolSize: 9,
                itemStyle: {
                  color: HUD.crossCore,
                  borderColor: '#0b1220',
                  borderWidth: 2,
                  shadowBlur: 10,
                  shadowColor: 'rgba(125, 211, 252, 0.7)',
                },
                label: {
                  show: true,
                  formatter: '普通',
                  position: 'right',
                  color: HUD.crossCore,
                  fontSize: 11,
                  fontWeight: 600,
                  distance: 8,
                },
              },
            ],
          },
        },
      ],
    };
  }, [filtered, rows, showLabels]);

  const pickLabel =
    picked == null ? '全部' : `${picked.size}/${allThemes.length}`;

  const emptyReason = (() => {
    if (!rows.length) {
      return {
        title: '目前沒有可畫的題材資料',
        body: '可能是盤後法人資料尚未更新，或這個範圍還沒有成分股。可稍後再試，或切換上方「看哪些題材範圍」。',
        tone: 'warn' as const,
      };
    }
    if (picked != null && picked.size === 0) {
      return {
        title: '你沒有勾選任何題材',
        body: '請在「題材」裡勾選要看的題材，或按「全選」。',
        tone: 'neutral' as const,
      };
    }
    if (onlyResonance && !rows.some((r) => r.resonance)) {
      return {
        title: '目前沒有標成共振★的題材',
        body: '可關閉進階選項裡的「只看共振★」，改看全部前幾名。',
        tone: 'neutral' as const,
      };
    }
    return {
      title: '目前篩選下沒有題材',
      body: '試試：關閉「只看前 8 名」、關閉「只看共振」、或在「題材」改勾選。',
      tone: 'neutral' as const,
    };
  })();

  return (
    <section className="space-y-3 rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_0_40px_rgba(56,189,248,0.08)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-wide text-cyan-50">題材熱區圖</h2>
            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-300/90">
              HUD
            </span>
            <RadarHowTo />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            中心＝普通 · 環＝離中心遠近 · 火球＝題材 · 色＝區 · 資料日 {asOf || '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            橫軸：錢相對有沒有比較多進 · 縱軸：價相對有沒有變強 · 距離環：近／中／遠／外
          </p>
          {rows.length > 0 ? (
            <p className="mt-2 rounded-lg border border-cyan-500/15 bg-slate-900/80 px-3 py-2 text-sm leading-relaxed text-slate-200">
              {guide}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {(['hot', 'watch', 'cool', 'cold'] as CompositeZone[]).map((z) => (
              <span
                key={z}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/80 px-2 py-0.5"
              >
                <span
                  className="h-2.5 w-2.5 rotate-45"
                  style={{ backgroundColor: ZONE_META[z].bubble }}
                />
                <span style={{ color: ZONE_META[z].bubble }}>
                  {ZONE_META[z].corner} {ZONE_META[z].label}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {/* W1：權重三檔固定在主列 */}
          <div className="flex flex-col items-end gap-1">
            <div className="text-[11px] text-slate-400">
              綜合排序權重
              <span className="ml-1 text-slate-500">（只改 S／名次，不改位置）</span>
            </div>
            <div className="inline-flex rounded-lg border border-cyan-500/20 bg-slate-900/90 p-0.5">
              {(Object.keys(COMPOSITE_WEIGHTS) as CompositeWeightMode[]).map((m) => {
                const meta = COMPOSITE_WEIGHTS[m];
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    title={`${meta.hint}（籌 ${Math.round(meta.flow * 100)}%／價 ${Math.round(meta.price * 100)}%）`}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded border-slate-300"
              />
              顯示名稱
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={onlyTop}
                onChange={(e) => setOnlyTop(e.target.checked)}
                className="rounded border-slate-300"
              />
              只看前 {TOP_N} 名
            </label>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="rounded-md border border-cyan-500/25 bg-slate-900/60 px-2 py-0.5 text-xs text-cyan-100 hover:bg-slate-800"
            >
              題材 {pickLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="self-end text-xs font-medium text-slate-400 hover:text-cyan-300"
          >
            {showAdvanced ? '收起進階 ▴' : '進階（共振篩選）▾'}
          </button>
          {showAdvanced ? (
            <div className="w-full space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2 sm:w-auto">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyResonance}
                  onChange={(e) => setOnlyResonance(e.target.checked)}
                  className="rounded border-slate-300"
                />
                只看共振★（錢有進且價偏強）
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {rankNotice ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs leading-relaxed transition ${
            rankFlash
              ? 'border-brand-200 bg-brand-50 text-brand-900'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
          role="status"
        >
          {rankNotice}
        </div>
      ) : null}

      {showPicker ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-700">主圖顯示題材</span>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
            >
              全選
            </button>
            <button
              type="button"
              onClick={() => {
                const top = [...rows].sort((a, b) => b.scoreS - a.scoreS).slice(0, TOP_N);
                setPicked(new Set(top.map((r) => r.slug)));
              }}
              className="rounded bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
            >
              Top{TOP_N}
            </button>
            <button
              type="button"
              onClick={() => setPicked(new Set())}
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

      <div className="relative flex flex-col gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
          {!filtered.length ? (
            <RadarEmptyBlock title={emptyReason.title} tone={emptyReason.tone}>
              {emptyReason.body}
            </RadarEmptyBlock>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#070b14] shadow-inner">
              <div
                className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-40"
                aria-hidden
              >
                <div className="absolute inset-x-0 h-16 animate-radarScan bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent" />
              </div>
              <div
                className="pointer-events-none absolute inset-0 z-[5] opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
                aria-hidden
              />
              <ReactECharts
                option={option}
                style={{ height: 460 }}
                opts={{ renderer: 'canvas' }}
                onEvents={{
                  click: (params: { data?: { id?: string; name?: string } }) => {
                    const id = params?.data?.id;
                    const row =
                      (id && rows.find((r) => r.slug === id)) ||
                      rows.find((r) => r.title === params?.data?.name);
                    if (row) setSelected(row);
                  },
                }}
              />
            </div>
          )}
          <p className="mt-1 text-center text-[11px] text-slate-500">
            顯示 {filtered.length}/{rows.length} 題材 · 點火球標記看詳情 · 勾選會記住
          </p>
        </div>

        {selected ? (
          <BubbleDetailPanel row={selected} onClose={() => setSelected(null)} />
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div
          className={`overflow-x-auto rounded-xl transition ring-offset-2 ${
            rankFlash ? 'ring-2 ring-brand-300' : ''
          }`}
        >
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 px-0.5">
            <h3 className="text-sm font-semibold text-slate-200">
              綜合排序表
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                S（{w.label}：籌 {Math.round(w.flow * 100)}%／價 {Math.round(w.price * 100)}%）
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">切換權重會改此表名次，圖上位置不變</span>
          </div>
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-900/80 text-xs text-slate-400">
              <tr>
                <th className="px-2 py-1.5">#</th>
                <th className="px-2 py-1.5">題材</th>
                <th className="px-2 py-1.5 text-right">S·{w.label}</th>
                <th className="px-2 py-1.5">區域</th>
                <th className="px-2 py-1.5 text-right">籌</th>
                <th className="px-2 py-1.5 text-right">價</th>
                <th className="px-2 py-1.5">共振</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.slug}
                  className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/60 ${
                    rankFlash ? 'bg-cyan-500/10' : ''
                  }`}
                  onClick={() => setSelected(r)}
                >
                  <td className="px-2 py-1.5 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-2 py-1.5 font-medium text-slate-100">{r.title}</td>
                  <td
                    className="px-2 py-1.5 text-right tabular-nums font-semibold"
                    style={{ color: ZONE_META[r.zone].text }}
                  >
                    {r.scoreS.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ZONE_META[r.zone].badgeBg}`}
                    >
                      {ZONE_META[r.zone].label}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtC100(r.flowScore)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtC100(r.priceScore)}</td>
                  <td className="px-2 py-1.5">{r.resonance ? '★' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-slate-500">
        圖上座標＝籌碼／價的相對位置（與權重無關）。光暈大小∝籌碼規模。表格 S＝排序分（0–100）。非買賣點。
      </p>
    </section>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { themeColor } from '@/lib/data/theme-colors';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';
import { RadarHowTo } from '@/components/radar/RadarHowTo';
import { BubbleDetailPanel } from '@/components/radar/BubbleDetailPanel';

function scoreColor(s: number): string {
  if (s >= 70) return '#e11d48';
  if (s >= 55) return '#f43f5e';
  if (s >= 45) return '#f59e0b';
  if (s >= 30) return '#64748b';
  return '#334155';
}

const TOP_N = 8;

export function CompositeBubblePanel({
  rows,
  mode,
  familyBySlug,
  asOf,
}: {
  rows: CompositeRow[];
  mode: CompositeWeightMode;
  familyBySlug: Record<string, ThemeFamily | undefined>;
  asOf?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const w = COMPOSITE_WEIGHTS[mode];

  const [showLabels, setShowLabels] = useState(true);
  const [onlyTop, setOnlyTop] = useState(true); // U7
  const [onlyResonance, setOnlyResonance] = useState(false); // U9
  const [selected, setSelected] = useState<CompositeRow | null>(null); // U8

  const setMode = (m: CompositeWeightMode) => {
    const next = new URLSearchParams(sp.toString());
    if (m === 'balanced') next.delete('w');
    else next.set('w', m);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (onlyResonance) list = list.filter((r) => r.resonance);
    if (onlyTop) list = list.slice(0, TOP_N);
    return list;
  }, [rows, onlyTop, onlyResonance]);

  const guide = useMemo(() => buildStaticGuide(filtered.length ? filtered : rows), [filtered, rows]);

  const option = useMemo(() => {
    const data = filtered.map((r) => ({
      id: r.slug,
      name: r.title,
      value: [
        r.flowScore,
        r.priceScore ?? 50,
        Math.max(16, Math.min(56, Math.sqrt(Math.abs(r.net20dYi)) * 3.5 + 16)),
        r.scoreS,
      ],
      itemStyle: {
        color: scoreColor(r.scoreS),
        borderColor: themeColor(r.slug, familyBySlug[r.slug]),
        borderWidth: r.resonance ? 3 : 2,
        shadowBlur: r.resonance ? 12 : 0,
        shadowColor: r.resonance ? 'rgba(225,29,72,0.35)' : undefined,
        opacity: r.hasPrice ? 0.92 : 0.5,
      },
      label: {
        show: showLabels,
        formatter: () => shortThemeLabel(r.title),
        position: 'top',
        distance: 5,
        fontSize: 11,
        fontWeight: 600,
        color: '#1e293b',
        textBorderColor: 'rgba(255,255,255,0.95)',
        textBorderWidth: 3,
      },
    }));

    return {
      animation: true,
      animationDuration: 450,
      grid: { left: 56, right: 32, top: 48, bottom: 52 },
      // U1 四象限底色
      graphic: [
        // 用 markArea 在 series 較穩
      ],
      tooltip: {
        formatter: (p: { data?: { name?: string; value?: number[] } }) => {
          const d = p.data;
          if (!d?.value) return '';
          const row = filtered.find((x) => x.title === d.name) || rows.find((x) => x.title === d.name);
          if (!row) return d.name || '';
          const z = ZONE_META[row.zone as CompositeZone];
          return [
            `<b>${row.title}</b>`,
            `${z.corner} ${z.label}：${z.blurb}`,
            `S ${row.scoreS.toFixed(1)} · 籌 ${row.flowScore.toFixed(0)} · 價 ${row.priceScore ?? '—'}`,
            `近5日 ${row.net5dYi >= 0 ? '+' : ''}${row.net5dYi.toFixed(2)} 億 · ${row.tideLabel}`,
            row.resonance ? '★ 共振' : '',
            '<span style="opacity:.7">點擊泡泡看詳情</span>',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        name: '籌碼強度 →（右＝法人偏買）',
        min: 0,
        max: 100,
        nameLocation: 'middle',
        nameGap: 30,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#94a3b8' } },
      },
      yAxis: {
        name: '價動能 →（上＝相對偏強）',
        min: 0,
        max: 100,
        nameLocation: 'middle',
        nameGap: 40,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#94a3b8' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          markArea: {
            silent: true,
            itemStyle: { color: 'transparent' },
            data: [
              [
                {
                  name: '觀察',
                  xAxis: 0,
                  yAxis: 50,
                  itemStyle: { color: 'rgba(251, 191, 36, 0.08)' },
                  label: {
                    show: true,
                    position: 'insideTopLeft',
                    formatter: '觀察\n價強籌弱',
                    color: '#b45309',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                { xAxis: 50, yAxis: 100 },
              ],
              [
                {
                  name: '熱區',
                  xAxis: 50,
                  yAxis: 50,
                  itemStyle: { color: 'rgba(244, 63, 94, 0.07)' },
                  label: {
                    show: true,
                    position: 'insideTopRight',
                    formatter: '熱區\n籌強價強',
                    color: '#be123c',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                { xAxis: 100, yAxis: 100 },
              ],
              [
                {
                  name: '冷區',
                  xAxis: 0,
                  yAxis: 0,
                  itemStyle: { color: 'rgba(100, 116, 139, 0.08)' },
                  label: {
                    show: true,
                    position: 'insideBottomLeft',
                    formatter: '冷區\n雙弱',
                    color: '#475569',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                { xAxis: 50, yAxis: 50 },
              ],
              [
                {
                  name: '降溫',
                  xAxis: 50,
                  yAxis: 0,
                  itemStyle: { color: 'rgba(139, 92, 246, 0.07)' },
                  label: {
                    show: true,
                    position: 'insideBottomRight',
                    formatter: '降溫\n籌在價軟',
                    color: '#6d28d9',
                    fontSize: 11,
                    fontWeight: 600,
                  },
                },
                { xAxis: 100, yAxis: 50 },
              ],
            ],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', width: 1.25 },
            data: [{ xAxis: 50 }, { yAxis: 50 }],
            label: { show: false },
          },
          // U2 中心「普通」
          markPoint: {
            silent: true,
            data: [
              {
                coord: [50, 50],
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: { color: '#64748b', borderColor: '#fff', borderWidth: 2 },
                label: {
                  show: true,
                  formatter: '普通',
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
  }, [filtered, rows, familyBySlug, showLabels]);

  return (
    <section className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">綜合指標泡泡</h2>
            <RadarHowTo />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            中心＝普通 · 右上熱 / 左上觀察 / 右下降溫 / 左下冷 · S（{w.label}）· asOf {asOf || '—'}
          </p>
          {/* U5 */}
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
            {guide}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-1">
            {(Object.keys(COMPOSITE_WEIGHTS) as CompositeWeightMode[]).map((m) => {
              const meta = COMPOSITE_WEIGHTS[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  title={meta.hint}
                  onClick={() => setMode(m)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap justify-end gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded border-slate-300"
              />
              名稱
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={onlyTop}
                onChange={(e) => setOnlyTop(e.target.checked)}
                className="rounded border-slate-300"
              />
              只看 Top {TOP_N}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={onlyResonance}
                onChange={(e) => setOnlyResonance(e.target.checked)}
                className="rounded border-slate-300"
              />
              只看共振★
            </label>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
          {!filtered.length ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
              目前篩選沒有題材（試試關閉「只看共振」）
            </div>
          ) : (
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
          )}
          <p className="mt-1 text-center text-[11px] text-slate-400">
            顯示 {filtered.length}/{rows.length} 題材 · 點泡泡開啟詳情
          </p>
        </div>

        {selected ? (
          <BubbleDetailPanel row={selected} onClose={() => setSelected(null)} />
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">題材</th>
              <th className="px-2 py-1.5 text-right">S</th>
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
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                onClick={() => setSelected(r)}
              >
                <td className="px-2 py-1.5 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium text-slate-800">{r.title}</td>
                <td
                  className="px-2 py-1.5 text-right tabular-nums font-semibold"
                  style={{ color: scoreColor(r.scoreS) }}
                >
                  {r.scoreS.toFixed(1)}
                </td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{ZONE_META[r.zone].label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.flowScore.toFixed(0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {r.priceScore == null ? '—' : r.priceScore.toFixed(0)}
                </td>
                <td className="px-2 py-1.5">{r.resonance ? '★' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* U12 */}
      <p className="text-[11px] leading-relaxed text-slate-400">
        座標與 S 分是「目前篩選下的相對位置」，不是絕對好壞、也不是買賣點。資料僅彙整公開籌碼與行情。
      </p>
    </section>
  );
}

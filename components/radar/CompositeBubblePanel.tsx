'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import {
  C100_AXIS_MAX,
  C100_AXIS_MIN,
  COMPOSITE_WEIGHTS,
  ZONE_META,
  buildStaticGuide,
  zoneBubbleStyle,
  zoneMarkAreaData,
  type CompositeRow,
  type CompositeWeightMode,
  type CompositeZone,
} from '@/lib/data/theme-composite';
import { shortThemeLabel } from '@/lib/data/theme-label';
import type { ThemeFamily } from '@/lib/types';
import { RadarHowTo } from '@/components/radar/RadarHowTo';
import { BubbleDetailPanel } from '@/components/radar/BubbleDetailPanel';

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

  const [showLabels, setShowLabels] = useState(true);
  const [onlyTop, setOnlyTop] = useState(true);
  const [onlyResonance, setOnlyResonance] = useState(false);
  const [selected, setSelected] = useState<CompositeRow | null>(null);
  /** R6：權重／共振等進階預設收合 */
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const guide = useMemo(
    () => buildStaticGuide(filtered.length ? filtered : rows),
    [filtered, rows],
  );

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
      itemStyle: {
        ...zoneBubbleStyle(r.zone, { resonance: r.resonance, muted: !r.hasPrice }),
      },
      label: {
        show: showLabels,
        formatter: () => shortThemeLabel(r.title),
        position: 'top' as const,
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
      tooltip: {
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
            '<span style="opacity:.7">點擊泡泡看詳情</span>',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        name: '錢有沒有比較多進 →',
        min: C100_AXIS_MIN,
        max: C100_AXIS_MAX,
        nameLocation: 'middle',
        nameGap: 30,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: {
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      yAxis: {
        name: '價相對有沒有變強 →',
        min: C100_AXIS_MIN,
        max: C100_AXIS_MAX,
        nameLocation: 'middle',
        nameGap: 40,
        splitLine: { show: false },
        axisLine: { lineStyle: { color: '#94a3b8' } },
        axisLabel: {
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          markArea: {
            silent: true,
            data: zoneMarkAreaData() as unknown as object[],
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#94a3b8', width: 1.25 },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
            label: { show: false },
          },
          markPoint: {
            silent: true,
            data: [
              {
                coord: [0, 0],
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
  }, [filtered, rows, showLabels]);

  return (
    <section className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-800">題材熱區圖</h2>
            <RadarHowTo />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            中心＝普通 · 右上偏熱 · 左上觀察 · 右下可能降溫 · 左下偏冷 · 資料日 {asOf || '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            橫軸：錢相對有沒有比較多進 · 縱軸：價相對有沒有變強 · 顏色＝所在區域
          </p>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
            {guide}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            {(['hot', 'watch', 'cool', 'cold'] as CompositeZone[]).map((z) => (
              <span
                key={z}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 ring-1 ring-slate-200"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ZONE_META[z].bubble }}
                />
                <span style={{ color: ZONE_META[z].text }}>
                  {ZONE_META[z].corner} {ZONE_META[z].label}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap justify-end gap-3 text-xs text-slate-600">
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
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="self-end text-xs font-medium text-slate-500 hover:text-brand-600"
          >
            {showAdvanced ? '收起進階選項 ▴' : '進階選項（權重／共振）▾'}
          </button>
          {showAdvanced ? (
            <div className="w-full space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2 sm:w-auto">
              <div className="text-[11px] text-slate-500">
                綜合排序權重（目前：{w.label}）
              </div>
              <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
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

      <p className="text-[11px] leading-relaxed text-slate-400">
        圖上是和其他題材比的相對位置；表格 S 分方便排序（0–100）。非買賣點。
      </p>
    </section>
  );
}

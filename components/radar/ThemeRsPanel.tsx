'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import type { ThemeFamily } from '@/lib/types';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';
import { symmetricAroundCenter } from '@/lib/data/chart-axis';

export type RsViewRow = {
  slug: string;
  title: string;
  tier: number;
  family: string;
  rsRatio: number;
  rsMomentum: number;
  quadrant: string;
  quadrantLabel: string;
  ret20d: number;
};

const Q_META: Record<
  string,
  { badge: string; bubble: string; border: string; area: string }
> = {
  leading: {
    badge: 'bg-rose-100 text-rose-800',
    bubble: 'rgba(225, 29, 72, 0.7)',
    border: '#be123c',
    area: 'rgba(254, 226, 226, 0.4)',
  },
  improving: {
    badge: 'bg-amber-100 text-amber-900',
    bubble: 'rgba(217, 119, 6, 0.65)',
    border: '#b45309',
    area: 'rgba(254, 243, 199, 0.35)',
  },
  weakening: {
    badge: 'bg-violet-100 text-violet-800',
    bubble: 'rgba(139, 92, 246, 0.55)',
    border: '#7c3aed',
    area: 'rgba(237, 233, 254, 0.4)',
  },
  lagging: {
    badge: 'bg-slate-200 text-slate-700',
    bubble: 'rgba(100, 116, 139, 0.55)',
    border: '#475569',
    area: 'rgba(241, 245, 249, 0.55)',
  },
};

export function ThemeRsPanel({
  rows,
  meta,
  familyBySlug: _familyBySlug,
}: {
  rows: RsViewRow[];
  meta: { asOf?: string | null; dataSource?: string; symbolBars?: number };
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  void _familyBySlug;

  const option = useMemo(() => {
    const xs = rows.map((r) => r.rsRatio);
    const ys = rows.map((r) => r.rsMomentum);
    // 中心 (100,100) 固定正中
    const rx = symmetricAroundCenter(100, xs, { minHalf: 12 });
    const ry = symmetricAroundCenter(100, ys, { minHalf: 12 });
    const half = Math.max(100 - rx.min, rx.max - 100, 100 - ry.min, ry.max - 100);
    const xMin = 100 - half;
    const xMax = 100 + half;
    const yMin = 100 - half;
    const yMax = 100 + half;

    const data = rows.map((r) => {
      const q = Q_META[r.quadrant] || Q_META.lagging;
      return {
        name: r.title,
        value: [r.rsRatio, r.rsMomentum],
        itemStyle: {
          color: q.bubble,
          borderColor: q.border,
          borderWidth: 1.5,
        },
      };
    });

    return {
      grid: { left: 56, right: 28, top: 40, bottom: 48 },
      tooltip: {
        formatter: (p: { data?: { name?: string; value?: number[] } }) => {
          const d = p.data;
          if (!d?.value) return '';
          const row = rows.find((x) => x.title === d.name);
          return [
            `<b>${d.name}</b>`,
            row ? row.quadrantLabel : '',
            `相對強度 ${d.value[0].toFixed(1)}（100＝中性）`,
            `相對動量 ${d.value[1].toFixed(1)}`,
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        name: '相對強度 →（右＝比大盤強）',
        nameLocation: 'middle',
        nameGap: 28,
        min: xMin,
        max: xMax,
        scale: false,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '相對動量 →',
        nameLocation: 'middle',
        nameGap: 42,
        min: yMin,
        max: yMax,
        scale: false,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: 16,
          data,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#64748b', width: 1.25 },
            data: [{ xAxis: 100 }, { yAxis: 100 }],
            label: { show: false },
          },
          markPoint: {
            silent: true,
            data: [
              {
                coord: [100, 100],
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
          markArea: {
            silent: true,
            data: [
              [
                { xAxis: 100, yAxis: 100, itemStyle: { color: Q_META.leading.area } },
                { xAxis: xMax, yAxis: yMax },
              ],
              [
                { xAxis: xMin, yAxis: 100, itemStyle: { color: Q_META.improving.area } },
                { xAxis: 100, yAxis: yMax },
              ],
              [
                { xAxis: 100, yAxis: yMin, itemStyle: { color: Q_META.weakening.area } },
                { xAxis: xMax, yAxis: 100 },
              ],
              [
                { xAxis: xMin, yAxis: yMin, itemStyle: { color: Q_META.lagging.area } },
                { xAxis: 100, yAxis: 100 },
              ],
            ],
          },
        },
      ],
    };
  }, [rows]);

  if (!rows.length) {
    return (
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          二、純相對強弱
        </p>
        <RadarEmptyBlock title="相對強弱暫時無法計算">
          需要足夠的歷史股價才能比較題材強弱。資料累積後會自動出現。
        </RadarEmptyBlock>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          二、純相對強弱
        </p>
        <h3 className="text-base font-semibold text-slate-800">價動能象限</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          只看價，不含法人。右上領先 · 左上改善 · 右下弱化 · 左下落後 · 中心 (100,100)＝中性
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
          {(
            [
              ['leading', '領先'],
              ['improving', '改善'],
              ['weakening', '弱化'],
              ['lagging', '落後'],
            ] as const
          ).map(([k, lab]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: Q_META[k].bubble }}
              />
              {lab}
            </span>
          ))}
          <span className="ml-auto text-slate-400">
            資料日 {meta.asOf || '—'}
            {meta.symbolBars != null ? ` · ${meta.symbolBars} 檔有價` : ''}
          </span>
        </div>
        <ReactECharts option={option} style={{ height: 380 }} opts={{ renderer: 'canvas' }} />
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-2 py-1.5">題材</th>
                <th className="px-2 py-1.5">象限</th>
                <th className="px-2 py-1.5 text-right">強度</th>
                <th className="px-2 py-1.5 text-right">動量</th>
                <th className="px-2 py-1.5 text-right">20日%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const q = Q_META[r.quadrant];
                return (
                  <tr key={r.slug} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">
                      <Link
                        href={`/themes/${r.slug}?from=radar`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${q?.badge || ''}`}
                      >
                        {r.quadrantLabel}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.rsRatio.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.rsMomentum.toFixed(1)}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums ${r.ret20d >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {r.ret20d >= 0 ? '+' : ''}
                      {r.ret20d.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

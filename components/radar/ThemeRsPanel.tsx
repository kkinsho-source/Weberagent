'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import type { ThemeFamily } from '@/lib/types';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';
import {
  C100_AXIS_MAX,
  C100_AXIS_MIN,
  percentileScores,
  toC100,
} from '@/lib/data/theme-composite';
import { SQUARE_GRID, fixedCenterCrossSeries } from '@/lib/data/chart-axis';

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
    /**
     * 位置：題材間百分位 → C100，避免 RS 擠在 100 附近。
     * 象限色／標籤仍用後端依原始 RS 判定的 quadrant。
     * tooltip／表保留原始 RS、動量、20日%。
     */
    const xPct = percentileScores(rows.map((r) => r.rsRatio));
    const yPct = percentileScores(rows.map((r) => r.rsMomentum));

    const data = rows.map((r, i) => {
      const q = Q_META[r.quadrant] || Q_META.lagging;
      const x = toC100(xPct[i] ?? 50);
      const y = toC100(yPct[i] ?? 50);
      return {
        name: r.title,
        value: [x, y, r.rsRatio, r.rsMomentum, r.ret20d],
        itemStyle: {
          color: q.bubble,
          borderColor: q.border,
          borderWidth: 1.5,
        },
        label: {
          show: true,
          formatter: () => (r.title.length > 5 ? r.title.slice(0, 4) + '…' : r.title),
          position: 'top' as const,
          distance: 4,
          fontSize: 10,
          color: '#334155',
          textBorderColor: '#fff',
          textBorderWidth: 2,
        },
      };
    });

    return {
      animation: false,
      grid: { ...SQUARE_GRID },
      tooltip: {
        formatter: (p: {
          seriesId?: string;
          data?: { name?: string; value?: number[] };
        }) => {
          if (p.seriesId === 'fixed-center-cross') return '';
          const d = p.data;
          if (!d?.value) return '';
          const row = rows.find((x) => x.title === d.name);
          return [
            `<b>${d.name}</b>`,
            row ? row.quadrantLabel : '',
            `相對強度 ${Number(d.value[2]).toFixed(1)}（原始，100≈中性）`,
            `相對動量 ${Number(d.value[3]).toFixed(1)}`,
            `20日報酬 ${Number(d.value[4]) >= 0 ? '+' : ''}${Number(d.value[4]).toFixed(1)}%`,
            '圖上位置＝題材間相對排名（非原始 RS 刻度）',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        type: 'value',
        name: '相對強度（題材間偏強 →）',
        nameLocation: 'middle',
        nameGap: 30,
        min: C100_AXIS_MIN,
        max: C100_AXIS_MAX,
        scale: false,
        boundaryGap: false,
        splitNumber: 4,
        axisLabel: {
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        name: '相對動量（題材間 →）',
        nameLocation: 'middle',
        nameGap: 40,
        min: C100_AXIS_MIN,
        max: C100_AXIS_MAX,
        scale: false,
        boundaryGap: false,
        splitNumber: 4,
        axisLabel: {
          formatter: (v: number) => (v > 0 ? `+${v}` : `${v}`),
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series: [
        {
          id: 'rs-bubbles',
          type: 'scatter',
          symbolSize: 18,
          data,
          z: 3,
          animation: false,
          markArea: {
            silent: true,
            animation: false,
            data: [
              [
                {
                  xAxis: 0,
                  yAxis: 0,
                  itemStyle: { color: Q_META.leading.area },
                },
                { xAxis: C100_AXIS_MAX, yAxis: C100_AXIS_MAX },
              ],
              [
                {
                  xAxis: C100_AXIS_MIN,
                  yAxis: 0,
                  itemStyle: { color: Q_META.improving.area },
                },
                { xAxis: 0, yAxis: C100_AXIS_MAX },
              ],
              [
                {
                  xAxis: 0,
                  yAxis: C100_AXIS_MIN,
                  itemStyle: { color: Q_META.weakening.area },
                },
                { xAxis: C100_AXIS_MAX, yAxis: 0 },
              ],
              [
                {
                  xAxis: C100_AXIS_MIN,
                  yAxis: C100_AXIS_MIN,
                  itemStyle: { color: Q_META.lagging.area },
                },
                { xAxis: 0, yAxis: 0 },
              ],
            ],
          },
        },
        fixedCenterCrossSeries([0, 0], '中性'),
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
          只看價。圖上位置＝題材之間的相對排名（散開好讀）；原始 RS／動量見提示與表格。色點＝後端象限（領先／改善／弱化／落後）。
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
        <ReactECharts option={option} style={{ height: 440 }} opts={{ renderer: 'canvas' }} />
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

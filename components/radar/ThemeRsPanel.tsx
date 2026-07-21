'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import { themeColor } from '@/lib/data/theme-colors';
import type { ThemeFamily } from '@/lib/types';

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

const Q_STYLE: Record<string, string> = {
  leading: 'bg-rose-100 text-rose-800',
  improving: 'bg-amber-100 text-amber-900',
  weakening: 'bg-violet-100 text-violet-800',
  lagging: 'bg-slate-200 text-slate-700',
};

export function ThemeRsPanel({
  rows,
  meta,
  familyBySlug,
}: {
  rows: RsViewRow[];
  meta: { asOf?: string | null; dataSource?: string; symbolBars?: number };
  familyBySlug: Record<string, ThemeFamily | undefined>;
}) {
  const option = useMemo(() => {
    const data = rows.map((r) => ({
      name: r.title,
      value: [r.rsRatio, r.rsMomentum],
      itemStyle: { color: themeColor(r.slug, familyBySlug[r.slug]) },
    }));
    return {
      grid: { left: 52, right: 20, top: 28, bottom: 40 },
      tooltip: {
        formatter: (p: { data?: { name?: string; value?: number[] } }) => {
          const d = p.data;
          if (!d?.value) return '';
          return `${d.name}<br/>RS ${d.value[0].toFixed(1)} · 動量 ${d.value[1].toFixed(1)}`;
        },
      },
      xAxis: {
        name: '相對強度 RS（100=中性）',
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '相對動量',
        nameLocation: 'middle',
        nameGap: 36,
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
            lineStyle: { color: '#94a3b8' },
            data: [{ xAxis: 100 }, { yAxis: 100 }],
          },
        },
      ],
    };
  }, [rows, familyBySlug]);

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        尚無足夠歷史股價做相對強弱（需 Supabase stock_prices）。
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">價動能 · 相對強弱</h2>
          <p className="text-xs text-slate-400">
            右上=領先 · 左上=改善 · 右下=弱化 · 左下=落後（順時針輪動直覺）· asOf {meta.asOf || '—'} ·{' '}
            {meta.symbolBars ?? 0} 檔有價
          </p>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 380 }} opts={{ renderer: 'canvas' }} />
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5">題材</th>
              <th className="px-2 py-1.5">象限</th>
              <th className="px-2 py-1.5 text-right">RS</th>
              <th className="px-2 py-1.5 text-right">動量</th>
              <th className="px-2 py-1.5 text-right">20日%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <Link href={`/themes/${r.slug}`} className="font-medium text-brand-700 hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-2 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${Q_STYLE[r.quadrant] || ''}`}>
                    {r.quadrantLabel}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.rsRatio.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.rsMomentum.toFixed(1)}</td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums ${r.ret20d >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                >
                  {r.ret20d >= 0 ? '+' : ''}
                  {r.ret20d.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

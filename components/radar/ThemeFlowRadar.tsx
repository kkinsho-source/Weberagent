'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';

export type RadarRow = {
  slug: string;
  title: string;
  tier: number;
  family: string;
  net1dYi: number;
  net5dYi: number;
  net20dYi: number;
  accelYi: number;
  state: string;
  stateLabel: string;
  stockCount: number;
  color?: string;
};

const STATE_STYLE: Record<string, string> = {
  inflow_accel: 'bg-rose-100 text-rose-800',
  inflow_slow: 'bg-amber-100 text-amber-800',
  outflow_slow: 'bg-sky-100 text-sky-800',
  outflow_accel: 'bg-slate-200 text-slate-700',
};

function fmtYi(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

export function ThemeFlowRadar({
  rows,
  counts,
  meta,
}: {
  rows: RadarRow[];
  counts: Record<string, number>;
  meta: {
    asOf?: string | null;
    source?: string;
    dayCount?: number;
    symbolCoverage?: number;
    dataSource?: string;
    stocksDataSource?: string;
  };
}) {
  const option = useMemo(() => {
    const data = rows.map((r) => ({
      name: r.title,
      value: [r.net5dYi, r.accelYi, Math.max(8, Math.min(60, Math.sqrt(Math.abs(r.net20dYi)) * 4 + 8))],
      slug: r.slug,
      itemStyle: { color: r.color || '#64748b' },
    }));
    return {
      grid: { left: 48, right: 24, top: 32, bottom: 40 },
      tooltip: {
        trigger: 'item',
        formatter: (p: { data?: { name?: string; value?: number[]; slug?: string } }) => {
          const d = p.data;
          if (!d?.value) return '';
          return `${d.name}<br/>近5日 ${fmtYi(d.value[0])} 億<br/>加速度 ${fmtYi(d.value[1])} 億/日`;
        },
      },
      xAxis: {
        name: '近5日淨額（億）→',
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLine: { lineStyle: { color: '#94a3b8' } },
      },
      yAxis: {
        name: '加速度（5日均−20日均）',
        nameLocation: 'middle',
        nameGap: 36,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLine: { lineStyle: { color: '#94a3b8' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#cbd5e1', type: 'solid' },
            data: [{ xAxis: 0 }, { yAxis: 0 }],
          },
        },
      ],
    };
  }, [rows]);

  const empty = !rows.length || meta.dataSource === 'empty';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: 'inflow_accel', label: '漲潮', sub: '流入加速' },
          { k: 'inflow_slow', label: '輪動', sub: '流入放緩' },
          { k: 'outflow_slow', label: '觀望', sub: '流出放緩' },
          { k: 'outflow_accel', label: '退潮', sub: '流出加速' },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">
              {c.label} · {c.sub}
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{counts[c.k] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-800">題材資金泡泡</h2>
            <p className="text-xs text-slate-400">
              X=近5日法人淨額（億）· Y=加速度 · 泡泡大小∝|近20日| · 右上≈最強
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            asOf {meta.asOf || '—'} · {meta.dayCount ?? 0} 交易日 · 覆蓋 {meta.symbolCoverage ?? 0} 檔 ·{' '}
            {meta.dataSource}
          </p>
        </div>
        {empty ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            尚無法人快取。請先跑{' '}
            <code className="rounded bg-slate-200 px-1 text-xs">python3 scripts/etl/institutional_daily.py</code>
          </div>
        ) : (
          <ReactECharts option={option} style={{ height: 420 }} opts={{ renderer: 'canvas' }} />
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">題材</th>
              <th className="px-3 py-2 font-medium">狀態</th>
              <th className="px-3 py-2 font-medium text-right">近1日億</th>
              <th className="px-3 py-2 font-medium text-right">近5日億</th>
              <th className="px-3 py-2 font-medium text-right">近20日億</th>
              <th className="px-3 py-2 font-medium text-right">加速度</th>
              <th className="px-3 py-2 font-medium text-right">檔數</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-3 py-2">
                  <Link href={`/themes/${r.slug}`} className="font-medium text-brand-700 hover:underline">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: r.color || '#94a3b8' }}
                    />
                    {r.title}
                  </Link>
                  <div className="text-[10px] text-slate-400">
                    {r.tier === 0 ? '粗網' : 'AI鏈'} · {r.family}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_STYLE[r.state] || 'bg-slate-100'}`}
                  >
                    {r.stateLabel}
                  </span>
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.net1dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {fmtYi(r.net1dYi)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {fmtYi(r.net5dYi)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.net20dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {fmtYi(r.net20dYi)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtYi(r.accelYi)}</td>
                <td className="px-3 py-2 text-right text-slate-500">{r.stockCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

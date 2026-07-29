'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Link from 'next/link';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';
import {
  SQUARE_GRID,
  fixedCenterCrossSeries,
  halfRangeAroundZero,
} from '@/lib/data/chart-axis';

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

/** 漲潮／輪動／觀望／退潮 — 四態色（B1） */
const STATE_META: Record<
  string,
  { label: string; sub: string; badge: string; bubble: string; border: string }
> = {
  inflow_accel: {
    label: '漲潮',
    sub: '流入加速',
    badge: 'bg-rose-100 text-rose-800',
    bubble: 'rgba(225, 29, 72, 0.72)',
    border: '#be123c',
  },
  inflow_slow: {
    label: '輪動',
    sub: '流入放緩',
    badge: 'bg-amber-100 text-amber-900',
    bubble: 'rgba(217, 119, 6, 0.65)',
    border: '#b45309',
  },
  outflow_slow: {
    label: '觀望',
    sub: '流出放緩',
    badge: 'bg-sky-100 text-sky-900',
    bubble: 'rgba(14, 165, 233, 0.55)',
    border: '#0284c7',
  },
  outflow_accel: {
    label: '退潮',
    sub: '流出加速',
    badge: 'bg-slate-200 text-slate-700',
    bubble: 'rgba(100, 116, 139, 0.55)',
    border: '#475569',
  },
};

function familyPlain(family: string, tier: number): string {
  const t = tier === 0 ? '粗網' : 'AI鏈';
  const f: Record<string, string> = {
    ai_chain: 'AI',
    defensive: '防禦',
    cyclical: '循環',
    electronics_ex_ai: '其他電子',
    benchmark: '基準',
    other: '其他',
  };
  return `${t} · ${f[family] || '其他'}`;
}

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
    const xs = rows.map((r) => r.net5dYi);
    const ys = rows.map((r) => r.accelYi);
    // 同一半軸長 → (0,0) 在繪圖區正中
    const half = Math.max(
      halfRangeAroundZero(xs, { minHalf: 0.5 }),
      halfRangeAroundZero(ys, { minHalf: 0.2 }),
    );
    const lo = -half;
    const hi = half;

    const data = rows.map((r) => {
      const st = STATE_META[r.state] || STATE_META.outflow_accel;
      return {
        name: r.title,
        value: [
          r.net5dYi,
          r.accelYi,
          Math.max(8, Math.min(60, Math.sqrt(Math.abs(r.net20dYi)) * 4 + 8)),
        ],
        slug: r.slug,
        itemStyle: {
          color: st.bubble,
          borderColor: st.border,
          borderWidth: 1.5,
        },
      };
    });

    return {
      animation: false,
      grid: { ...SQUARE_GRID },
      tooltip: {
        trigger: 'item',
        formatter: (p: {
          seriesId?: string;
          data?: { name?: string; value?: number[]; slug?: string };
        }) => {
          if (p.seriesId === 'fixed-center-cross') return '';
          const d = p.data;
          if (!d?.value) return '';
          const row = rows.find((x) => x.title === d.name);
          const st = row ? STATE_META[row.state] : null;
          return [
            `<b>${d.name}</b>`,
            st ? `${st.label}（${st.sub}）` : '',
            `近5日 ${fmtYi(d.value[0])} 億`,
            `加速度 ${fmtYi(d.value[1])} 億/日`,
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        type: 'value',
        name: '近5日法人淨額（億）→',
        nameLocation: 'middle',
        nameGap: 30,
        min: lo,
        max: hi,
        scale: false,
        boundaryGap: false,
        splitNumber: 4,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLine: { show: true, lineStyle: { color: '#94a3b8' } },
        axisTick: { show: true },
      },
      yAxis: {
        type: 'value',
        name: '加速度 →',
        nameLocation: 'middle',
        nameGap: 40,
        min: lo,
        max: hi,
        scale: false,
        boundaryGap: false,
        splitNumber: 4,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLine: { show: true, lineStyle: { color: '#94a3b8' } },
        axisTick: { show: true },
      },
      series: [
        {
          id: 'flow-bubbles',
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          z: 3,
          animation: false,
          markArea: {
            silent: true,
            animation: false,
            data: [
              [
                { xAxis: 0, yAxis: 0, itemStyle: { color: 'rgba(254, 226, 226, 0.35)' } },
                { xAxis: hi, yAxis: hi },
              ],
              [
                { xAxis: lo, yAxis: 0, itemStyle: { color: 'rgba(254, 243, 199, 0.3)' } },
                { xAxis: 0, yAxis: hi },
              ],
              [
                { xAxis: 0, yAxis: lo, itemStyle: { color: 'rgba(224, 242, 254, 0.3)' } },
                { xAxis: hi, yAxis: 0 },
              ],
              [
                { xAxis: lo, yAxis: lo, itemStyle: { color: 'rgba(241, 245, 249, 0.5)' } },
                { xAxis: 0, yAxis: 0 },
              ],
            ],
          },
        },
        fixedCenterCrossSeries([0, 0], '中性'),
      ],
    };
  }, [rows]);

  const empty = !rows.length || meta.dataSource === 'empty';

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          一、純籌碼
        </p>
        <h3 className="text-base font-semibold text-slate-800">題材資金泡泡</h3>
        <p className="mt-0.5 text-xs text-slate-400">
          只看法人進出，不含股價相對強弱。顏色＝四態（漲潮／輪動／觀望／退潮），不是綜合熱區圖那套。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            'inflow_accel',
            'inflow_slow',
            'outflow_slow',
            'outflow_accel',
          ] as const
        ).map((k) => {
          const c = STATE_META[k];
          return (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: c.bubble }}
                />
                {c.label} · {c.sub}
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-800">{counts[k] ?? 0}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <p className="text-xs text-slate-400">
            右＝近5日買超多 · 上＝流入加速 · 泡泡越大＝近20日絕對額越大
          </p>
          <p className="text-[11px] tabular-nums text-slate-400">
            資料日 {meta.asOf || '—'}
            {meta.dayCount != null ? ` · ${meta.dayCount} 日` : ''}
            {meta.symbolCoverage != null ? ` · ${meta.symbolCoverage} 檔` : ''}
          </p>
        </div>
        {empty ? (
          <RadarEmptyBlock title="法人籌碼尚無法顯示" tone="warn">
            盤後資料可能尚未齊全。請稍後重新整理；若主圖熱區仍有資料，可先看主圖。
          </RadarEmptyBlock>
        ) : (
          <ReactECharts option={option} style={{ height: 420 }} opts={{ renderer: 'canvas' }} />
        )}
      </div>

      {!empty ? (
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
              {rows.map((r) => {
                const st = STATE_META[r.state];
                return (
                  <tr key={r.slug} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      <Link
                        href={`/themes/${r.slug}?from=radar`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: st?.bubble || '#94a3b8' }}
                        />
                        {r.title}
                      </Link>
                      <div className="text-[10px] text-slate-400">
                        {familyPlain(r.family, r.tier)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st?.badge || 'bg-slate-100'}`}
                      >
                        {r.stateLabel}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${r.net1dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {fmtYi(r.net1dYi)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${r.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {fmtYi(r.net5dYi)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${r.net20dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {fmtYi(r.net20dYi)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {fmtYi(r.accelYi)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">{r.stockCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

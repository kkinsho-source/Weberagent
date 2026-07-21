'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import {
  COMPOSITE_WEIGHTS,
  type CompositeRow,
  type CompositeWeightMode,
} from '@/lib/data/theme-composite';
import { themeColor } from '@/lib/data/theme-colors';
import type { ThemeFamily } from '@/lib/types';

function scoreColor(s: number): string {
  // 0 slate → 50 amber → 100 rose
  if (s >= 70) return '#e11d48';
  if (s >= 55) return '#f43f5e';
  if (s >= 45) return '#f59e0b';
  if (s >= 30) return '#64748b';
  return '#334155';
}

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

  const setMode = (m: CompositeWeightMode) => {
    const next = new URLSearchParams(sp.toString());
    if (m === 'balanced') next.delete('w');
    else next.set('w', m);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const option = useMemo(() => {
    const data = rows.map((r) => ({
      name: r.title,
      value: [
        r.flowScore,
        r.priceScore ?? 50,
        Math.max(10, Math.min(52, Math.sqrt(Math.abs(r.net20dYi)) * 3.5 + 10)),
        r.scoreS,
      ],
      itemStyle: {
        color: scoreColor(r.scoreS),
        borderColor: themeColor(r.slug, familyBySlug[r.slug]),
        borderWidth: 2,
        opacity: r.hasPrice ? 0.92 : 0.45,
      },
    }));
    return {
      grid: { left: 52, right: 24, top: 36, bottom: 44 },
      tooltip: {
        formatter: (p: {
          data?: { name?: string; value?: number[] };
        }) => {
          const d = p.data;
          if (!d?.value) return '';
          const row = rows.find((x) => x.title === d.name);
          return [
            `<b>${d.name}</b>`,
            `綜合分 S：${d.value[3].toFixed(1)}`,
            `籌碼分：${d.value[0].toFixed(1)} · 價動能分：${row?.hasPrice ? d.value[1].toFixed(1) : '缺'}`,
            `近5日：${row ? (row.net5dYi >= 0 ? '+' : '') + row.net5dYi.toFixed(2) : '—'} 億`,
            row?.resonance ? '★ 共振（籌流入＋價領先/改善）' : '',
          ]
            .filter(Boolean)
            .join('<br/>');
        },
      },
      xAxis: {
        name: '籌碼強度 →',
        min: 0,
        max: 100,
        nameLocation: 'middle',
        nameGap: 28,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      yAxis: {
        name: '價動能強度 →',
        min: 0,
        max: 100,
        nameLocation: 'middle',
        nameGap: 36,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
      },
      series: [
        {
          type: 'scatter',
          symbolSize: (val: number[]) => val[2],
          data,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#cbd5e1' },
            data: [{ xAxis: 50 }, { yAxis: 50 }],
          },
        },
      ],
    };
  }, [rows, familyBySlug]);

  return (
    <section className="space-y-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">綜合指標泡泡</h2>
          <p className="mt-1 text-xs text-slate-500">
            X=籌碼強度（近5日淨額＋加速度，當日百分位）· Y=價動能（RS×動量百分位）· 顏色/排序=綜合分
            S（{w.label}：籌 {Math.round(w.flow * 100)}% / 價 {Math.round(w.price * 100)}%）· 中線=50 ·
            asOf {asOf || '—'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            右上≈籌碼與價同向偏強；半透明=缺歷史價 RS。非預測、非投顧建議。
          </p>
        </div>
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
      </div>

      {!rows.length ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
          尚無綜合資料
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 420 }} opts={{ renderer: 'canvas' }} />
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">題材</th>
              <th className="px-2 py-1.5 text-right">S</th>
              <th className="px-2 py-1.5 text-right">籌</th>
              <th className="px-2 py-1.5 text-right">價</th>
              <th className="px-2 py-1.5">籌碼</th>
              <th className="px-2 py-1.5">價象限</th>
              <th className="px-2 py-1.5">共振</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.slug} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-xs text-slate-400">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <Link href={`/themes/${r.slug}`} className="font-medium text-brand-700 hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: scoreColor(r.scoreS) }}>
                  {r.scoreS.toFixed(1)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.flowScore.toFixed(0)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                  {r.priceScore == null ? '—' : r.priceScore.toFixed(0)}
                </td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{r.tideLabel}</td>
                <td className="px-2 py-1.5 text-xs text-slate-500">{r.quadrantLabel}</td>
                <td className="px-2 py-1.5">
                  {r.resonance ? (
                    <span className="text-xs font-medium text-rose-600">★</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

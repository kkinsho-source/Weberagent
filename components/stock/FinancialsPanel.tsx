'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

type Revenue = {
  yearMonth: string;
  revenue: number;
  momPct: number | null;
  yoyPct: number | null;
};
type Eps = { year: number; season: number; eps: number };

export function FinancialsPanel({ symbol }: { symbol: string }) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [eps, setEps] = useState<Eps[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/financials/${symbol}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        if (cancelled) return;
        setRevenues(json.revenues || []);
        setEps(json.eps || []);
        setSource(json.dataSource || '');
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const option = useMemo(() => {
    const cats = revenues.map((r) => r.yearMonth.slice(2)); // 短標籤
    const vals = revenues.map((r) => Math.round(r.revenue / 1000)); // 百萬
    const yoy = revenues.map((r) => r.yoyPct);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['營收(百萬)', '年增%'],
        top: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: 48, right: 44, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: cats,
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: cats.length > 8 ? 30 : 0 },
      },
      yAxis: [
        {
          type: 'value',
          name: '百萬',
          axisLabel: { color: '#94a3b8', fontSize: 10 },
          splitLine: { lineStyle: { color: '#f1f5f9' } },
        },
        {
          type: 'value',
          name: '%',
          axisLabel: { color: '#94a3b8', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '營收(百萬)',
          type: 'bar',
          data: vals,
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '年增%',
          type: 'line',
          yAxisIndex: 1,
          data: yoy,
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  }, [revenues]);

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">載入財報…</div>;
  if (err) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;

  const last = revenues[revenues.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>月營收（近 {revenues.length} 月）· 單位換算為百萬元</span>
        <span className="truncate max-w-[50%]">{source}</span>
      </div>

      {last && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-400">最新月營收</div>
            <div className="font-semibold text-slate-800">
              {(last.revenue / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 百萬
            </div>
            <div className="text-[11px] text-slate-400">{last.yearMonth}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-400">月增</div>
            <div className={`font-semibold ${(last.momPct ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
              {last.momPct != null ? `${last.momPct >= 0 ? '+' : ''}${last.momPct.toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-400">年增</div>
            <div className={`font-semibold ${(last.yoyPct ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
              {last.yoyPct != null ? `${last.yoyPct >= 0 ? '+' : ''}${last.yoyPct.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
      )}

      {revenues.length > 0 ? (
        <ReactECharts
          option={option}
          style={{ height: revenues.length > 6 ? 280 : 240, width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      ) : (
        <p className="text-sm text-slate-400">此檔無月營收資料（可能為金融/特殊產業或尚未申報）。</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">季 EPS</h3>
        {eps.length === 0 ? (
          <p className="text-sm text-slate-400">無季報 EPS 資料</p>
        ) : (
          <>
            <div className="mb-2 text-xs text-slate-400">近 {eps.length} 季</div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-1">年度</th>
                  <th className="py-1">季別</th>
                  <th className="py-1">EPS（元）</th>
                </tr>
              </thead>
              <tbody>
                {[...eps].reverse().map((e) => (
                  <tr key={`${e.year}-Q${e.season}`} className="border-t border-slate-100">
                    <td className="py-1.5">{e.year}</td>
                    <td className="py-1.5">Q{e.season}</td>
                    <td className={`py-1.5 font-medium ${e.eps >= 0 ? 'text-slate-800' : 'text-down'}`}>
                      {e.eps.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

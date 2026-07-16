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
type Income = {
  date: string;
  year: number;
  season: number;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  pretaxIncome: number | null;
  netIncome: number | null;
  eps: number | null;
};

function yi(n: number | null): string {
  if (n == null) return '—';
  // FinMind 財報單位多為元
  return (n / 1e8).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' 億';
}

export function FinancialsPanel({ symbol }: { symbol: string }) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [eps, setEps] = useState<Eps[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [source, setSource] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [fin, prof] = await Promise.all([
          fetch(`/api/financials/${symbol}`).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
          fetch(`/api/stock-profile/${symbol}`).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
        ]);
        if (cancelled) return;
        if (!fin.ok) throw new Error(fin.j.error || 'financials failed');
        setRevenues(fin.j.revenues || []);
        setEps(fin.j.eps || []);
        setSource(fin.j.dataSource || '');
        if (prof.ok) setIncome(prof.j.income || []);
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
    const cats = revenues.map((r) => r.yearMonth.slice(2));
    const vals = revenues.map((r) => Math.round(r.revenue / 1000));
    const yoy = revenues.map((r) => r.yoyPct);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
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
  const lastInc = income[income.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>月營收（近 {revenues.length} 月）· 單位換算為百萬元</span>
        <span className="max-w-[50%] truncate">{source}</span>
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
              {last.momPct != null
                ? `${last.momPct >= 0 ? '+' : ''}${last.momPct.toFixed(1)}%`
                : '—'}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-400">年增</div>
            <div className={`font-semibold ${(last.yoyPct ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
              {last.yoyPct != null
                ? `${last.yoyPct >= 0 ? '+' : ''}${last.yoyPct.toFixed(1)}%`
                : '—'}
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
        <p className="text-sm text-slate-400">此檔無月營收資料。</p>
      )}

      {lastInc && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            最新單季損益（{lastInc.year} Q{lastInc.season}）
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Mini k="營收" v={yi(lastInc.revenue)} />
            <Mini k="毛利" v={yi(lastInc.grossProfit)} />
            <Mini k="營業利益" v={yi(lastInc.operatingIncome)} />
            <Mini k="稅前淨利" v={yi(lastInc.pretaxIncome)} />
            <Mini k="稅後淨利" v={yi(lastInc.netIncome)} />
            <Mini
              k="EPS"
              v={lastInc.eps != null ? lastInc.eps.toFixed(2) : '—'}
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">季報損益表（近 {income.length} 季）</h3>
        {income.length === 0 ? (
          <p className="text-sm text-slate-400">無季報損益資料</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">期間</th>
                  <th className="px-3 py-2">營收</th>
                  <th className="px-3 py-2">毛利</th>
                  <th className="px-3 py-2">營業利益</th>
                  <th className="px-3 py-2">稅後淨利</th>
                  <th className="px-3 py-2">EPS</th>
                </tr>
              </thead>
              <tbody>
                {[...income].reverse().map((q) => (
                  <tr key={q.date} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {q.year} Q{q.season}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{yi(q.revenue)}</td>
                    <td className="px-3 py-2 tabular-nums">{yi(q.grossProfit)}</td>
                    <td className="px-3 py-2 tabular-nums">{yi(q.operatingIncome)}</td>
                    <td className="px-3 py-2 tabular-nums">{yi(q.netIncome)}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">
                      {q.eps != null ? q.eps.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">季 EPS（近 {eps.length} 季）</h3>
        {eps.length === 0 ? (
          <p className="text-sm text-slate-400">無季報 EPS 資料</p>
        ) : (
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
                    <td
                      className={`py-1.5 font-medium ${e.eps >= 0 ? 'text-slate-800' : 'text-down'}`}
                    >
                      {e.eps.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="font-semibold text-slate-800">{v}</div>
    </div>
  );
}

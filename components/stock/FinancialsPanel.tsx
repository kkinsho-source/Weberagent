'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Sparkline } from '@/components/ui/Sparkline';

type Revenue = {
  yearMonth: string;
  revenue: number;
  momPct: number | null;
  yoyPct: number | null;
};
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
type Balance = {
  date: string;
  year: number;
  season: number;
  cash: number | null;
  currentAssets: number | null;
  totalAssets: number | null;
  currentLiabilities: number | null;
  totalLiabilities: number | null;
  equity: number | null;
};
type Cashflow = {
  date: string;
  year: number;
  season: number;
  operating: number | null;
  investing: number | null;
  financing: number | null;
  endCash: number | null;
};

function yi(n: number | null): string {
  if (n == null) return '—';
  return (n / 1e8).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' 億';
}

function pct(num: number | null, den: number | null): string {
  if (num == null || den == null || !den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function ratio(num: number | null, den: number | null): number | null {
  if (num == null || den == null || !den) return null;
  return (num / den) * 100;
}

export function FinancialsPanel({ symbol }: { symbol: string }) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [cashflow, setCashflow] = useState<Cashflow[]>([]);
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
        setSource(fin.j.dataSource || '');
        if (prof.ok) {
          setIncome(prof.j.income || []);
          setBalance(prof.j.balance || []);
          setCashflow(prof.j.cashflow || []);
        }
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
        <span>月營收（近 {revenues.length} 月）</span>
        <span className="max-w-[50%] truncate">{source}</span>
      </div>

      {last && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Mini
            k="最新月營收"
            v={`${(last.revenue / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} 百萬`}
            sub={last.yearMonth}
          />
          <Mini
            k="月增"
            v={
              last.momPct != null
                ? `${last.momPct >= 0 ? '+' : ''}${last.momPct.toFixed(1)}%`
                : '—'
            }
          />
          <Mini
            k="年增"
            v={
              last.yoyPct != null
                ? `${last.yoyPct >= 0 ? '+' : ''}${last.yoyPct.toFixed(1)}%`
                : '—'
            }
          />
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
            <Mini k="EPS" v={lastInc.eps != null ? lastInc.eps.toFixed(2) : '—'} />
          </div>
          {/* F1 比率色條 */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <RatioPill k="毛利率" v={ratio(lastInc.grossProfit, lastInc.revenue)} />
            <RatioPill k="營益率" v={ratio(lastInc.operatingIncome, lastInc.revenue)} />
            <RatioPill k="淨利率" v={ratio(lastInc.netIncome, lastInc.revenue)} />
            <RatioPill
              k="ROE"
              v={ratio(lastInc.netIncome, balance[balance.length - 1]?.equity ?? null)}
            />
            <RatioPill
              k="ROA"
              v={ratio(lastInc.netIncome, balance[balance.length - 1]?.totalAssets ?? null)}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            比率以最近一季損益 ÷ 對應分母（ROE/ROA 用最近一季權益/總資產），僅供參考。
          </p>
          {income.length >= 2 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold text-slate-600">多季毛利率 / 淨利率</h4>
              <ReactECharts
                option={{
                  tooltip: { trigger: 'axis' },
                  legend: {
                    data: ['毛利率%', '淨利率%'],
                    top: 0,
                    textStyle: { fontSize: 11, color: '#64748b' },
                  },
                  grid: { left: 40, right: 16, top: 28, bottom: 24 },
                  xAxis: {
                    type: 'category',
                    data: income.map((q) => `${q.year}Q${q.season}`),
                    axisLabel: { fontSize: 10, color: '#94a3b8' },
                  },
                  yAxis: {
                    type: 'value',
                    axisLabel: { fontSize: 10, color: '#94a3b8' },
                    splitLine: { lineStyle: { color: '#f1f5f9' } },
                  },
                  series: [
                    {
                      name: '毛利率%',
                      type: 'line',
                      smooth: true,
                      data: income.map((q) =>
                        q.revenue && q.grossProfit != null
                          ? +((q.grossProfit / q.revenue) * 100).toFixed(1)
                          : null
                      ),
                      color: '#3b82f6',
                    },
                    {
                      name: '淨利率%',
                      type: 'line',
                      smooth: true,
                      data: income.map((q) =>
                        q.revenue && q.netIncome != null
                          ? +((q.netIncome / q.revenue) * 100).toFixed(1)
                          : null
                      ),
                      color: '#f59e0b',
                    },
                  ],
                }}
                style={{ height: 200, width: '100%' }}
              />
            </div>
          )}
        </div>
      )}

      <Section title="季報損益">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">淨利走勢</span>
        <Sparkline values={income.map((x) => x.netIncome)} width={96} height={24} />
      </div>
      <TableBlock title={`季報損益表（近 ${income.length} 季）`}>
        {income.length === 0 ? (
          <Empty />
        ) : (
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
              {[...income].reverse().map((q, i) => (
                <tr
                  key={q.date}
                  className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {q.year} Q{q.season}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.revenue)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.grossProfit)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.operatingIncome)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.netIncome)}</td>
                  <td
                    className={`px-3 py-2 tabular-nums font-medium ${
                      (q.eps ?? 0) >= 0 ? 'text-up' : 'text-down'
                    }`}
                  >
                    {q.eps != null ? q.eps.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableBlock>
      </Section>

      <TableBlock title={`資產負債（近 ${balance.length} 季）`}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-400">
          總資產走勢 <Sparkline values={balance.map((x) => x.totalAssets)} width={96} />
          <span className="mx-1">·</span>
          權益 <Sparkline values={balance.map((x) => x.equity)} width={96} />
        </div>
        {balance.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">期間</th>
                <th className="px-3 py-2">現金</th>
                <th className="px-3 py-2">流動資產</th>
                <th className="px-3 py-2">總資產</th>
                <th className="px-3 py-2">流動負債</th>
                <th className="px-3 py-2">總負債</th>
                <th className="px-3 py-2">權益</th>
              </tr>
            </thead>
            <tbody>
              {[...balance].reverse().map((q, i) => (
                <tr
                  key={q.date}
                  className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {q.year} Q{q.season}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.cash)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.currentAssets)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.totalAssets)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.currentLiabilities)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.totalLiabilities)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.equity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableBlock>

      <TableBlock title={`現金流（近 ${cashflow.length} 季）`}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-400">
          營運 CF <Sparkline values={cashflow.map((x) => x.operating)} width={96} />
          <span className="mx-1">·</span>
          期末現金 <Sparkline values={cashflow.map((x) => x.endCash)} width={96} />
        </div>
        {cashflow.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">期間</th>
                <th className="px-3 py-2">營運</th>
                <th className="px-3 py-2">投資</th>
                <th className="px-3 py-2">融資</th>
                <th className="px-3 py-2">期末現金</th>
              </tr>
            </thead>
            <tbody>
              {[...cashflow].reverse().map((q, i) => (
                <tr
                  key={q.date}
                  className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {q.year} Q{q.season}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.operating)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.investing)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.financing)}</td>
                  <td className="px-3 py-2 tabular-nums">{yi(q.endCash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableBlock>
    </div>
  );
}

function Mini({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="font-semibold text-slate-800">{v}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function RatioPill({ k, v }: { k: string; v: number | null }) {
  const w = v == null ? 0 : Math.max(0, Math.min(100, Math.abs(v)));
  const pos = v != null && v >= 0;
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
      <div className="text-xs text-slate-400">{k}</div>
      <div className={`text-sm font-semibold ${v == null ? 'text-slate-400' : pos ? 'text-up' : 'text-down'}`}>
        {v == null ? '—' : `${v.toFixed(1)}%`}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${pos ? 'bg-red-400/80' : 'bg-emerald-400/80'}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function TableBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="p-4 text-sm text-slate-400">暫無資料</p>;
}

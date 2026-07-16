'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import ReactECharts from 'echarts-for-react';

type Bar = {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number | null;
  volume?: number | null;
};

type MaKey = 'ma5' | 'ma10' | 'ma20' | 'ma60';
type Tf = 'day' | 'week' | 'month';

const MA_META: Record<MaKey, { period: number; color: string; label: string }> = {
  ma5: { period: 5, color: '#f59e0b', label: '5MA' },
  ma10: { period: 10, color: '#a855f7', label: '10MA' },
  ma20: { period: 20, color: '#3b82f6', label: '20MA' },
  ma60: { period: 60, color: '#14b8a6', label: '60MA' },
};

function sma(closes: number[], period: number): Array<number | null> {
  const out: Array<number | null> = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function stdev(arr: number[], period: number, i: number): number | null {
  if (i < period - 1) return null;
  const slice = arr.slice(i - period + 1, i + 1);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const v = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  return Math.sqrt(v);
}

function bollinger(closes: number[], period = 20, k = 2) {
  const mid = sma(closes, period);
  const upper: Array<number | null> = [];
  const lower: Array<number | null> = [];
  for (let i = 0; i < closes.length; i++) {
    const s = stdev(closes, period, i);
    if (mid[i] == null || s == null) {
      upper.push(null);
      lower.push(null);
    } else {
      upper.push(mid[i]! + k * s);
      lower.push(mid[i]! - k * s);
    }
  }
  return { mid, upper, lower };
}

/** 日線 → 週/月 K */
function aggregateBars(bars: Bar[], tf: Tf): Bar[] {
  if (tf === 'day') return bars;
  const map = new Map<string, Bar[]>();
  for (const b of bars) {
    if (!b.date || b.close == null) continue;
    const d = new Date(b.date + 'T00:00:00');
    let key: string;
    if (tf === 'week') {
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - day + 1);
      key = monday.toISOString().slice(0, 10);
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  const out: Bar[] = [];
  for (const [key, list] of Array.from(map.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const first = list[0];
    const last = list[list.length - 1];
    const highs = list.map((x) => Number(x.high ?? x.close ?? 0));
    const lows = list.map((x) => Number(x.low ?? x.close ?? 0));
    out.push({
      date: tf === 'week' ? last.date! : key,
      open: Number(first.open ?? first.close),
      high: Math.max(...highs),
      low: Math.min(...lows),
      close: Number(last.close),
      volume: list.reduce((s, x) => s + Number(x.volume || 0), 0),
    });
  }
  return out;
}

type InstDay = { date: string; foreign: number; trust: number; dealer: number };

export function StockPriceChart({
  symbol,
  name,
}: {
  symbol: string;
  name?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const maSeriesRef = useRef<Partial<Record<MaKey, ISeriesApi<'Line'>>>>({});
  const bbRef = useRef<Partial<Record<'u' | 'm' | 'l', ISeriesApi<'Line'>>>>({});
  const [rawBars, setRawBars] = useState<Bar[]>([]);
  const [inst, setInst] = useState<InstDay[]>([]);
  const [source, setSource] = useState('');
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tf, setTf] = useState<Tf>('day');
  const [maOn, setMaOn] = useState<Record<MaKey, boolean>>({
    ma5: false,
    ma10: false,
    ma20: false,
    ma60: false,
  });
  const [bbOn, setBbOn] = useState(false);
  const [deductOn, setDeductOn] = useState(false);

  const bars = useMemo(() => aggregateBars(rawBars, tf), [rawBars, tf]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [pRes, iRes] = await Promise.all([
          fetch(`/api/prices/${symbol}?limit=320&refresh=1`, { cache: 'no-store' }),
          fetch(`/api/institutional/${symbol}`, { cache: 'no-store' }),
        ]);
        const pJson = await pRes.json();
        const iJson = await iRes.json();
        if (cancelled) return;
        if (!pRes.ok) throw new Error(pJson.error || pRes.statusText);
        setRawBars(pJson.prices || []);
        setSource(pJson.dataSource || '');
        setLastDate(pJson.lastDate || pJson.prices?.at?.(-1)?.date || null);
        setInst(iJson.items || []);
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

  useEffect(() => {
    if (!wrapRef.current || !bars.length) return;
    const el = wrapRef.current;
    const chart = createChart(el, {
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e2e8f0' },
      timeScale: { borderColor: '#e2e8f0', timeVisible: false },
    });
    chartRef.current = chart;

    const candle = chart.addCandlestickSeries({
      upColor: '#ef4444',
      downColor: '#10b981',
      borderUpColor: '#ef4444',
      borderDownColor: '#10b981',
      wickUpColor: '#ef4444',
      wickDownColor: '#10b981',
    });

    const candleData = bars
      .filter((b) => b.date && b.close != null)
      .map((b) => ({
        time: b.date as string,
        open: Number(b.open ?? b.close),
        high: Number(b.high ?? b.close),
        low: Number(b.low ?? b.close),
        close: Number(b.close),
      }));
    candle.setData(candleData as never);

    const closes = candleData.map((c) => c.close);
    const seriesMap: Partial<Record<MaKey, ISeriesApi<'Line'>>> = {};
    (Object.keys(MA_META) as MaKey[]).forEach((key) => {
      const meta = MA_META[key];
      const series = chart.addLineSeries({
        color: meta.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: maOn[key],
      });
      const vals = sma(closes, meta.period);
      series.setData(
        candleData
          .map((c, i) => (vals[i] != null ? { time: c.time, value: vals[i]! } : null))
          .filter(Boolean) as never
      );
      seriesMap[key] = series;
    });
    maSeriesRef.current = seriesMap;

    const bb = bollinger(closes, 20, 2);
    const u = chart.addLineSeries({
      color: 'rgba(148,163,184,0.9)',
      lineWidth: 1,
      lineStyle: 2,
      visible: bbOn,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const m = chart.addLineSeries({
      color: 'rgba(100,116,139,0.8)',
      lineWidth: 1,
      visible: bbOn,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const l = chart.addLineSeries({
      color: 'rgba(148,163,184,0.9)',
      lineWidth: 1,
      lineStyle: 2,
      visible: bbOn,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    u.setData(
      candleData
        .map((c, i) => (bb.upper[i] != null ? { time: c.time, value: bb.upper[i]! } : null))
        .filter(Boolean) as never
    );
    m.setData(
      candleData
        .map((c, i) => (bb.mid[i] != null ? { time: c.time, value: bb.mid[i]! } : null))
        .filter(Boolean) as never
    );
    l.setData(
      candleData
        .map((c, i) => (bb.lower[i] != null ? { time: c.time, value: bb.lower[i]! } : null))
        .filter(Boolean) as never
    );
    bbRef.current = { u, m, l };

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    vol.setData(
      bars
        .filter((b) => b.date)
        .map((b) => {
          const up = Number(b.close) >= Number(b.open ?? b.close);
          return {
            time: b.date as string,
            value: Number(b.volume ?? 0),
            color: up ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)',
          };
        }) as never
    );

    chart.timeScale().fitContent();
    const ro = new ResizeObserver(() => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      maSeriesRef.current = {};
      bbRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, tf]);

  useEffect(() => {
    (Object.keys(MA_META) as MaKey[]).forEach((key) => {
      maSeriesRef.current[key]?.applyOptions({ visible: maOn[key] });
    });
  }, [maOn]);

  useEffect(() => {
    bbRef.current.u?.applyOptions({ visible: bbOn });
    bbRef.current.m?.applyOptions({ visible: bbOn });
    bbRef.current.l?.applyOptions({ visible: bbOn });
  }, [bbOn]);

  const lastClose = bars.length ? Number(bars[bars.length - 1].close) : null;
  const closes = bars.map((b) => Number(b.close || 0));
  const deductRows = useMemo(() => {
    if (lastClose == null) return [];
    return (Object.keys(MA_META) as MaKey[]).map((key) => {
      const vals = sma(closes, MA_META[key].period);
      const ma = vals[vals.length - 1];
      return {
        key,
        label: MA_META[key].label,
        color: MA_META[key].color,
        ma,
        deduct: ma != null ? lastClose - ma : null,
        pct: ma != null && ma ? ((lastClose - ma) / ma) * 100 : null,
      };
    });
  }, [closes, lastClose]);

  const riverOption = useMemo(() => {
    const cats = inst.map((d) => d.date.slice(5));
    const f = inst.map((d) => Math.round(d.foreign / 1000));
    const t = inst.map((d) => Math.round(d.trust / 1000));
    const dlr = inst.map((d) => Math.round(d.dealer / 1000));
    return {
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['外資', '投信', '自營'],
        top: 0,
        textStyle: { fontSize: 11, color: '#64748b' },
      },
      grid: { left: 48, right: 16, top: 32, bottom: 28 },
      xAxis: {
        type: 'category',
        data: cats,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '千股',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: '外資',
          type: 'line',
          stack: 'inst',
          areaStyle: { opacity: 0.55 },
          emphasis: { focus: 'series' },
          data: f,
          color: '#3b82f6',
          smooth: true,
          showSymbol: false,
        },
        {
          name: '投信',
          type: 'line',
          stack: 'inst',
          areaStyle: { opacity: 0.55 },
          emphasis: { focus: 'series' },
          data: t,
          color: '#f59e0b',
          smooth: true,
          showSymbol: false,
        },
        {
          name: '自營',
          type: 'line',
          stack: 'inst',
          areaStyle: { opacity: 0.55 },
          emphasis: { focus: 'series' },
          data: dlr,
          color: '#10b981',
          smooth: true,
          showSymbol: false,
        },
      ],
    };
  }, [inst]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">載入 K 線…</div>
    );
  }
  if (err) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;
  }
  if (!bars.length) {
    return <div className="text-sm text-slate-400">尚無價格資料</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {name || symbol} · {bars.length} 根
          {tf === 'day' ? '日' : tf === 'week' ? '週' : '月'}K
          {lastDate ? ` · 至 ${lastDate}` : ''}
        </span>
        <span>source: {source}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
          {(
            [
              ['day', '日線'],
              ['week', '週線'],
              ['month', '月線'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`rounded-md px-2.5 py-1 text-[11px] ${
                tf === k ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setTf(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
        <span className="font-medium text-slate-600">指標</span>
        {(Object.keys(MA_META) as MaKey[]).map((key) => (
          <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={maOn[key]}
              onChange={() => setMaOn((p) => ({ ...p, [key]: !p[key] }))}
            />
            <span style={{ color: MA_META[key].color }} className="font-medium">
              {MA_META[key].label}
            </span>
          </label>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={bbOn}
            onChange={() => setBbOn((v) => !v)}
          />
          <span className="font-medium text-slate-600">布林 BB</span>
        </label>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={deductOn}
            onChange={() => setDeductOn((v) => !v)}
          />
          <span className="font-medium text-slate-600">均線扣抵</span>
        </label>
      </div>

      <div ref={wrapRef} className="w-full" />

      {deductOn && lastClose != null && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">均線</th>
                <th className="px-3 py-2">數值</th>
                <th className="px-3 py-2">扣抵（現價−MA）</th>
                <th className="px-3 py-2">偏離%</th>
              </tr>
            </thead>
            <tbody>
              {deductRows.map((r) => (
                <tr key={r.key} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium" style={{ color: r.color }}>
                    {r.label}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.ma != null ? r.ma.toFixed(2) : '—'}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums font-medium ${
                      (r.deduct ?? 0) >= 0 ? 'text-up' : 'text-down'
                    }`}
                  >
                    {r.deduct != null
                      ? `${r.deduct >= 0 ? '+' : ''}${r.deduct.toFixed(2)}`
                      : '—'}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums ${
                      (r.pct ?? 0) >= 0 ? 'text-up' : 'text-down'
                    }`}
                  >
                    {r.pct != null ? `${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            現價 {lastClose.toFixed(2)}（{tf === 'day' ? '日' : tf === 'week' ? '週' : '月'}線收）
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          三大法人 · 價值河流圖（淨買超，千股）
        </h3>
        {inst.length === 0 ? (
          <p className="text-sm text-slate-400">暫無法人資料</p>
        ) : (
          <ReactECharts option={riverOption} style={{ height: 220, width: '100%' }} />
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          堆疊面積＝外資 + 投信 + 自營淨買超（FinMind）。正值偏多、負值偏空。
        </p>
      </div>
    </div>
  );
}

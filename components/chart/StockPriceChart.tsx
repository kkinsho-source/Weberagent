'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';

type Bar = {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number | null;
  volume?: number | null;
};

type MaKey = 'ma5' | 'ma10' | 'ma20' | 'ma60';

const MA_META: Record<MaKey, { period: number; color: string; label: string; defaultOn: boolean }> = {
  ma5: { period: 5, color: '#f59e0b', label: '5MA', defaultOn: true },
  ma10: { period: 10, color: '#a855f7', label: '10MA', defaultOn: false },
  ma20: { period: 20, color: '#3b82f6', label: '20MA', defaultOn: true },
  ma60: { period: 60, color: '#14b8a6', label: '60MA', defaultOn: false },
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

/** 自有 K 線：5/10/20/60 MA 可勾選 + 成交量 */
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
  const [bars, setBars] = useState<Bar[]>([]);
  const [source, setSource] = useState('');
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [maOn, setMaOn] = useState<Record<MaKey, boolean>>({
    ma5: true,
    ma10: false,
    ma20: true,
    ma60: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/prices/${symbol}?limit=240&refresh=1`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || res.statusText);
        setBars(json.prices || []);
        setSource(json.dataSource || '');
        setLastDate(json.lastDate || json.prices?.at?.(-1)?.date || null);
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

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- maOn toggled via separate effect
  }, [bars]);

  useEffect(() => {
    (Object.keys(MA_META) as MaKey[]).forEach((key) => {
      maSeriesRef.current[key]?.applyOptions({ visible: maOn[key] });
    });
  }, [maOn]);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {name || symbol} · {bars.length} 根日 K
          {lastDate ? ` · 至 ${lastDate}` : ''}
        </span>
        <span>source: {source}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
        <span className="font-medium text-slate-600">均線</span>
        {(Object.keys(MA_META) as MaKey[]).map((key) => {
          const m = MA_META[key];
          return (
            <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={maOn[key]}
                onChange={() => setMaOn((prev) => ({ ...prev, [key]: !prev[key] }))}
              />
              <span style={{ color: m.color }} className="font-medium">
                {m.label}
              </span>
            </label>
          );
        })}
        <span className="ml-auto text-[11px] text-slate-400">紅漲綠跌 · 拖曳縮放</span>
      </div>

      <div ref={wrapRef} className="w-full" />
    </div>
  );
}

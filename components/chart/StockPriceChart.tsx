'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  type IChartApi,
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

/**
 * Lightweight Charts K 線（紅漲綠跌）+ MA5/MA20 + 成交量
 * 資料：/api/prices?limit=240&refresh=1
 */
export function StockPriceChart({
  symbol,
  name,
}: {
  symbol: string;
  name?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [bars, setBars] = useState<Bar[]>([]);
  const [source, setSource] = useState('');
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'native' | 'tv'>('native');

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
    if (mode !== 'native' || !wrapRef.current || !bars.length) return;

    const el = wrapRef.current;
    const chart = createChart(el, {
      height: 360,
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
    const ma5 = sma(closes, 5);
    const ma20 = sma(closes, 20);

    const line5 = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    line5.setData(
      candleData
        .map((c, i) => (ma5[i] != null ? { time: c.time, value: ma5[i]! } : null))
        .filter(Boolean) as never
    );

    const line20 = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    line20.setData(
      candleData
        .map((c, i) => (ma20[i] != null ? { time: c.time, value: ma20[i]! } : null))
        .filter(Boolean) as never
    );

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
    };
  }, [bars, mode]);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        載入 K 線…
      </div>
    );
  }
  if (err) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;
  }
  if (!bars.length && mode === 'native') {
    return <div className="text-sm text-slate-400">尚無價格資料</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          {name || symbol} · {mode === 'native' ? `${bars.length} 根日 K` : 'TradingView'}
          {lastDate ? ` · 至 ${lastDate}` : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">source: {source || 'tv'}</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-[11px] ${mode === 'native' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              onClick={() => setMode('native')}
            >
              自有資料
            </button>
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-[11px] ${mode === 'tv' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              onClick={() => setMode('tv')}
            >
              TradingView
            </button>
          </div>
        </div>
      </div>

      {mode === 'native' ? (
        <>
          <div className="mb-1 flex gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-0.5 w-3 bg-amber-500" /> MA5
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-0.5 w-3 bg-blue-500" /> MA20
            </span>
            <span>紅漲綠跌</span>
          </div>
          <div ref={wrapRef} className="w-full" />
        </>
      ) : (
        <TradingViewAdvanced symbol={symbol} />
      )}
    </div>
  );
}

function TradingViewAdvanced({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-expect-error TradingView global
      if (typeof TradingView === 'undefined' || !ref.current) return;
      // @ts-expect-error TradingView widget
      new TradingView.widget({
        width: '100%',
        height: 420,
        symbol: `TWSE:${symbol}`,
        interval: 'D',
        timezone: 'Asia/Taipei',
        theme: 'light',
        style: '1',
        locale: 'zh_TW',
        toolbar_bg: '#f8fafc',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: ref.current.id,
      });
    };
    const id = `tv_${symbol}_${Math.random().toString(36).slice(2, 8)}`;
    ref.current.id = id;
    document.body.appendChild(script);
    return () => {
      script.remove();
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [symbol]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div ref={ref} className="min-h-[420px] w-full" />
      <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
        TradingView 小工具（技術分析完整）。日線主資料仍以本站 TWSE/TPEx 為準。
      </p>
    </div>
  );
}

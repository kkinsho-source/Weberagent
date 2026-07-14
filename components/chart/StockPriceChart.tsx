'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

type Bar = {
  date: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number | null;
  volume?: number | null;
};

/**
 * 個股 K 線（紅漲綠跌，台股習慣）
 * 資料：GET /api/prices/[symbol]?refresh=1
 */
export function StockPriceChart({
  symbol,
  name,
}: {
  symbol: string;
  name?: string;
}) {
  const [bars, setBars] = useState<Bar[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // refresh=1：若 DB 少於 10 筆會抓歷史並嘗試回寫
        const res = await fetch(`/api/prices/${symbol}?limit=120&refresh=1`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || res.statusText);
        setBars(json.prices || []);
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
    const cats = bars.map((b) => b.date);
    const ohlc = bars.map((b) => [
      Number(b.open ?? b.close ?? 0),
      Number(b.close ?? 0),
      Number(b.low ?? b.close ?? 0),
      Number(b.high ?? b.close ?? 0),
    ]);
    const vols = bars.map((b) => Number(b.volume ?? 0));
    const hasVol = vols.some((v) => v > 0);

    return {
      animation: false,
      backgroundColor: 'transparent',
      legend: { data: ['K線', ...(hasVol ? ['成交量'] : [])], top: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: hasVol
        ? [
            { left: 48, right: 16, top: 36, height: '55%' },
            { left: 48, right: 16, top: '72%', height: '16%' },
          ]
        : [{ left: 48, right: 16, top: 36, bottom: 28 }],
      xAxis: hasVol
        ? [
            { type: 'category', data: cats, boundaryGap: true, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
            { type: 'category', gridIndex: 1, data: cats, boundaryGap: true, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#cbd5e1' } } },
          ]
        : [
            { type: 'category', data: cats, boundaryGap: true, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
          ],
      yAxis: hasVol
        ? [
            { scale: true, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
            { scale: true, gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } },
          ]
        : [
            { scale: true, splitLine: { lineStyle: { color: '#f1f5f9' } }, axisLabel: { color: '#94a3b8', fontSize: 10 } },
          ],
      dataZoom: [
        { type: 'inside', xAxisIndex: hasVol ? [0, 1] : [0], start: 40, end: 100 },
        { type: 'slider', xAxisIndex: hasVol ? [0, 1] : [0], start: 40, end: 100, height: 18, bottom: 4 },
      ],
      series: [
        {
          name: 'K線',
          type: 'candlestick',
          data: ohlc,
          itemStyle: {
            color: '#ef4444', // 漲=紅
            color0: '#10b981', // 跌=綠
            borderColor: '#ef4444',
            borderColor0: '#10b981',
          },
        },
        ...(hasVol
          ? [
              {
                name: '成交量',
                type: 'bar',
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: vols,
                itemStyle: { color: '#94a3b8' },
              },
            ]
          : []),
      ],
    };
  }, [bars]);

  if (loading) {
    return <div className="flex h-72 items-center justify-center text-sm text-slate-400">載入 K 線…</div>;
  }
  if (err) {
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;
  }
  if (!bars.length) {
    return <div className="text-sm text-slate-400">尚無價格資料</div>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {name || symbol} · {bars.length} 根日 K
        </span>
        <span>source: {source}</span>
      </div>
      <ReactECharts option={option} style={{ height: 320, width: '100%' }} opts={{ renderer: 'canvas' }} />
      <p className="mt-1 text-[11px] text-slate-400">紅漲綠跌 · 可拖曳 / 滾輪縮放</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type StockRow = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  industry?: string;
};

/**
 * 示範：透過 /api/stocks 讀取（Supabase 優先，snapshot 備援）
 */
export function SupabaseStocksPanel() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [dataSource, setDataSource] = useState('loading');
  const [health, setHealth] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, hRes] = await Promise.all([
          fetch('/api/stocks'),
          fetch('/api/v1/health/supabase'),
        ]);
        const s = await sRes.json();
        const h = await hRes.json();
        if (cancelled) return;
        setDataSource(s.dataSource ?? 'unknown');
        setStocks((s.stocks as StockRow[] | undefined)?.slice(0, 8) ?? []);
        setHealth(
          h.ok
            ? `Supabase 連線 OK · stocks≈${h.stocksCount ?? '?'}`
            : h.configured
              ? `已設定但查詢失敗：${h.error || h.message}`
              : '尚未設定 Supabase（目前走 snapshot 備援）'
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Supabase 個股資料</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            dataSource === 'supabase'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-sky-50 text-sky-700'
          }`}
        >
          /api/stocks · {dataSource}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">{health}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stocks.map((s) => {
          const up = s.changePct >= 0;
          return (
            <Link
              key={s.symbol}
              href={`/stock/${s.symbol}`}
              className="rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-300 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-800">
                {s.name}{' '}
                <span className="text-slate-400">{s.symbol}</span>
              </div>
              <div className={`font-bold ${up ? 'text-up' : 'text-down'}`}>
                {Number(s.price).toLocaleString()}
                <span className="ml-1 text-xs">
                  {up ? '+' : ''}
                  {Number(s.changePct).toFixed(2)}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        接入：1) 執行 supabase/core_tables.sql 2) 填 .env.local 3) POST
        /api/admin/migrate-snapshot 或 npm run etl:push
      </p>
    </section>
  );
}

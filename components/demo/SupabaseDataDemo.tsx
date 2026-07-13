'use client';

/**
 * 示範：前端透過 BFF 讀取資料來源（snapshot 或 supabase）
 * 不直接暴露 service role；只用公開 API。
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

type StockRow = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
};

export function SupabaseDataDemo() {
  const [dataSource, setDataSource] = useState<string>('loading');
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [meta, setMeta] = useState<{ asOf?: string; source?: string; count?: number } | null>(
    null
  );
  const [health, setHealth] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [stocksRes, healthRes] = await Promise.all([
          fetch('/api/v1/stocks'),
          fetch('/api/v1/health/supabase'),
        ]);
        const s = await stocksRes.json();
        const h = await healthRes.json();
        if (cancelled) return;
        setDataSource(s.dataSource ?? 'unknown');
        setMeta(s.meta ?? null);
        setStocks((s.stocks as StockRow[]).slice(0, 6));
        setHealth(
          h.ok
            ? `Supabase OK · stocks=${h.stocksCount ?? '?'}`
            : h.configured
              ? `Supabase 已設定但查詢失敗：${h.error || h.message}`
              : 'Supabase 尚未設定（目前走本地 snapshot）'
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
        <h2 className="text-lg font-semibold text-slate-800">資料來源示範（BFF → Supabase/Snapshot）</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            dataSource === 'supabase'
              ? 'bg-emerald-50 text-emerald-700'
              : dataSource === 'snapshot'
                ? 'bg-sky-50 text-sky-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          dataSource: {dataSource}
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-500">{health}</p>
      {meta && (
        <p className="mb-3 text-xs text-slate-400">
          meta: asOf={meta.asOf ?? '—'} · source={meta.source ?? '—'} · count={meta.count ?? '—'}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stocks.map((s) => {
          const up = s.changePct >= 0;
          return (
            <Link
              key={s.symbol}
              href={`/stock/${s.symbol}`}
              className="rounded-lg border border-slate-100 px-3 py-2 text-sm transition hover:border-brand-300 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-800">
                {s.name} <span className="text-slate-400">{s.symbol}</span>
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
        接入步驟：1) 執行 supabase/schema.sql 2) 填 .env.local 3) python3 scripts/etl/push_to_supabase.py
      </p>
    </section>
  );
}

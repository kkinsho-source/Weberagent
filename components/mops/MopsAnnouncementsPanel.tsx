'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Item = {
  symbol: string;
  companyName: string;
  speakDate: string;
  speakTime: string;
  title: string;
  content: string;
  clause: string;
  source: string;
};

export function MopsAnnouncementsPanel({
  initialSymbol = '',
  compact = false,
}: {
  initialSymbol?: string;
  compact?: boolean;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [dataSource, setDataSource] = useState('…');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const params = new URLSearchParams();
        if (symbol.trim()) params.set('symbol', symbol.trim());
        if (q.trim()) params.set('q', q.trim());
        params.set('limit', compact ? '8' : '40');
        const res = await fetch(`/api/v1/mops?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        setItems(json.items ?? []);
        setDataSource(json.dataSource ?? 'unknown');
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol, q, compact]);

  return (
    <section className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">公司代號</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="2330"
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs text-slate-400">關鍵字</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="子公司 / 取得 / 處分…"
              className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
            source: {dataSource}
          </span>
        </div>
      )}

      {compact && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>重大訊息</span>
          <span>source: {dataSource}</span>
        </div>
      )}

      {loading && <p className="text-sm text-slate-400">載入中…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {symbol.trim()
            ? `目前資料庫尚無 ${symbol.trim()} 的官方公告（可能尚未被 ETL 收錄）。下方「相關新聞」仍可能有外鏈。`
            : '尚無公告資料。'}
        </div>
      )}

      <ul className="space-y-2">
        {items.map((it, idx) => {
          const key = `${it.symbol}-${it.speakDate}-${it.speakTime}-${idx}`;
          const open = openId === key;
          return (
            <li
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <Link href={`/stock/${it.symbol}`} className="font-medium text-brand-600 hover:underline">
                      {it.symbol} {it.companyName}
                    </Link>
                    <span>
                      {it.speakDate} {it.speakTime}
                    </span>
                    {it.clause ? <span className="rounded bg-slate-100 px-1.5 py-0.5">{it.clause}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-slate-800 hover:text-brand-700"
                    onClick={() => setOpenId(open ? null : key)}
                  >
                    {it.title}
                  </button>
                  {open && it.content && (
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                      {it.content}
                    </p>
                  )}
                  {open && !it.content && (
                    <p className="mt-2 text-xs text-slate-400">
                      此筆僅有主旨（公司年度列表來源）。日更 OpenAPI 來源含完整說明。
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {compact && (
        <div className="text-right">
          <Link href="/announcements" className="text-xs text-brand-600 hover:underline">
            查看全部重大訊息 →
          </Link>
        </div>
      )}
    </section>
  );
}

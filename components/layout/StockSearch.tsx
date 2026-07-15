'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Row = {
  symbol: string;
  name: string;
  price?: number;
  changePct?: number;
  themeSlug?: string;
};

export function StockSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/stocks');
        const json = await res.json();
        if (!cancelled) setRows(json.stocks || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return rows
      .filter(
        (r) =>
          r.symbol.toLowerCase().includes(s) ||
          (r.name || '').toLowerCase().includes(s)
      )
      .slice(0, 8);
  }, [q, rows]);

  const go = (symbol: string) => {
    setOpen(false);
    setQ('');
    onNavigate?.();
    router.push(`/stock/${symbol}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={loading ? '載入股池…' : '搜尋代號 / 名稱'}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
      />
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {hits.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">無符合結果</div>
          ) : (
            hits.map((r) => (
              <button
                key={r.symbol}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => go(r.symbol)}
              >
                <span>
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{r.symbol}</span>
                </span>
                <span className="text-xs tabular-nums text-slate-500">
                  {r.price != null ? Number(r.price).toLocaleString() : '—'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

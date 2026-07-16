'use client';

import { useEffect, useState } from 'react';

type Etf = { etf: string; name: string; note?: string };

export function EtfPanel({ symbol }: { symbol: string }) {
  const [etfs, setEtfs] = useState<Etf[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock-profile/${symbol}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || res.statusText);
        setEtfs(json.etfs || []);
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

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">載入 ETF…</div>;
  if (err) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        下列為常見台股 ETF 對照（編輯型導覽，非投信即時申報權重）。
      </p>
      {etfs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          此檔尚未收錄 ETF 對照。後續可接公開成分股檔自動反查。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">ETF 代號</th>
                <th className="px-3 py-2">名稱</th>
                <th className="px-3 py-2">備註</th>
              </tr>
            </thead>
            <tbody>
              {etfs.map((e) => (
                <tr key={e.etf} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-brand-600">{e.etf}</td>
                  <td className="px-3 py-2 text-slate-800">{e.name}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        涵蓋：0050 / 006208 / 0052 / 00878 / 00881 / 00919 / 00891 等常見標的（依個股收錄）。
      </p>
    </div>
  );
}

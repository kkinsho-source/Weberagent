'use client';

import { useEffect, useState } from 'react';

type Etf = {
  etf: string;
  name: string;
  note?: string;
  weightPct?: number | null;
  changeNote?: string | null;
  asOf?: string;
  source?: string;
};

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
        <strong className="font-medium text-slate-700">公開持股反查</strong>
        ：由 ETF 成分檔（投信/指數公開資訊整理）反查持有本檔的 ETF 與比重。
        主動型多數尚無穩定公開權重 → 顯示「—」。
      </p>
      {etfs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
          此檔尚未收錄 ETF 對照。
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2">ETF</th>
                <th className="px-3 py-2">名稱</th>
                <th className="px-3 py-2">持倉比重</th>
                <th className="px-3 py-2">資料日</th>
                <th className="px-3 py-2">備註</th>
              </tr>
            </thead>
            <tbody>
              {etfs.map((e, i) => (
                <tr
                  key={e.etf}
                  className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/60' : ''}`}
                >
                  <td className="px-3 py-2 font-semibold text-brand-600">{e.etf}</td>
                  <td className="px-3 py-2 text-slate-800">{e.name}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">
                    {e.weightPct != null ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium">{e.weightPct.toFixed(2)}%</span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-brand-500/70"
                            style={{ width: `${Math.min(100, e.weightPct * 2)}%` }}
                          />
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">{e.asOf || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{e.note || e.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        非投信即時申報。後續可把 CSV 灌入同一 ETF_FUNDS 格式自動更新比重。
      </p>
    </div>
  );
}

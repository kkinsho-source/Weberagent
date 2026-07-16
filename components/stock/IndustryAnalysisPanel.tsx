'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Stock } from '@/lib/types';

type Theme = {
  slug: string;
  title: string;
  description: string;
  companyCount?: number;
};

type Peer = Stock;

export function IndustryAnalysisPanel({
  symbol,
  onGoSupply,
}: {
  symbol: string;
  onGoSupply?: () => void;
}) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
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
        setTheme(json.theme);
        setStock(json.stock);
        setPeers(json.peers || []);
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

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">載入產業分析…</div>;
  if (err) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;

  const rows = stock ? [stock, ...peers] : peers;

  return (
    <div className="space-y-5">
      {theme ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <div className="text-xs text-brand-600">所屬題材</div>
          <div className="mt-1 text-lg font-bold text-slate-800">{theme.title}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{theme.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link
              href={`/themes/${theme.slug}`}
              className="rounded-md bg-white px-2 py-1 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              題材頁
            </Link>
            {onGoSupply ? (
              <button
                type="button"
                onClick={onGoSupply}
                className="rounded-md bg-brand-600 px-2 py-1 text-white"
              >
                看供應鏈位置
              </button>
            ) : (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500">
                可切到「供應鏈」分頁
              </span>
            )}
            <a
              href={`https://ic.tpex.org.tw/index.php`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              title="櫃買/證交所官方產業價值鏈（外連，不爬取）"
            >
              官方產業價值鏈 ↗
            </a>
            <a
              href={`https://ic.tpex.org.tw/introduce.php?ic=D000`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              半導體鏈簡介 ↗
            </a>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            官方平台為產業上中下游分類參考，非本站業務供應鏈；資料以該站為準。
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">此檔尚未對應題材 slug。</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          同業比較（同題材 · {rows.length} 檔）
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">尚無同業資料</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">代號</th>
                  <th className="px-3 py-2">名稱</th>
                  <th className="px-3 py-2">股價</th>
                  <th className="px-3 py-2">漲跌%</th>
                  <th className="px-3 py-2">市值(億)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const up = s.changePct >= 0;
                  const isSelf = s.symbol === symbol;
                  return (
                    <tr
                      key={s.symbol}
                      className={`border-t border-slate-100 ${isSelf ? 'bg-brand-50/50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        {isSelf ? (
                          <span className="font-semibold text-brand-700">{s.symbol}</span>
                        ) : (
                          <Link
                            href={`/stock/${s.symbol}`}
                            className="font-medium text-brand-600 hover:underline"
                          >
                            {s.symbol}
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-800">
                        {s.name}
                        {isSelf && (
                          <span className="ml-1 text-[10px] text-brand-600">本檔</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {Number(s.price || 0).toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums font-medium ${up ? 'text-up' : 'text-down'}`}
                      >
                        {up ? '+' : ''}
                        {Number(s.changePct || 0).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-600">
                        {Number(s.marketCap || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        產業分析 MVP：題材定位 + 同業價量比較。後續可加毛利率/營收年增對照。
      </p>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Stock } from '@/lib/types';

type SortKey = 'symbol' | 'name' | 'price' | 'changePct' | 'marketCap';

export function ThemeStockTable({ stocks }: { stocks: Stock[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [asc, setAsc] = useState(false);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = stocks;
    if (s) {
      list = list.filter(
        (x) =>
          x.symbol.toLowerCase().includes(s) ||
          x.name.toLowerCase().includes(s) ||
          x.industry.toLowerCase().includes(s)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return asc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return sorted;
  }, [stocks, sortKey, asc, q]);

  const head = (key: SortKey, label: string) => (
    <th className="cursor-pointer select-none py-2 pr-3 font-medium" onClick={() => {
      if (sortKey === key) setAsc(!asc);
      else {
        setSortKey(key);
        setAsc(key === 'name' || key === 'symbol');
      }
    }}>
      {label}
      {sortKey === key ? (asc ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">相關公司</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="篩選代號/名稱"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-400"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr>
              {head('symbol', '代號')}
              {head('name', '名稱')}
              {head('price', '股價')}
              {head('changePct', '漲跌%')}
              {head('marketCap', '市值(億)')}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const up = s.changePct >= 0;
              return (
                <tr key={s.symbol} className="border-t border-slate-50 hover:bg-slate-50/80">
                  <td className="py-2 pr-3">
                    <Link href={`/stock/${s.symbol}`} className="font-medium text-brand-600 hover:underline">
                      {s.symbol}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-slate-800">{s.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{Number(s.price || 0).toLocaleString()}</td>
                  <td className={`py-2 pr-3 tabular-nums font-medium ${up ? 'text-up' : 'text-down'}`}>
                    {up ? '+' : ''}
                    {Number(s.changePct || 0).toFixed(2)}%
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-slate-600">
                    {Number(s.marketCap || 0).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  無符合公司
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

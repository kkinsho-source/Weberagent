'use client';

import { useMarketStore } from '@/lib/store/market';

const MARKETS = [
  { key: 'tw', label: '台股' },
  { key: 'us', label: '美股' },
  { key: 'jp', label: '日股' },
] as const;

export function MarketTabs() {
  const { market, setMarket } = useMarketStore();
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {MARKETS.map((m) => (
        <button
          key={m.key}
          onClick={() => setMarket(m.key)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            market === m.key
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

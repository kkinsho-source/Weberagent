import Link from 'next/link';
import type { Stock } from '@/lib/types';

export function StockCard({ stock }: { stock: Stock }) {
  const up = stock.changePct >= 0;
  return (
    <Link
      href={`/stock/${stock.symbol}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">{stock.name}</div>
          <div className="text-xs text-slate-400">{stock.symbol}</div>
        </div>
        <div className={`text-right text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
          {stock.price.toLocaleString()}
          <div className="text-xs">
            {up ? '+' : ''}
            {stock.changePct.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{stock.industry}</span>
        <span>市值 {stock.marketCap.toLocaleString()} 億</span>
      </div>
    </Link>
  );
}

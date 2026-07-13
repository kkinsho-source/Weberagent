import { notFound } from 'next/navigation';
import { stocks } from '@/lib/data/mock';
import { MapPlaceholder } from '@/components/ui/MapPlaceholder';

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const stock = stocks.find((s) => s.symbol === symbol);
  if (!stock) notFound();

  const up = stock.changePct >= 0;

  const tabs = ['概覽', '供應鏈', '財務分析', 'AI 分析'];
  const active = '供應鏈';

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-400">{stock.symbol}</div>
          <h1 className="text-2xl font-bold text-slate-800">{stock.name}</h1>
          <div className="text-sm text-slate-500">{stock.industry}</div>
        </div>
        <div className={`text-right text-2xl font-bold ${up ? 'text-up' : 'text-down'}`}>
          {stock.price.toLocaleString()}
          <span className="ml-2 text-base">
            {up ? '+' : ''}
            {stock.changePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <div
            key={t}
            className={`px-4 py-2 text-sm font-medium ${
              t === active
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-400'
            }`}
          >
            {t}
          </div>
        ))}
      </div>

      <MapPlaceholder title={`${stock.name} 上下游供應鏈（示意）`} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <div className="font-semibold text-slate-800">公司資訊（示意）</div>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-slate-400">市值</dt>
            <dd>{stock.marketCap.toLocaleString()} 億</dd>
          </div>
          <div>
            <dt className="text-slate-400">產業</dt>
            <dd>{stock.industry}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

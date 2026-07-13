import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTheme, getStocksByTheme } from '@/lib/data/mock';
import { subgraphFor } from '@/lib/data/graph';
import { StockCard } from '@/components/ui/StockCard';
import { MapView } from '@/components/map/MapView';

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = getTheme(slug);
  if (!theme) notFound();

  const stocks = getStocksByTheme(theme.slug);
  const subgraph = subgraphFor(stocks.map((s) => s.symbol));

  return (
    <div className="space-y-6">
      <Link href="/themes" className="text-sm text-brand-600 hover:underline">
        ← 返回題材列表
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{theme.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {theme.description}
        </p>
        <div className="mt-2 text-xs text-slate-400">
          共 {theme.companyCount} 家 · 核實於 {theme.verifiedAt}
        </div>
      </div>

      <MapView nodes={subgraph.nodes} edges={subgraph.edges} title={theme.title} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">相關公司</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((s) => (
            <StockCard key={s.symbol} stock={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

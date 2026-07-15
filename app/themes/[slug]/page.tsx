import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDataBundle } from '@/lib/data/source';
import { subgraphFor } from '@/lib/data/graph';
import { MapView } from '@/components/map/MapView';
import { ThemeStockTable } from '@/components/theme/ThemeStockTable';

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = await getDataBundle();
  const theme = bundle.themes.find((t) => t.slug === slug);
  if (!theme) notFound();

  const stocks = bundle.stocks.filter((s) => s.themeSlug === theme.slug);
  const subgraph = subgraphFor(
    stocks.map((s) => s.symbol),
    true,
    bundle.stocks,
    bundle.supplyEdges
  );

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
          列表 {stocks.length} 家 · 核實於 {theme.verifiedAt} · 資料源 {bundle.dataSource}
        </div>
      </div>

      <MapView nodes={subgraph.nodes} edges={subgraph.edges} title={theme.title} />

      <ThemeStockTable stocks={stocks} />
    </div>
  );
}

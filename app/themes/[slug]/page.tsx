import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDataBundle } from '@/lib/data/source';
import { subgraphFor } from '@/lib/data/graph';
import { MapView } from '@/components/map/MapView';
import { ThemeStockTable } from '@/components/theme/ThemeStockTable';
import { buildThemeFlow } from '@/lib/data/theme-flow';
import { buildThemeRs } from '@/lib/data/theme-rs';
import { buildCompositeRows, ZONE_META } from '@/lib/data/theme-composite';
import { ThemeRadarContext } from '@/components/theme/ThemeRadarContext';

export default async function ThemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const fromRadar = sp.from === 'radar';

  const bundle = await getDataBundle();
  const theme = bundle.themes.find((t) => t.slug === slug);
  if (!theme) notFound();

  const stocks = bundle.stocks.filter((s) => s.themeSlug === theme.slug);
  const subgraph = subgraphFor(
    stocks.map((s) => s.symbol),
    true,
    bundle.stocks,
    bundle.supplyEdges,
  );

  // B/D：題材在資金雷達的位置（全市場 scope 對齊雷達預設）
  const flowOpts = {
    themes: bundle.themes,
    stocks: bundle.stocks,
    scope: 'all' as const,
  };
  const [{ rows: flowRows }, rsBundle] = await Promise.all([
    buildThemeFlow(flowOpts),
    buildThemeRs(flowOpts),
  ]);
  const composite = buildCompositeRows(flowRows, rsBundle.rows, 'balanced');
  const mine = composite.find((r) => r.slug === slug) || null;
  const rank =
    mine != null
      ? composite.findIndex((r) => r.slug === slug) + 1
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/themes" className="text-brand-600 hover:underline">
          ← 題材列表
        </Link>
        <Link href="/radar" className="text-slate-500 hover:text-brand-600 hover:underline">
          資金雷達
        </Link>
      </div>

      {fromRadar ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm text-slate-700">
          你從<strong className="font-semibold">資金雷達</strong>點進來。下面是這個題材的說明、供應鏈與成分股。
          <Link href="/radar" className="ml-2 font-medium text-brand-700 hover:underline">
            返回雷達 →
          </Link>
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{theme.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          {theme.description}
        </p>
        <div className="mt-2 text-xs text-slate-400">
          成分 {stocks.length} 家
          {theme.verifiedAt ? ` · 更新 ${theme.verifiedAt}` : ''}
        </div>
      </div>

      {mine ? (
        <ThemeRadarContext
          title={theme.title}
          zone={mine.zone}
          zoneLabel={ZONE_META[mine.zone].label}
          zoneBlurb={ZONE_META[mine.zone].blurb}
          scoreS={mine.scoreS}
          flowScore={mine.flowScore}
          priceScore={mine.priceScore}
          net5dYi={mine.net5dYi}
          resonance={mine.resonance}
          rank={rank}
          total={composite.length}
          asOf={rsBundle.meta.asOf || flowRows[0]?.asOf || null}
        />
      ) : null}

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-800">供應鏈關係</h2>
        <p className="mb-2 text-xs text-slate-400">點節點可進個股頁</p>
        <MapView nodes={subgraph.nodes} edges={subgraph.edges} title={theme.title} />
      </div>

      <div>
        <h2 className="mb-2 text-base font-semibold text-slate-800">成分股</h2>
        <ThemeStockTable stocks={stocks} />
      </div>
    </div>
  );
}

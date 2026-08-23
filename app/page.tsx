import Link from 'next/link';
import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { filterThemesByScope, parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
import { SITE_NAME } from '@/lib/site';
import { loadThemeComposite } from '@/lib/data/theme-radar-signals';

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const scope: ThemeScope = parseThemeScope(sp.scope, 'ai');
  const bundle = await getDataBundle();
  const themes = filterThemesByScope(bundle.themes, scope);
  const { bySlug } = await loadThemeComposite({
    themes: bundle.themes,
    stocks: bundle.stocks,
    scope: 'all',
  });

  const allowed = new Set(themes.map((t) => t.slug));
  const mapStocks =
    scope === 'all'
      ? bundle.stocks
      : bundle.stocks.filter((s) => allowed.has(s.themeSlug));
  const mapSymbols = new Set(mapStocks.map((s) => s.symbol));
  const mapEdges = bundle.supplyEdges.filter(
    (e) => mapSymbols.has(e.from) && mapSymbols.has(e.to),
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
        <h1 className="text-xl font-bold sm:text-2xl">探索關鍵產業鏈</h1>
        <p className="mt-2 max-w-xl text-sm text-brand-100">
          {SITE_NAME}：從供應鏈關係、題材分類到個股財報與公告，串成一條可點可追的研究路徑。
        </p>
        <p className="mt-2 text-xs text-brand-100/80">
          圖上 {mapStocks.length} 檔 · 此範圍 {themes.length} 個題材
          {bundle.meta?.asOf ? ` · 行情 ${bundle.meta.asOf}` : ''}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/radar"
            className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
          >
            資金雷達 →
          </Link>
          <Link
            href="/themes"
            className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            題材列表
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">供應鏈地圖</h2>
            <p className="mt-0.5 text-xs text-slate-400">點節點進個股；下方卡片進題材說明</p>
          </div>
          <Suspense fallback={null}>
            <ThemeScopeTabs basePath="/" defaultScope="ai" />
          </Suspense>
        </div>
        <MapView nodes={toFlowNodes(mapStocks, mapEdges)} edges={toFlowEdges(mapEdges)} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} signal={bySlug.get(t.slug)} />
          ))}
        </div>
        {themes.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            此範圍目前沒有題材可顯示，可切換上方範圍再試。
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">最新重大訊息</h2>
          <Link href="/announcements" className="text-xs font-medium text-brand-600 hover:underline">
            看全部 →
          </Link>
        </div>
        <MopsAnnouncementsPanel compact />
      </section>
    </div>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { filterThemesByScope, parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
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
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-700 via-[#3b0764] to-[#120814] px-6 py-16 text-white shadow-[0_0_48px_rgba(232,121,249,0.35)] sm:px-10 sm:py-20">
        <h1 className="font-cyber text-3xl font-bold tracking-tight sm:text-5xl">
          夜城產線上線
        </h1>
        <p className="mt-4 max-w-2xl font-cyber text-sm text-fuchsia-100/85 sm:text-base">
          進入供應鏈網格，追蹤資金熱區。地圖看誰供誰，雷達看錢與價的相對位置。
        </p>
        <p className="mt-3 font-cyber text-xs text-fuchsia-200/70">
          圖上 {mapStocks.length} 檔 · 此範圍 {themes.length} 個題材
          {bundle.meta?.asOf ? ` · 行情 ${bundle.meta.asOf}` : ''}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/radar"
            className="inline-flex items-center justify-center rounded-3xl bg-fuchsia-300 px-5 py-3 text-sm font-semibold text-[#120814] shadow-[0_0_24px_rgba(232,121,249,0.7)] transition hover:bg-fuchsia-200"
          >
            資金雷達 →
          </Link>
          <Link
            href="/themes"
            className="inline-flex items-center justify-center rounded-3xl border border-fuchsia-200/40 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/20"
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
        <MapView
          nodes={toFlowNodes(mapStocks, mapEdges)}
          edges={toFlowEdges(mapEdges)}
          defaultLayer="compact"
        />
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

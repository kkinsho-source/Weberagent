import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { filterThemesByScope, parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
import { SITE_NAME } from '@/lib/site';

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  // 地圖首頁預設 AI 鏈；?scope=all 可看全部題材卡（T0 灌入後才有差）
  const scope: ThemeScope = parseThemeScope(sp.scope, 'ai');
  const bundle = await getDataBundle();
  const themes = filterThemesByScope(bundle.themes, scope);

  // 地圖節點：依 scope 過濾成分（目前僅 T1 有股，all/ai 同）
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
          {SITE_NAME}：供應鏈節點圖、題材、財報與規則 AI 洞察。
        </p>
        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          資料源：
          <strong className="font-semibold">{bundle.dataSource}</strong>
          {bundle.meta?.asOf ? <span>· asOf {bundle.meta.asOf}</span> : null}
          <span>
            · 圖上 {mapStocks.length} 檔 · 題材 {themes.length}
          </span>
          <span>· scope={scope}</span>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <MarketTabs />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">最新重大訊息</h2>
        <MopsAnnouncementsPanel compact />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">供應鏈地圖</h2>
          <Suspense fallback={null}>
            <ThemeScopeTabs basePath="/" defaultScope="ai" />
          </Suspense>
        </div>
        <MapView nodes={toFlowNodes(mapStocks, mapEdges)} edges={toFlowEdges(mapEdges)} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} />
          ))}
        </div>
        {themes.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            此 scope 尚無題材（Tier-0 待 S3 灌入）。
          </p>
        ) : null}
      </section>
    </div>
  );
}

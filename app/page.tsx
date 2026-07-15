import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';
import { SITE_NAME } from '@/lib/site';

export const revalidate = 60;

export default async function HomePage() {
  const bundle = await getDataBundle();

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
          <span>· {bundle.stocks.length} 檔</span>
        </div>
        <div className="mt-5 flex justify-start">
          <MarketTabs />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">最新重大訊息</h2>
        <MopsAnnouncementsPanel compact />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">供應鏈地圖</h2>
        </div>
        <MapView
          nodes={toFlowNodes(bundle.stocks, bundle.supplyEdges)}
          edges={toFlowEdges(bundle.supplyEdges)}
        />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundle.themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

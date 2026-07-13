import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';
import { SupabaseDataDemo } from '@/components/demo/SupabaseDataDemo';

// 行情可每 60s 重新驗證（接 Supabase 後生效）
export const revalidate = 60;

export default async function HomePage() {
  // 優先 Supabase；未設定時自動 fallback snapshot（真實 TWSE 行情）
  const bundle = await getDataBundle();
  const focus = [
    { title: '第三代半導體材料', count: 15, pct: 9.53 },
    { title: '石化與塑膠產業', count: 219, pct: 7.93 },
    { title: '矽晶圓', count: 36, pct: 7.79 },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
        <h1 className="text-2xl font-bold">探索全球關鍵產業鏈</h1>
        <p className="mt-2 max-w-xl text-sm text-brand-100">
          深入了解供應鏈與投資機會。台股 / 美股 / 日股題材一鍵切換。
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          目前資料源：
          <strong className="font-semibold">{bundle.dataSource}</strong>
          {bundle.meta?.asOf ? <span>· asOf {bundle.meta.asOf}</span> : null}
        </div>
        <div className="mt-5 flex justify-start">
          <MarketTabs />
        </div>
      </section>

      <SupabaseDataDemo />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">今日產業漲幅焦點</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {focus.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">#{f.count} 家</div>
              <div className="mt-1 font-semibold text-slate-800">{f.title}</div>
              <div className="mt-1 text-lg font-bold text-up">+{f.pct}%</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">題材總覽</h2>
        </div>
        <MapView nodes={toFlowNodes(bundle.stocks)} edges={toFlowEdges(bundle.supplyEdges)} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundle.themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

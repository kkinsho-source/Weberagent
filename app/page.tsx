import { themes } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';
import { MapView } from '@/components/map/MapView';
import { toFlowNodes, toFlowEdges } from '@/lib/data/graph';

export default function HomePage() {
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
        <div className="mt-5 flex justify-start">
          <MarketTabs />
        </div>
      </section>

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
        <MapView nodes={toFlowNodes()} edges={toFlowEdges()} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';

export default async function ThemesPage() {
  const bundle = await getDataBundle();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">題材列表</h1>
          <p className="text-xs text-slate-400">資料源：{bundle.dataSource}</p>
        </div>
        <MarketTabs />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bundle.themes.map((t) => (
          <ThemeCard key={t.slug} theme={t} />
        ))}
      </div>
    </div>
  );
}

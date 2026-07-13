import { themes } from '@/lib/data/mock';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';

export default function ThemesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">題材列表</h1>
        <MarketTabs />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => (
          <ThemeCard key={t.slug} theme={t} />
        ))}
      </div>
    </div>
  );
}

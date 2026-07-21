import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import { ThemeCard } from '@/components/ui/ThemeCard';
import { MarketTabs } from '@/components/ui/MarketTabs';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { filterThemesByScope, parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const scope: ThemeScope = parseThemeScope(sp.scope, 'all');
  const bundle = await getDataBundle();
  const themes = filterThemesByScope(bundle.themes, scope);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">題材列表</h1>
          <p className="text-xs text-slate-400">
            資料源：{bundle.dataSource} · 顯示 {themes.length} / {bundle.themes.length} 題材 · scope=
            {scope}
          </p>
        </div>
        <MarketTabs />
      </div>

      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-slate-100" />}>
        <ThemeScopeTabs basePath="/themes" defaultScope="all" />
      </Suspense>

      {themes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          此 scope 尚無題材。
          {scope === 'tier0' || scope === 'defensive' || scope === 'cyclical' ? (
            <span className="mt-1 block text-xs text-slate-400">
              Tier-0 全市場粗網將於 S3 灌入（金融／航運／觀光餐飲等）。目前僅有 AI 供應鏈 Tier-1。
            </span>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {themes.map((t) => (
            <ThemeCard key={t.slug} theme={t} />
          ))}
        </div>
      )}
    </div>
  );
}

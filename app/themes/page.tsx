import { Suspense } from 'react';
import Link from 'next/link';
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
          <p className="mt-1 text-sm text-slate-500">
            依產業／題材瀏覽成分股與說明。目前顯示{' '}
            <strong className="font-semibold text-slate-700">{themes.length}</strong> 個題材。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            <Link href="/radar" className="text-brand-600 hover:underline">
              資金雷達
            </Link>
            可看各題材資金與價的相對位置。
          </p>
        </div>
        <MarketTabs />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500">顯示範圍</p>
        <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-slate-100" />}>
          <ThemeScopeTabs basePath="/themes" defaultScope="all" />
        </Suspense>
      </div>

      {themes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          此範圍目前沒有題材。
          <span className="mt-1 block text-xs text-slate-400">
            可改選「全部」或「AI 鏈」再試。
          </span>
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

import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import { buildThemeFlow, tideStateCounts } from '@/lib/data/theme-flow';
import { parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
import { themeColor } from '@/lib/data/theme-colors';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { ThemeFlowRadar } from '@/components/radar/ThemeFlowRadar';

export const dynamic = 'force-dynamic';

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const sp = await searchParams;
  const scope: ThemeScope = parseThemeScope(sp.scope, 'all');
  const bundle = await getDataBundle();
  const { rows, meta } = buildThemeFlow({
    themes: bundle.themes,
    stocks: bundle.stocks,
    scope,
  });
  const counts = tideStateCounts(rows);
  const viewRows = rows.map((r) => ({
    ...r,
    color: themeColor(r.slug, r.family),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">資金雷達</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            依自有題材成分加總三大法人買賣超，估算資金潮汐（漲潮／輪動／觀望／退潮）。金額為股數×最新收盤之近似值（億），僅供研究、非投資建議。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            股池 dataSource={bundle.dataSource} · 法人快取={meta.dataSource} · scope={scope}
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <ThemeScopeTabs basePath="/radar" defaultScope="all" />
      </Suspense>

      <ThemeFlowRadar
        rows={viewRows}
        counts={counts}
        meta={{ ...meta, stocksDataSource: bundle.dataSource }}
      />

      <p className="text-[11px] leading-relaxed text-slate-400">
        資料來源：臺灣證券交易所 T86、櫃買三大法人明細（彙整快取）；股價 TWSE/TPEx。本頁不構成任何有價證券之分析意見或推介。
      </p>
    </div>
  );
}

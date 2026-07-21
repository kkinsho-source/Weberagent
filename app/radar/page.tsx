import { Suspense } from 'react';
import { getDataBundle } from '@/lib/data/source';
import {
  buildThemeFlow,
  buildThemeFlowBrief,
  buildThemeFlowFrames,
  tideStateCounts,
} from '@/lib/data/theme-flow';
import { buildThemeRs } from '@/lib/data/theme-rs';
import {
  buildCompositeFrames,
  buildCompositeRows,
  parseWeightMode,
} from '@/lib/data/theme-composite';
import { parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
import { themeColor } from '@/lib/data/theme-colors';
import type { ThemeFamily } from '@/lib/types';
import { ThemeScopeTabs } from '@/components/theme/ThemeScopeTabs';
import { ThemeFlowRadar } from '@/components/radar/ThemeFlowRadar';
import { RadarTodayBrief } from '@/components/radar/RadarTodayBrief';
import { ThemeFlowPlayback } from '@/components/radar/ThemeFlowPlayback';
import { ThemeRsPanel } from '@/components/radar/ThemeRsPanel';
import { DualAxisTable } from '@/components/radar/DualAxisTable';
import { CompositeBubblePanel } from '@/components/radar/CompositeBubblePanel';
import { CompositePlayback } from '@/components/radar/CompositePlayback';
import { AdvancedChartsAccordion } from '@/components/radar/AdvancedChartsAccordion';

export const dynamic = 'force-dynamic';

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; w?: string }>;
}) {
  const sp = await searchParams;
  const scope: ThemeScope = parseThemeScope(sp.scope, 'all');
  const weightMode = parseWeightMode(sp.w);
  const bundle = await getDataBundle();
  const flowOpts = {
    themes: bundle.themes,
    stocks: bundle.stocks,
    scope,
  };
  const [{ rows, meta }, { frames }, rsBundle] = await Promise.all([
    buildThemeFlow(flowOpts),
    buildThemeFlowFrames({ ...flowOpts, maxFrames: 20 }),
    buildThemeRs(flowOpts),
  ]);
  const counts = tideStateCounts(rows);
  const brief = buildThemeFlowBrief(rows);
  const compositeRows = buildCompositeRows(rows, rsBundle.rows, weightMode);
  const compositeFrames = buildCompositeFrames(frames, compositeRows, weightMode);

  const viewRows = rows.map((r) => ({
    ...r,
    color: themeColor(r.slug, r.family),
  }));
  const familyBySlug: Record<string, ThemeFamily | undefined> = {};
  for (const t of bundle.themes) familyBySlug[t.slug] = t.family;

  const rsBySlug = new Map(rsBundle.rows.map((r) => [r.slug, r]));
  const dualRows = rows.map((r) => {
    const rs = rsBySlug.get(r.slug);
    const quadrant = rs?.quadrant || 'lagging';
    const resonance =
      r.net5dYi > 0 && (quadrant === 'leading' || quadrant === 'improving');
    return {
      slug: r.slug,
      title: r.title,
      tideLabel: r.stateLabel,
      net5dYi: r.net5dYi,
      quadrantLabel: rs?.quadrantLabel || '—',
      rsRatio: rs?.rsRatio ?? 0,
      resonance,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">資金雷達</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            主圖為<strong>綜合指標泡泡</strong>
            （籌碼強度×價動能，當日百分位標準化；S=可調權重綜合分）。僅供研究、非投資建議。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            股池 {bundle.dataSource} · 法人 {meta.dataSource} · 價 RS {rsBundle.meta.dataSource} ·
            scope={scope} · w={weightMode}
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <ThemeScopeTabs basePath="/radar" defaultScope="all" />
      </Suspense>

      {meta.dataSource !== 'empty' ? <RadarTodayBrief brief={brief} /> : null}

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100" />}>
        <CompositeBubblePanel
          rows={compositeRows}
          mode={weightMode}
          familyBySlug={familyBySlug}
          asOf={meta.asOf || rsBundle.meta.asOf}
        />
      </Suspense>

      <DualAxisTable rows={dualRows} />

      {compositeFrames.length ? (
        <CompositePlayback frames={compositeFrames} familyBySlug={familyBySlug} />
      ) : null}

      <AdvancedChartsAccordion>
        <ThemeFlowRadar
          rows={viewRows}
          counts={counts}
          meta={{ ...meta, stocksDataSource: bundle.dataSource }}
        />
        <ThemeRsPanel rows={rsBundle.rows} meta={rsBundle.meta} familyBySlug={familyBySlug} />
        {meta.dataSource !== 'empty' ? (
          <ThemeFlowPlayback frames={frames} familyBySlug={familyBySlug} />
        ) : null}
      </AdvancedChartsAccordion>

      <p className="text-[11px] leading-relaxed text-slate-400">
        綜合分 S 與座標為當日題材橫截面相對位置，隨 scope／權重改變；非報酬預測。資料：T86、櫃買法人、stock_prices。相對強弱為自算簡化模型。
      </p>
    </div>
  );
}

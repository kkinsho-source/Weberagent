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
import { RadarBeginnerSteps } from '@/components/radar/RadarBeginnerSteps';
import { RadarGlossary } from '@/components/radar/RadarGlossary';
import { RadarEmptyBlock } from '@/components/radar/RadarEmptyBlock';

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

  const asOf = meta.asOf || rsBundle.meta.asOf || '—';
  const hasFlow = meta.dataSource !== 'empty';

  return (
    <div className="space-y-6">
      {/* R1 白話頁首 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">資金雷達</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            用一張圖看題材資金與價的相對位置：
            <strong className="font-semibold text-slate-800">誰比較熱、誰在降溫</strong>
            。先看今日重點，再看泡泡落在哪一區即可。
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tabular-nums text-slate-600">
          資料日 {asOf}
        </div>
      </div>

      {/* 可選：本頁怎麼看 */}
      <Suspense fallback={null}>
        <RadarBeginnerSteps />
      </Suspense>

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500">看哪些題材範圍</p>
        <Suspense fallback={null}>
          <ThemeScopeTabs basePath="/radar" defaultScope="all" />
        </Suspense>
      </div>

      {hasFlow ? (
        <RadarTodayBrief brief={brief} />
      ) : (
        <RadarEmptyBlock title="今日重點暫時無法顯示" tone="warn">
          盤後法人資料可能尚未更新完成。請稍後再重新整理；若下方熱區圖仍有歷史資料，仍可先瀏覽。
        </RadarEmptyBlock>
      )}

      <Suspense
        fallback={
          <RadarEmptyBlock title="熱區圖載入中…">
            正在整理題材籌碼與價動能，通常幾秒內完成。
          </RadarEmptyBlock>
        }
      >
        <CompositeBubblePanel
          rows={compositeRows}
          mode={weightMode}
          familyBySlug={familyBySlug}
          asOf={asOf}
        />
      </Suspense>

      <DualAxisTable rows={dualRows} />

      {compositeFrames.length ? (
        <CompositePlayback frames={compositeFrames} familyBySlug={familyBySlug} />
      ) : (
        <RadarEmptyBlock title="回放暫時沒有資料">
          需要多日法人歷史才能播放「最近怎麼移動」。資料累積後會自動出現。
        </RadarEmptyBlock>
      )}

      <RadarGlossary />

      <AdvancedChartsAccordion>
        <ThemeFlowRadar
          rows={viewRows}
          counts={counts}
          meta={{ ...meta, stocksDataSource: bundle.dataSource }}
        />
        <ThemeRsPanel rows={rsBundle.rows} meta={rsBundle.meta} familyBySlug={familyBySlug} />
        {hasFlow ? (
          <ThemeFlowPlayback frames={frames} familyBySlug={familyBySlug} />
        ) : null}
      </AdvancedChartsAccordion>

      <p className="text-[11px] leading-relaxed text-slate-400">
        【免責】圖上位置是和其他題材比較後的相對結果，不是絕對好壞，也不是買賣點或報酬預測。資料來自公開法人與行情彙整。
      </p>
    </div>
  );
}

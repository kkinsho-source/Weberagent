import 'server-only';
import type { Stock, Theme } from '../types';
import { buildThemeFlow } from './theme-flow';
import { buildThemeRs } from './theme-rs';
import { buildCompositeRows, type CompositeRow } from './theme-composite';
import type { ThemeScope } from './theme-scope';

/** 題材卡／題材頁共用：與 /radar 預設相同（scope=all、均衡權重） */
export async function loadThemeComposite(opts: {
  themes: Theme[];
  stocks: Stock[];
  scope?: ThemeScope;
}): Promise<{
  composite: CompositeRow[];
  bySlug: Map<string, CompositeRow>;
  asOf: string | null;
}> {
  const scope = opts.scope ?? 'all';
  const flowOpts = { themes: opts.themes, stocks: opts.stocks, scope };
  const [{ rows, meta }, rsBundle] = await Promise.all([
    buildThemeFlow(flowOpts),
    buildThemeRs(flowOpts),
  ]);
  const composite = buildCompositeRows(rows, rsBundle.rows, 'balanced');
  return {
    composite,
    bySlug: new Map(composite.map((r) => [r.slug, r])),
    asOf: meta.asOf || rsBundle.meta.asOf || null,
  };
}

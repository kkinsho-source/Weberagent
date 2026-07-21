import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';
import {
  filterThemesByScope,
  parseThemeScope,
  themesForRadar,
  type ThemeScope,
} from '@/lib/data/theme-scope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/themes
 * GET /api/themes?scope=ai|all|tier0|defensive|cyclical
 * GET /api/themes?scope=all&radar=1  → 僅 radarDefault（排除 benchmark）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scope: ThemeScope = parseThemeScope(searchParams.get('scope'), 'all');
  const radar = searchParams.get('radar') === '1' || searchParams.get('radar') === 'true';

  try {
    const bundle = await getDataBundle();
    const themes = radar
      ? themesForRadar(bundle.themes, scope)
      : filterThemesByScope(bundle.themes, scope);

    return NextResponse.json({
      themes,
      scope,
      radar,
      count: themes.length,
      total: bundle.themes.length,
      dataSource: bundle.dataSource,
      meta: bundle.meta,
    });
  } catch (e) {
    console.error('[api/themes]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

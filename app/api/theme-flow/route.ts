import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';
import { buildThemeFlow, tideStateCounts } from '@/lib/data/theme-flow';
import { parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';
import { themeColor } from '@/lib/data/theme-colors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/theme-flow?scope=all|ai|tier0|...
 * 題材法人資金潮汐聚合（需 lib/data/institutional_snapshot.json）
 */
export async function GET(req: Request) {
  const scope: ThemeScope = parseThemeScope(new URL(req.url).searchParams.get('scope'), 'all');
  try {
    const bundle = await getDataBundle();
    const { rows, meta } = buildThemeFlow({
      themes: bundle.themes,
      stocks: bundle.stocks,
      scope,
    });
    const withColor = rows.map((r) => ({
      ...r,
      color: themeColor(r.slug, r.family),
    }));
    return NextResponse.json({
      rows: withColor,
      counts: tideStateCounts(rows),
      scope,
      meta: {
        ...meta,
        stocksDataSource: bundle.dataSource,
        stockCount: bundle.stocks.length,
      },
      disclaimer:
        '僅就公開三大法人買賣超股數與收盤價估算題材淨額（億），非投資建議；方法為成分加總、金額=股數×最新收盤近似。',
    });
  } catch (e) {
    console.error('[api/theme-flow]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

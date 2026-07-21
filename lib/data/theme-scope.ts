import type { Theme, ThemeFamily, ThemeTier, Market } from '../types';

/** 雷達／列表 scope（B-plan） */
export type ThemeScope = 'ai' | 'all' | 'defensive' | 'cyclical' | 'tier0' | 'tier1';

export const THEME_SCOPE_OPTIONS: ReadonlyArray<{
  key: ThemeScope;
  label: string;
  hint: string;
}> = [
  { key: 'ai', label: 'AI 供應鏈', hint: 'Tier-1 細題材（地圖預設）' },
  { key: 'all', label: '全部', hint: 'Tier-0 粗網 + Tier-1（雷達預設）' },
  { key: 'tier0', label: '全市場粗網', hint: '僅 Tier-0' },
  { key: 'defensive', label: '防禦', hint: '金融／電信等' },
  { key: 'cyclical', label: '循環', hint: '航運／塑化／營建等' },
];

export function parseThemeScope(raw: string | null | undefined, fallback: ThemeScope = 'all'): ThemeScope {
  const v = (raw || '').toLowerCase().trim();
  if (v === 'ai' || v === 'tier1' || v === 'all' || v === 'tier0' || v === 'defensive' || v === 'cyclical') {
    return v === 'tier1' ? 'ai' : (v as ThemeScope);
  }
  return fallback;
}
const FAMILIES: ReadonlySet<string> = new Set([
  'ai_chain',
  'defensive',
  'cyclical',
  'electronics_ex_ai',
  'other',
  'benchmark',
]);

function coerceTier(v: unknown): ThemeTier {
  if (v === 0 || v === '0') return 0;
  if (v === 2 || v === '2') return 2;
  if (v === 1 || v === '1') return 1;
  return 1;
}

function coerceFamily(v: unknown): ThemeFamily {
  if (typeof v === 'string' && FAMILIES.has(v)) return v as ThemeFamily;
  return 'ai_chain';
}

function coerceRadarDefault(v: unknown, family: ThemeFamily): boolean {
  if (typeof v === 'boolean') return v;
  if (family === 'benchmark') return false;
  return true;
}

/** 舊 Theme／DB 列缺少分層欄位時補齊（S1：DB 尚未 migrate 也能跑） */
export function normalizeTheme(input: {
  slug: string;
  title: string;
  description: string;
  market: Market;
  companyCount: number;
  verifiedAt: string;
  tier?: unknown;
  family?: unknown;
  radarDefault?: unknown;
}): Theme {
  const family = coerceFamily(input.family);
  return {
    slug: input.slug,
    title: input.title,
    description: input.description,
    market: input.market,
    companyCount: input.companyCount,
    verifiedAt: input.verifiedAt,
    tier: coerceTier(input.tier),
    family,
    radarDefault: coerceRadarDefault(input.radarDefault, family),
  };
}

export function filterThemesByScope(themes: Theme[], scope: ThemeScope = 'all'): Theme[] {
  switch (scope) {
    case 'ai':
    case 'tier1':
      return themes.filter((t) => t.tier === 1 || t.family === 'ai_chain');
    case 'tier0':
      return themes.filter((t) => t.tier === 0);
    case 'defensive':
      return themes.filter((t) => t.family === 'defensive');
    case 'cyclical':
      return themes.filter((t) => t.family === 'cyclical');
    case 'all':
    default:
      return themes.filter((t) => t.family !== 'benchmark');
  }
}

/** 資金雷達用：排除 benchmark，且遵守 radarDefault */
export function themesForRadar(themes: Theme[], scope: ThemeScope = 'all'): Theme[] {
  return filterThemesByScope(themes, scope).filter(
    (t) => t.radarDefault && t.family !== 'benchmark',
  );
}

/**
 * B-full0 + G12 規劃 slug（S1 僅文件／型別對齊用，尚未灌入 themes[]）
 * 實作灌股見後續 S3
 */
export const PLANNED_TIER0_SLUGS = [
  'financials',
  'shipping',
  'plastics_chem',
  'steel_cement',
  'construction',
  'biotech',
  'energy_green',
  'consumer_retail',
  'telecom',
  'electronics_ex_ai',
  'auto_parts',
  'tourism_dining',
] as const;

export type PlannedTier0Slug = (typeof PLANNED_TIER0_SLUGS)[number];

/** 題材配色（client / server 皆可 import） */

import type { ThemeFamily } from '../types';

/** Tier-1 AI 鏈 + Tier-0 規劃 slug（S3 灌題前也可先有色） */
export const THEME_COLORS: Record<string, string> = {
  // —— Tier-1 AI ——
  ic_design_asic: '#8b5cf6',
  ic_design_hpc: '#6366f1',
  foundry: '#0ea5e9',
  advanced_packaging: '#14b8a6',
  ai_server: '#22c55e',
  pcb_ccl: '#f59e0b',
  thermal_power: '#ef4444',
  optical_cpo: '#ec4899',
  materials_wafer: '#64748b',
  memory_hbm: '#a855f7',
  semicon_equipment: '#0f766e',

  // —— Tier-0 全市場粗網（中性／低飽和，避免搶 AI 彩虹）——
  financials: '#1e40af',
  shipping: '#0369a1',
  plastics_chem: '#b45309',
  steel_cement: '#57534e',
  construction: '#a16207',
  biotech: '#be185d',
  energy_green: '#15803d',
  consumer_retail: '#c2410c',
  telecom: '#4338ca',
  electronics_ex_ai: '#0f766e',
  auto_parts: '#7c2d12',
  tourism_dining: '#9d174d',

  // 基準（通常不畫泡泡）
  tw_benchmark: '#94a3b8',
};

/** family 後備色（未知 slug 時） */
export const FAMILY_COLORS: Record<ThemeFamily, string> = {
  ai_chain: '#6366f1',
  defensive: '#1d4ed8',
  cyclical: '#b45309',
  electronics_ex_ai: '#0f766e',
  other: '#64748b',
  benchmark: '#94a3b8',
};

export function themeColor(slug: string, family?: ThemeFamily): string {
  if (THEME_COLORS[slug]) return THEME_COLORS[slug];
  if (family && FAMILY_COLORS[family]) return FAMILY_COLORS[family];
  return '#94a3b8';
}

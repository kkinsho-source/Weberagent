/** 題材配色（client / server 皆可 import） */
export const THEME_COLORS: Record<string, string> = {
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
};

export function themeColor(slug: string): string {
  return THEME_COLORS[slug] || '#94a3b8';
}

/** 地圖泳道（client-safe，勿從 graph.ts 再轉出口以免踩 source/server-only） */

export type SwimLane = {
  key: string;
  label: string;
  match: (slug?: string) => boolean;
};

export const SWIM_LANES: SwimLane[] = [
  {
    key: 'mat',
    label: '材料／設備',
    match: (s) =>
      s === 'materials_wafer' || s === 'memory_hbm' || s === 'semicon_equipment',
  },
  {
    key: 'design',
    label: '設計',
    match: (s) => !!s?.startsWith('ic_design'),
  },
  {
    key: 'foundry',
    label: '代工',
    match: (s) => s === 'foundry',
  },
  {
    key: 'pkg',
    label: '封測／載板',
    match: (s) => s === 'advanced_packaging' || s === 'pcb_ccl',
  },
  {
    key: 'sys',
    label: '系統／周邊',
    match: (s) =>
      s === 'ai_server' || s === 'thermal_power' || s === 'optical_cpo',
  },
  {
    key: 'other',
    label: '其他',
    match: () => false,
  },
];

export function laneKeyFor(slug?: string): string {
  const hit = SWIM_LANES.find((L) => L.key !== 'other' && L.match(slug));
  return hit?.key ?? 'other';
}

export const SWIM_COL_W = 188;
export const SWIM_ROW_H = 78;
export const SWIM_HEADER_H = 40;

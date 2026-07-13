import type { Edge, Node } from '@xyflow/react';
import type { Stock } from '../types';
import { stocks, supplyEdges } from './mock';

// 產業 → 垂直分層（0=最上游設計, 4=最下游板卡）
const LAYER: Record<string, number> = {
  IP: 0,
  'IC 設計': 0,
  晶圓代工: 1,
  封測: 2,
  組裝: 3,
  PCB: 4,
  CCL: 4,
};

export interface StockNodeData extends Record<string, unknown> {
  stock: Stock;
}

export function toFlowNodes(): Node<StockNodeData>[] {
  const perLayer: Record<number, number> = {};
  return stocks.map((s) => {
    const layer = LAYER[s.industry] ?? 2;
    const idx = (perLayer[layer] = (perLayer[layer] ?? 0) + 1);
    return {
      id: s.symbol,
      position: { x: idx * 200, y: layer * 160 },
      data: { stock: s },
      type: 'stock',
    };
  });
}

export function toFlowEdges(): Edge[] {
  return supplyEdges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    label: '供貨',
  }));
}

// 取某檔個股的上下游相鄰子圖（用於題材頁/個股頁鑽取）
export function subgraphFor(symbols: string[]): {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
} {
  const set = new Set(symbols);
  const nodes = toFlowNodes().filter((n) => set.has(n.id));
  const edges = toFlowEdges().filter(
    (e) => set.has(e.source) && set.has(e.target),
  );
  return { nodes, edges };
}

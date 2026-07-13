import * as dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Stock } from '../types';
import { stocks, supplyEdges } from './source';

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

const NODE_W = 150;
const NODE_H = 64;

// 用 dagre 自動分層佈局，避免手動算 x/y 造成的節點過密
export function toFlowNodes(): Node<StockNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const baseNodes = stocks.map((s) => ({
    id: s.symbol,
    data: { stock: s },
    type: 'stock' as const,
  }));

  baseNodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  supplyEdges.forEach((e) => g.setEdge(e.from, e.to));

  dagre.layout(g);

  return baseNodes.map((n) => {
    const { x, y } = g.node(n.id);
    return {
      ...n,
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
      data: n.data,
      type: n.type,
    } as Node<StockNodeData>;
  });
}

export function toFlowEdges(): Edge[] {
  return supplyEdges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    type: 'smoothstep',
    animated: true,
    label: '供貨',
    labelStyle: { fontSize: 10, fill: '#94a3b8' },
    style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
  }));
}

// 取某檔個股 / 某題材的上下游相門子圖（鑽取用）
// 個股：種子 + 直接上下游鄰居；題材：該題材全部公司 + 其互連邊
export function subgraphFor(symbols: string[], expandNeighbors = true): {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
} {
  const seed = new Set(symbols);
  // 計算保留的節點集合（個股模式要包含直接鄰居）
  const keepNodes = new Set<string>(seed);
  const keptEdges = supplyEdges.filter((e) => {
    if (seed.has(e.from) && seed.has(e.to)) return true; // 題材內互連
    if (expandNeighbors && (seed.has(e.from) || seed.has(e.to))) {
      keepNodes.add(e.from);
      keepNodes.add(e.to);
      return true;
    }
    return false;
  });

  const nodes = toFlowNodes().filter((n) => keepNodes.has(n.id));
  const edgeIdSet = new Set(keptEdges.map((e) => `${e.from}->${e.to}`));
  const edges = toFlowEdges().filter((e) => edgeIdSet.has(`${e.source}->${e.target}`));
  return { nodes, edges };
}

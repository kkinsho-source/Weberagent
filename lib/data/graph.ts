import * as dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { Stock, SupplyEdge } from '../types';
import { stocks as defaultStocks, supplyEdges as defaultEdges } from './source';

export interface StockNodeData extends Record<string, unknown> {
  stock: Stock;
}

const NODE_W = 150;
const NODE_H = 64;

/** 用 dagre 自動分層佈局 */
export function toFlowNodes(stockList: Stock[] = defaultStocks): Node<StockNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 120, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const baseNodes = stockList.map((s) => ({
    id: s.symbol,
    data: { stock: s },
    type: 'stock' as const,
  }));

  baseNodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  // edges 僅連接 stockList 內的節點
  const ids = new Set(stockList.map((s) => s.symbol));
  defaultEdges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .forEach((e) => g.setEdge(e.from, e.to));

  dagre.layout(g);

  return baseNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: n.data,
      type: n.type,
    } as Node<StockNodeData>;
  });
}

export function toFlowEdges(edgeList: SupplyEdge[] = defaultEdges): Edge[] {
  return edgeList.map((e, i) => ({
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

/**
 * 取某檔個股 / 某題材的上下游子圖
 * @param symbols 種子代號
 * @param stockList 可選：完整股票列表（預設 snapshot/mock）
 * @param edgeList 可選：供應鏈邊
 */
export function subgraphFor(
  symbols: string[],
  expandNeighbors = true,
  stockList: Stock[] = defaultStocks,
  edgeList: SupplyEdge[] = defaultEdges
): { nodes: Node<StockNodeData>[]; edges: Edge[] } {
  const seed = new Set(symbols);
  const keepNodes = new Set<string>(seed);
  const keptEdges = edgeList.filter((e) => {
    if (seed.has(e.from) && seed.has(e.to)) return true;
    if (expandNeighbors && (seed.has(e.from) || seed.has(e.to))) {
      keepNodes.add(e.from);
      keepNodes.add(e.to);
      return true;
    }
    return false;
  });

  const subStocks = stockList.filter((s) => keepNodes.has(s.symbol));
  const nodes = toFlowNodes(subStocks);
  const edgeIdSet = new Set(keptEdges.map((e) => `${e.from}->${e.to}`));
  const edges = toFlowEdges(keptEdges).filter((e) =>
    edgeIdSet.has(`${e.source}->${e.target}`)
  );
  return { nodes, edges };
}

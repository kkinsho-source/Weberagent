import type { Edge, Node } from '@xyflow/react';
import type { Stock, SupplyEdge } from '../types';
import { stocks as defaultStocks, supplyEdges as defaultEdges } from './source';
import {
  SWIM_LANES,
  laneKeyFor,
  SWIM_COL_W,
  SWIM_ROW_H,
  SWIM_HEADER_H,
} from './map-lanes';

export interface StockNodeData extends Record<string, unknown> {
  stock?: Stock;
  laneLabel?: string;
  kind?: 'stock' | 'lane';
}

export { THEME_COLORS, themeColor } from './theme-colors';

const NODE_W = 168;

/** LM1 泳道：材料→設計→代工→封測→系統（不再用 dagre 樹） */
export function toFlowNodes(
  stockList: Stock[] = defaultStocks,
  _edgeList: SupplyEdge[] = defaultEdges,
): Node<StockNodeData>[] {
  const groups = new Map<string, Stock[]>();
  for (const L of SWIM_LANES) groups.set(L.key, []);
  for (const s of stockList) {
    groups.get(laneKeyFor(s.themeSlug))!.push(s);
  }
  for (const arr of groups.values()) {
    arr.sort(
      (a, b) =>
        (b.marketCap || 0) - (a.marketCap || 0) || a.symbol.localeCompare(b.symbol),
    );
  }

  const lanes = SWIM_LANES.filter(
    (L) => L.key !== 'other' || (groups.get('other')?.length ?? 0) > 0,
  );

  const nodes: Node<StockNodeData>[] = [];
  lanes.forEach((L, i) => {
    nodes.push({
      id: `lane-${L.key}`,
      type: 'laneHeader',
      position: { x: i * SWIM_COL_W, y: 0 },
      data: { laneLabel: L.label, kind: 'lane' },
      draggable: false,
      selectable: false,
      connectable: false,
      style: { width: NODE_W },
    });
    (groups.get(L.key) || []).forEach((s, j) => {
      nodes.push({
        id: s.symbol,
        type: 'stock',
        position: {
          x: i * SWIM_COL_W,
          y: SWIM_HEADER_H + 6 + j * SWIM_ROW_H,
        },
        data: { stock: s, kind: 'stock' },
        style: { width: NODE_W },
      });
    });
  });
  return nodes;
}

export function toFlowEdges(edgeList: SupplyEdge[] = defaultEdges): Edge[] {
  return edgeList.map((e, i) => {
    const isCompetitor = e.relation === 'competitor';
    return {
      id: `e${i}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      animated: !isCompetitor,
      label: undefined,
      data: {
        relation: e.relation,
        relationLabel: isCompetitor ? '競品' : '供貨',
      },
      labelStyle: { fontSize: 10, fill: isCompetitor ? '#f59e0b' : '#94a3b8' },
      style: {
        stroke: isCompetitor ? '#fbbf24' : 'rgba(232,121,249,0.28)',
        strokeWidth: 1.4,
        strokeDasharray: isCompetitor ? '4 4' : undefined,
      },
    };
  });
}

export function subgraphFor(
  symbols: string[],
  expandNeighbors = true,
  stockList: Stock[] = defaultStocks,
  edgeList: SupplyEdge[] = defaultEdges,
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
  const nodes = toFlowNodes(subStocks, keptEdges);
  const edgeIdSet = new Set(keptEdges.map((e) => `${e.from}->${e.to}`));
  const edges = toFlowEdges(keptEdges).filter((e) =>
    edgeIdSet.has(`${e.source}->${e.target}`),
  );
  return { nodes, edges };
}

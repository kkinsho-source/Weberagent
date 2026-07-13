'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StockNode } from './StockNode';
import type { StockNodeData } from '@/lib/data/graph';

const nodeTypes = { stock: StockNode };

interface Props {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
}

export function SupplyChainGraph({ nodes, edges }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // 點擊某節點時高亮其上下游路徑，其餘淡出
  const { styledNodes, styledEdges } = useMemo(() => {
    if (!selected) return { styledNodes: nodes, styledEdges: edges };
    const related = new Set<string>([selected]);
    edges.forEach((e) => {
      if (e.source === selected) related.add(e.target);
      if (e.target === selected) related.add(e.source);
    });
    const sn = nodes.map((n) => ({
      ...n,
      selected: n.id === selected,
      style: { opacity: related.has(n.id) ? 1 : 0.25 },
    }));
    const se = edges.map((e) => ({
      ...e,
      style: { opacity: e.source === selected || e.target === selected ? 1 : 0.15 },
      animated: e.source === selected || e.target === selected,
    }));
    return { styledNodes: sn, styledEdges: se };
  }, [nodes, edges, selected]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => setSelected((prev) => (prev === node.id ? null : node.id)),
    [],
  );

  return (
    <div className="h-[480px] w-full rounded-2xl border border-slate-200 bg-white">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-slate-50" />
      </ReactFlow>
    </div>
  );
}

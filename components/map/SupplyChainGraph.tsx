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
  title?: string;
}

export function SupplyChainGraph({ nodes, edges, title }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // 點擊節點高亮其上下游路徑，其餘淡出
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
      style: { opacity: related.has(n.id) ? 1 : 0.2 },
    }));
    const se = edges.map((e) => ({
      ...e,
      style: {
        ...(e.style as object),
        opacity: e.source === selected || e.target === selected ? 1 : 0.12,
      },
      animated: e.source === selected || e.target === selected,
    }));
    return { styledNodes: sn, styledEdges: se };
  }, [nodes, edges, selected]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => setSelected((prev) => (prev === node.id ? null : node.id)),
    [],
  );

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {title && (
        <div className="absolute left-3 top-3 z-10 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-slate-500 backdrop-blur">
          {title}
        </div>
      )}
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        nodesDraggable
        panOnScroll
      >
        <Background color="#e2e8f0" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-slate-50" maskColor="rgba(241,245,249,0.7)" />
      </ReactFlow>
    </div>
  );
}

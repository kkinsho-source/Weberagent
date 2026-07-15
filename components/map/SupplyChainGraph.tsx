'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
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

function FitOnMount({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => {
      fitView({ padding: nodeCount > 20 ? 0.08 : 0.18, duration: 200 });
    }, 50);
    return () => clearTimeout(t);
  }, [fitView, nodeCount]);
  return null;
}

function GraphInner({ nodes, edges, title }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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
      style: { opacity: related.has(n.id) ? 1 : 0.18 },
    }));
    const se = edges.map((e) => {
      const hit = e.source === selected || e.target === selected;
      return {
        ...e,
        style: {
          ...(e.style as object),
          opacity: hit ? 1 : 0.1,
          strokeWidth: hit ? 2.2 : 1.2,
        },
        animated: hit,
      };
    });
    return { styledNodes: sn, styledEdges: se };
  }, [nodes, edges, selected]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelected((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      router.push(`/stock/${node.id}`);
    },
    [router]
  );

  const selectedName = selected
    ? (nodes.find((n) => n.id === selected)?.data as StockNodeData | undefined)?.stock
        ?.name
    : null;

  return (
    <div
      className="relative h-[min(70vh,560px)] min-h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white sm:h-[480px] sm:min-h-[480px]"
      style={{ touchAction: 'none' }}
    >
      {title && (
        <div className="absolute left-2 top-2 z-10 max-w-[70%] truncate rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:text-xs">
          {title}
        </div>
      )}

      {selected && (
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-sm">
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-800">
              {selectedName || selected}{' '}
              <span className="font-normal text-slate-400">{selected}</span>
            </div>
            <div className="text-[10px] text-slate-400">點一下取消 · 雙擊進個股</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="rounded-md bg-brand-600 px-2 py-1 text-[11px] font-medium text-white"
              onClick={() => router.push(`/stock/${selected}`)}
            >
              個股
            </button>
            <button
              type="button"
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
              onClick={() => setSelected(null)}
            >
              清除
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: isMobile ? 0.12 : 0.15 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.12}
        maxZoom={2.5}
        nodesDraggable={!isMobile}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={!isMobile}
        zoomOnScroll={!isMobile}
        zoomOnPinch
        panOnDrag
        selectionOnDrag={false}
        preventScrolling
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#e2e8f0" gap={isMobile ? 20 : 16} size={1} />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!m-2 !scale-90 sm:!m-3 sm:!scale-100"
        />
        {!isMobile && (
          <MiniMap
            pannable
            zoomable
            className="!bg-slate-50"
            maskColor="rgba(241,245,249,0.7)"
          />
        )}
        <FitOnMount nodeCount={nodes.length} />
      </ReactFlow>
    </div>
  );
}

export function SupplyChainGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}

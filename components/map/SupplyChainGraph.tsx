'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StockNode } from './StockNode';
import type { StockNodeData } from '@/lib/data/graph';
import { themeColor } from '@/lib/data/theme-colors';

const nodeTypes = { stock: StockNode };

interface Props {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
  title?: string;
}

function ZoomToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="absolute left-2 top-10 z-10 flex gap-1 sm:left-3 sm:top-12">
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => zoomIn({ duration: 160 })}
        title="放大"
      >
        +
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        onClick={() => zoomOut({ duration: 160 })}
        title="縮小"
      >
        −
      </button>
      <button
        type="button"
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        onClick={() => fitView({ padding: 0.15, duration: 200 })}
        title="置中"
      >
        置中
      </button>
    </div>
  );
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

  const selectedStock = useMemo(() => {
    if (!selected) return null;
    return (nodes.find((n) => n.id === selected)?.data as StockNodeData | undefined)?.stock;
  }, [nodes, selected]);

  const relatedInfo = useMemo(() => {
    if (!selected) return { up: [] as string[], down: [] as string[], peers: [] as string[] };
    const up: string[] = [];
    const down: string[] = [];
    const peers: string[] = [];
    edges.forEach((e) => {
      const label = String((e as Edge & { label?: string }).label || '');
      if (e.target === selected) {
        if (label === '競品') peers.push(e.source);
        else up.push(e.source);
      }
      if (e.source === selected) {
        if (label === '競品') peers.push(e.target);
        else down.push(e.target);
      }
    });
    return { up, down, peers };
  }, [edges, selected]);

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
      style: { opacity: related.has(n.id) ? 1 : 0.15 },
    }));
    const se = edges.map((e) => {
      const hit = e.source === selected || e.target === selected;
      return {
        ...e,
        style: {
          ...(e.style as object),
          opacity: hit ? 1 : 0.08,
          strokeWidth: hit ? 2.4 : 1.2,
        },
        animated: hit && String((e as Edge & { label?: string }).label) !== '競品',
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

  const nameOf = (sym: string) =>
    (nodes.find((n) => n.id === sym)?.data as StockNodeData | undefined)?.stock?.name || sym;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 px-1 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">圖例</span>
        <span className="inline-flex items-center gap-1">
          <i className="h-0.5 w-4 rounded bg-slate-300" /> 供貨（上下游）
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="h-0.5 w-4 rounded border border-dashed border-amber-400 bg-transparent" />{' '}
          競品
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm bg-sky-500" /> 題材色＝節點左邊線
        </span>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div
          className="relative h-[min(70vh,560px)] min-h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white sm:h-[480px] sm:min-h-[480px] lg:flex-1"
          style={{ touchAction: 'none' }}
        >
          {title && (
            <div className="absolute left-2 top-2 z-10 max-w-[70%] truncate rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:text-xs">
              {title}
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
            panOnScroll={false}
            zoomOnScroll
            zoomOnPinch
            zoomActivationKeyCode="Control"
            panOnDrag
            selectionOnDrag={false}
            preventScrolling
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background color="#e2e8f0" gap={isMobile ? 20 : 16} size={1} />
            <Controls
              showInteractive={false}
              position="bottom-right"
              className="!m-2 !scale-100 sm:!m-3 sm:!scale-110"
            />
            {/* MiniMap 會擋主圖，桌機改以左上縮放鈕為主 */}
            <ZoomToolbar />
            <FitOnMount nodeCount={nodes.length} />
          </ReactFlow>
        </div>

        {/* S4 側欄 */}
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-72">
          {selectedStock ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">{selectedStock.symbol}</div>
                <div className="text-lg font-bold text-slate-800">{selectedStock.name}</div>
                <div className="text-xs text-slate-500">{selectedStock.industry}</div>
                <div
                  className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] text-white"
                  style={{ background: themeColor(selectedStock.themeSlug) }}
                >
                  {selectedStock.themeSlug || 'theme'}
                </div>
              </div>
              <div
                className={`text-xl font-bold ${selectedStock.changePct >= 0 ? 'text-up' : 'text-down'}`}
              >
                {Number(selectedStock.price || 0).toLocaleString()}
                <span className="ml-2 text-sm">
                  {selectedStock.changePct >= 0 ? '+' : ''}
                  {Number(selectedStock.changePct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">上游 </span>
                  {relatedInfo.up.length
                    ? relatedInfo.up.map(nameOf).join('、')
                    : '—'}
                </div>
                <div>
                  <span className="text-slate-400">下游 </span>
                  {relatedInfo.down.length
                    ? relatedInfo.down.map(nameOf).join('、')
                    : '—'}
                </div>
                <div>
                  <span className="text-slate-400">競品 </span>
                  {relatedInfo.peers.length
                    ? relatedInfo.peers.map(nameOf).join('、')
                    : '—'}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-medium text-white"
                  onClick={() => router.push(`/stock/${selectedStock.symbol}`)}
                >
                  查看個股
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600"
                  onClick={() => setSelected(null)}
                >
                  清除
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              點擊節點高亮上下游；雙擊或側欄「查看個股」進入詳情。
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
                <li>左邊線顏色＝題材分類</li>
                <li>實線＝供貨關係</li>
                <li>虛線黃＝競品</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
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

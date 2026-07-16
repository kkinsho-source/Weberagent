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

/** S1 產業層級（依 themeSlug 粗分） */
const LAYER_HINTS: Array<{ key: string; label: string; match: (slug?: string) => boolean }> = [
  {
    key: 'mat',
    label: '材料',
    match: (s) => s === 'materials_wafer' || s === 'memory_hbm',
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
    label: '封測/載板',
    match: (s) => s === 'advanced_packaging' || s === 'pcb_ccl',
  },
  {
    key: 'sys',
    label: '系統/周邊',
    match: (s) =>
      s === 'ai_server' || s === 'thermal_power' || s === 'optical_cpo',
  },
];

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
  const [fullscreen, setFullscreen] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

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

  const baseEdges = useMemo(() => {
    return edges.map((e) => {
      const label = String((e as Edge & { label?: string }).label || '');
      const isPeer = label === '競品';
      return {
        ...e,
        label: isPeer ? '競品' : label || '供貨',
        style: {
          stroke: isPeer ? '#f59e0b' : '#94a3b8',
          strokeWidth: isPeer ? 1.5 : 2.2,
          strokeDasharray: isPeer ? '6 4' : undefined,
        },
        labelStyle: { fill: '#64748b', fontSize: 10 },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
      };
    });
  }, [edges]);

  const { styledNodes, styledEdges } = useMemo(() => {
    const related = selected
      ? (() => {
          const s = new Set<string>([selected]);
          edges.forEach((e) => {
            if (e.source === selected) s.add(e.target);
            if (e.target === selected) s.add(e.source);
          });
          return s;
        })()
      : null;

    const sn = nodes.map((n) => ({
      ...n,
      selected: n.id === selected,
      style: related ? { opacity: related.has(n.id) ? 1 : 0.15 } : undefined,
    }));

    const se = baseEdges.map((e) => {
      const hit = selected && (e.source === selected || e.target === selected);
      const hovered = hoverEdge === e.id;
      const isPeer = String((e as Edge & { label?: string }).label) === '競品';
      return {
        ...e,
        animated: Boolean(hit && !isPeer),
        style: {
          ...(e.style as object),
          opacity: related ? (hit ? 1 : 0.08) : hovered ? 1 : 0.85,
          strokeWidth: hovered || hit ? (isPeer ? 2.4 : 3.2) : isPeer ? 1.5 : 2.2,
        },
      };
    });
    return { styledNodes: sn, styledEdges: se };
  }, [nodes, edges, selected, baseEdges, hoverEdge]);

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

  const mapBox = (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white ${
        fullscreen
          ? 'fixed inset-0 z-50 h-full w-full rounded-none border-0'
          : 'h-[min(70vh,560px)] min-h-[300px] w-full sm:h-[480px] sm:min-h-[480px] lg:flex-1'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* S1 層級標籤 */}
      <div className="pointer-events-none absolute bottom-10 left-2 z-10 hidden flex-col gap-1 sm:flex">
        {LAYER_HINTS.map((L) => (
          <span
            key={L.key}
            className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm backdrop-blur"
          >
            {L.label}
          </span>
        ))}
      </div>

      {/* S3 固定圖例 */}
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1 sm:right-3 sm:top-3">
        <div className="rounded-md bg-white/95 px-2 py-1.5 text-[10px] text-slate-600 shadow-sm backdrop-blur">
          <div className="mb-1 font-medium text-slate-700">圖例</div>
          <div className="flex items-center gap-1">
            <i className="h-0.5 w-4 rounded bg-slate-400" /> 供貨
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <i className="h-0.5 w-4 border border-dashed border-amber-400" /> 競品
          </div>
        </div>
        <button
          type="button"
          className="pointer-events-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 shadow-sm hover:bg-slate-50"
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? '退出全螢幕' : '全螢幕'}
        </button>
      </div>

      {title && !fullscreen && (
        <div className="absolute left-2 top-2 z-10 max-w-[55%] truncate rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:text-xs">
          {title}
        </div>
      )}

      {hoverEdge && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-800/90 px-3 py-1 text-[11px] text-white shadow">
          {(() => {
            const e = styledEdges.find((x) => x.id === hoverEdge);
            if (!e) return '';
            const lab = String((e as Edge & { label?: string }).label || '關係');
            return `${nameOf(e.source)} → ${nameOf(e.target)}（${lab}）`;
          })()}
        </div>
      )}

      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeMouseEnter={(_e, edge) => setHoverEdge(edge.id)}
        onEdgeMouseLeave={() => setHoverEdge(null)}
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
        <ZoomToolbar />
        <FitOnMount nodeCount={nodes.length} />
      </ReactFlow>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* 題材色層提示列 */}
      <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">層級</span>
        {LAYER_HINTS.map((L) => {
          const n = nodes.filter((nd) =>
            L.match((nd.data as StockNodeData)?.stock?.themeSlug)
          ).length;
          return (
            <span key={L.key} className="rounded-full bg-slate-100 px-2 py-0.5">
              {L.label}
              {n ? ` ${n}` : ''}
            </span>
          );
        })}
        <span className="text-slate-400">· 供貨線較粗 · hover 顯示關係</span>
      </div>

      <div className={`flex flex-col gap-3 lg:flex-row ${fullscreen ? '' : ''}`}>
        {mapBox}

        {!fullscreen && (
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
                  className={`text-xl font-bold ${
                    selectedStock.changePct >= 0 ? 'text-up' : 'text-down'
                  }`}
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
                    {relatedInfo.up.length ? relatedInfo.up.map(nameOf).join('、') : '—'}
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
                點節點高亮上下游；hover 連線看「誰→誰」；全螢幕可放大檢視。
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs">
                  <li>層級：材料→設計→代工→封測→系統</li>
                  <li>粗實線＝供貨 · 黃虛線＝競品</li>
                </ul>
              </div>
            )}
          </aside>
        )}
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

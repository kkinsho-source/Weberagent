'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeMouseHandler,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StockNode, LaneHeaderNode } from './StockNode';
import type { StockNodeData } from '@/lib/data/graph';
import { themeColor } from '@/lib/data/theme-colors';
import { SWIM_LANES, SWIM_COL_W, laneKeyFor } from '@/lib/data/map-lanes';

const nodeTypes = { stock: StockNode, laneHeader: LaneHeaderNode };

function edgeRelationLabel(e: Edge): string {
  const data = e.data as { relation?: string; relationLabel?: string } | undefined;
  if (data?.relationLabel) return data.relationLabel;
  if (data?.relation === 'competitor') return '競品';
  const lab = String((e as Edge & { label?: string }).label || '');
  return lab || '供貨';
}

function isPeerEdge(e: Edge): boolean {
  return edgeRelationLabel(e) === '競品';
}

/** 層級篩選（頂列 LZ3）；精簡仍可選 */
const LAYER_HINTS: Array<{ key: string; label: string; match: (slug?: string) => boolean }> = [
  {
    key: 'compact',
    label: '精簡',
    match: (s) =>
      s === 'foundry' ||
      s === 'ai_server' ||
      s === 'advanced_packaging' ||
      s === 'ic_design_asic',
  },
  ...SWIM_LANES.filter((L) => L.key !== 'other'),
];

interface Props {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
  title?: string;
  defaultLayer?: string | 'all';
}

function ZoomToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="absolute left-2 top-10 z-10 flex gap-1 sm:left-3 sm:top-12">
      <button
        type="button"
        className="map-hud-btn rounded-lg px-2.5 py-1.5 text-sm font-semibold"
        onClick={() => zoomIn({ duration: 160 })}
        title="放大"
      >
        +
      </button>
      <button
        type="button"
        className="map-hud-btn rounded-lg px-2.5 py-1.5 text-sm font-semibold"
        onClick={() => zoomOut({ duration: 160 })}
        title="縮小"
      >
        −
      </button>
      <button
        type="button"
        className="map-hud-btn rounded-lg px-2 py-1.5 text-[11px] font-medium"
        onClick={() => fitView({ padding: 0.08, minZoom: 0.8, maxZoom: 1.05, duration: 200 })}
        title="置中"
      >
        置中
      </button>
    </div>
  );
}

function FitOnMount({ colCount }: { colCount: number }) {
  const { setViewport } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector('.react-flow') as HTMLElement | null;
      const w = el?.clientWidth ?? 880;
      const contentW = Math.max(1, colCount) * SWIM_COL_W + 32;
      const zoom = Math.min(1, Math.max(0.72, (w - 28) / contentW));
      setViewport({ x: 18, y: 14, zoom }, { duration: 160 });
    }, 50);
    return () => clearTimeout(t);
  }, [setViewport, colCount]);
  return null;
}

function GraphInner({ nodes, edges, title, defaultLayer = 'all' }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | 'all'>(defaultLayer);

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

  const filteredNodes = useMemo(() => {
    if (layerFilter === 'all') return nodes;
    const L = LAYER_HINTS.find((x) => x.key === layerFilter);
    if (!L) return nodes;
    const stocks = nodes.filter((n) => {
      if (n.type === 'laneHeader') return false;
      return L.match((n.data as StockNodeData)?.stock?.themeSlug);
    });
    const laneIds = new Set(
      stocks.map((n) => `lane-${laneKeyFor((n.data as StockNodeData)?.stock?.themeSlug)}`),
    );
    const headers = nodes.filter((n) => n.type === 'laneHeader' && laneIds.has(n.id));
    return [...headers, ...stocks];
  }, [nodes, layerFilter]);

  const filteredEdges = useMemo(() => {
    if (layerFilter === 'all') return edges;
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [edges, filteredNodes, layerFilter]);

  const selectedStock = useMemo(() => {
    if (!selected) return null;
    return (filteredNodes.find((n) => n.id === selected)?.data as StockNodeData | undefined)
      ?.stock;
  }, [filteredNodes, selected]);

  const relatedInfo = useMemo(() => {
    if (!selected) return { up: [] as string[], down: [] as string[], peers: [] as string[] };
    const up: string[] = [];
    const down: string[] = [];
    const peers: string[] = [];
    filteredEdges.forEach((e) => {
      const peer = isPeerEdge(e);
      if (e.target === selected) {
        if (peer) peers.push(e.source);
        else up.push(e.source);
      }
      if (e.source === selected) {
        if (peer) peers.push(e.target);
        else down.push(e.target);
      }
    });
    return { up, down, peers };
  }, [filteredEdges, selected]);

  const baseEdges = useMemo(() => {
    return filteredEdges.map((e) => {
      const isPeer = isPeerEdge(e);
      return {
        ...e,
        label: undefined,
        style: {
          stroke: isPeer ? '#f59e0b' : '#94a3b8',
          strokeWidth: isPeer ? 1.5 : 2.2,
          strokeDasharray: isPeer ? '6 4' : undefined,
        },
      };
    });
  }, [filteredEdges]);

  const { styledNodes, styledEdges } = useMemo(() => {
    const related = selected
      ? (() => {
          const s = new Set<string>([selected]);
          filteredEdges.forEach((e) => {
            if (e.source === selected) s.add(e.target);
            if (e.target === selected) s.add(e.source);
          });
          return s;
        })()
      : null;

    const sn = filteredNodes.map((n) => ({
      ...n,
      selected: n.id === selected,
      style: {
        ...(n.style as object),
        ...(related && n.type !== 'laneHeader'
          ? { opacity: related.has(n.id) ? 1 : 0.18 }
          : {}),
      },
    }));

    const se = baseEdges.map((e) => {
      const hit = selected && (e.source === selected || e.target === selected);
      const hovered = hoverEdge === e.id;
      const isPeer = isPeerEdge(e);
      const showLabel = hovered || Boolean(hit);
      return {
        ...e,
        label: showLabel ? edgeRelationLabel(e) : undefined,
        labelStyle: showLabel
          ? { fill: isPeer ? '#b45309' : '#64748b', fontSize: 10 }
          : undefined,
        labelBgStyle: showLabel ? { fill: '#fff', fillOpacity: 0.92 } : undefined,
        labelBgPadding: showLabel ? ([4, 2] as [number, number]) : undefined,
        animated: Boolean(hit && !isPeer),
        style: {
          ...(e.style as object),
          opacity: related ? (hit ? 1 : 0.08) : hovered ? 1 : 0.85,
          strokeWidth: hovered || hit ? (isPeer ? 2.4 : 3.2) : isPeer ? 1.5 : 2.2,
        },
      };
    });
    return { styledNodes: sn, styledEdges: se };
  }, [filteredNodes, filteredEdges, selected, baseEdges, hoverEdge]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    if (node.type === 'laneHeader') return;
    setSelected((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.type === 'laneHeader') return;
      router.push(`/stock/${node.id}`);
    },
    [router]
  );

  const nameOf = (sym: string) =>
    (filteredNodes.find((n) => n.id === sym)?.data as StockNodeData | undefined)?.stock?.name ||
    (nodes.find((n) => n.id === sym)?.data as StockNodeData | undefined)?.stock?.name ||
    sym;

  const mapBox = (
    <div
      className={`relative overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-[#1a1024] ${
        fullscreen
          ? 'fixed inset-0 z-50 h-full w-full rounded-none border-0'
          : 'h-[min(78vh,640px)] min-h-[320px] w-full sm:h-[560px] sm:min-h-[520px] lg:flex-1'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* S3 固定圖例 */}
      <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-1 sm:right-3 sm:top-3">
        <div className="map-hud-panel rounded-xl px-3 py-2 text-[12px]">
          <div className="map-hud-title mb-1.5 text-[11px] font-semibold tracking-wide">圖例</div>
          <div className="flex items-center gap-2 text-fuchsia-50">
            <i className="h-0.5 w-5 rounded bg-fuchsia-300" /> 供貨
          </div>
          <div className="mt-1 flex items-center gap-2 text-fuchsia-50">
            <i className="h-0.5 w-5 border-t-2 border-dashed border-amber-300" /> 競品
          </div>
        </div>
        <button
          type="button"
          className="map-hud-btn pointer-events-auto rounded-xl px-2.5 py-1.5 text-[12px]"
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
            const lab = e ? edgeRelationLabel(e) : '關係';
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
        fitView={false}
        proOptions={{ hideAttribution: true }}
        minZoom={0.55}
        maxZoom={1.8}
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
        <Background color="rgba(232,121,249,0.28)" gap={isMobile ? 20 : 16} size={1} />
        <ZoomToolbar />
        <FitOnMount
          colCount={
            filteredNodes.filter((n) => n.type === 'laneHeader').length ||
            SWIM_LANES.filter((L) => L.key !== 'other').length
          }
        />
      </ReactFlow>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* 題材色層提示列 */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs font-semibold tracking-wide text-fuchsia-200/80">層級</span>
        <button
          type="button"
          className={`rounded-xl px-3 py-1.5 text-sm ${layerFilter === 'all' ? 'bg-fuchsia-500 text-[#120814]' : 'bg-[#24162f] text-fuchsia-100/80 hover:bg-fuchsia-500/15'}`}
          onClick={() => setLayerFilter('all')}
        >
          全部
        </button>
        {LAYER_HINTS.map((L) => {
          const n = nodes.filter((nd) =>
            L.match((nd.data as StockNodeData)?.stock?.themeSlug)
          ).length;
          return (
            <button
              key={L.key}
              type="button"
              className={`rounded-xl px-3 py-1.5 text-sm ${
                layerFilter === L.key
                  ? 'bg-fuchsia-500 text-[#120814]'
                  : 'bg-[#24162f] text-fuchsia-100/80 hover:bg-fuchsia-500/15'
              }`}
              onClick={() => setLayerFilter(L.key)}
            >
              {L.label}
              {n ? ` ${n}` : ''}
            </button>
          );
        })}
        <span className="text-[11px] text-fuchsia-200/40">左右是上游→下游 · 可上下拖 · hover 看關係</span>
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

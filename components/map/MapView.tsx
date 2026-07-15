'use client';

import dynamic from 'next/dynamic';
import type { Node, Edge } from '@xyflow/react';
import type { StockNodeData } from '@/lib/data/graph';

// React Flow 依賴 window，必須關閉 SSR
const SupplyChainGraph = dynamic(
  () => import('./SupplyChainGraph').then((m) => m.SupplyChainGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] min-h-[300px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400 sm:h-[480px]">
        載入供應鏈地圖中…
      </div>
    ),
  },
);

interface Props {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
  title?: string;
}

export function MapView({ nodes, edges, title }: Props) {
  return <SupplyChainGraph nodes={nodes} edges={edges} title={title} />;
}

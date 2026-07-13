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
      <div className="flex h-[480px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        載入供應鏈地圖中…
      </div>
    ),
  },
);

interface Props {
  nodes: Node<StockNodeData>[];
  edges: Edge[];
}

export function MapView({ nodes, edges }: Props) {
  return <SupplyChainGraph nodes={nodes} edges={edges} />;
}

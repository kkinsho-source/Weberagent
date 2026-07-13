'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StockNodeData } from '@/lib/data/graph';

export function StockNode({ data, selected }: NodeProps) {
  // v12: NodeProps 已不再攜帶泛型時直接取 data；data 為未知型別時轉型
  const stock = (data as StockNodeData).stock;
  const up = stock.changePct >= 0;
  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 text-xs shadow-sm transition ${
        selected ? 'border-brand-600 ring-2 ring-brand-200' : 'border-slate-200'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-slate-400" />
      <div className="font-semibold text-slate-800">{stock.name}</div>
      <div className="text-slate-400">{stock.symbol}</div>
      <div className={`font-bold ${up ? 'text-up' : 'text-down'}`}>
        {stock.price.toLocaleString()}
        <span className="ml-1 text-[10px]">
          {up ? '+' : ''}
          {stock.changePct.toFixed(2)}%
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-slate-400" />
    </div>
  );
}

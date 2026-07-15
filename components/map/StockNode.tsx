'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StockNodeData } from '@/lib/data/graph';

export function StockNode({ data, selected }: NodeProps) {
  const stock = (data as StockNodeData).stock;
  const up = stock.changePct >= 0;
  return (
    <div
      className={`rounded-lg border bg-white px-2.5 py-1.5 text-[11px] shadow-sm transition sm:px-3 sm:py-2 sm:text-xs ${
        selected
          ? 'border-brand-600 ring-2 ring-brand-200'
          : 'border-slate-200 active:border-brand-400'
      }`}
      style={{ minWidth: 108 }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-slate-400 !border-0"
      />
      <div className="max-w-[7.5rem] truncate font-semibold text-slate-800">{stock.name}</div>
      <div className="text-slate-400">{stock.symbol}</div>
      <div className={`font-bold tabular-nums ${up ? 'text-up' : 'text-down'}`}>
        {Number(stock.price || 0).toLocaleString()}
        <span className="ml-1 text-[10px] font-semibold">
          {up ? '+' : ''}
          {Number(stock.changePct || 0).toFixed(2)}%
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-slate-400 !border-0"
      />
    </div>
  );
}

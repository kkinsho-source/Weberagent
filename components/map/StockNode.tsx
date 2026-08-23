'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StockNodeData } from '@/lib/data/graph';
import { themeColor } from '@/lib/data/theme-colors';

export function StockNode({ data, selected }: NodeProps) {
  const stock = (data as StockNodeData).stock;
  if (!stock) return null;
  const up = stock.changePct >= 0;
  const accent = themeColor(stock.themeSlug || '');
  return (
    <div
      className={`stock-node-hud rounded-xl border px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:py-2 sm:text-xs ${
        selected ? 'ring-2 ring-fuchsia-400/70' : ''
      }`}
      style={{
        minWidth: 156,
        background: '#1a1024',
        borderColor: selected ? accent : 'rgba(232,121,249,0.28)',
        borderLeftWidth: 3,
        borderLeftColor: accent,
        boxShadow: selected ? `0 0 16px ${accent}55` : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-fuchsia-400/50" />
      <div className="max-w-[9rem] truncate font-semibold text-fuchsia-50">{stock.name}</div>
      <div className="font-cyber text-[10px] text-fuchsia-200/55">{stock.symbol}</div>
      <div className={`font-bold tabular-nums ${up ? 'text-up' : 'text-down'}`}>
        {Number(stock.price || 0).toLocaleString()}
        <span className="ml-1 text-[10px] font-semibold">
          {up ? '+' : ''}
          {Number(stock.changePct || 0).toFixed(2)}%
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-fuchsia-400/50" />
    </div>
  );
}

export function LaneHeaderNode({ data }: NodeProps) {
  const label = (data as StockNodeData).laneLabel || '';
  return (
    <div className="w-[168px] border-b border-fuchsia-400/25 pb-1 font-cyber text-[11px] font-semibold tracking-wider text-fuchsia-200/80">
      {label}
    </div>
  );
}

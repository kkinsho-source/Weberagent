'use client';

import { useState, type ReactNode } from 'react';

/** G5：進階圖表摺疊 */
export function AdvancedChartsAccordion({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <span>進階圖表（純籌碼泡泡 · 純相對強弱 · 舊版回放）</span>
        <span className="text-slate-400">{open ? '收起 ▴' : '展開 ▾'}</span>
      </button>
      {open ? <div className="space-y-6 border-t border-slate-200 px-3 py-4 sm:px-4">{children}</div> : null}
    </div>
  );
}

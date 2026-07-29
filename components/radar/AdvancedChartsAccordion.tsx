'use client';

import { useState, type ReactNode } from 'react';

/** 進階圖表摺疊：與主圖差在哪一句說清楚 */
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
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-700">進階圖表</span>
          <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-slate-400">
            主圖是籌碼×價綜合位置；這裡可拆開看純法人與純相對強弱。
          </span>
        </span>
        <span className="shrink-0 text-xs text-slate-400">{open ? '收起 ▴' : '展開 ▾'}</span>
      </button>
      {open ? (
        <div className="space-y-8 border-t border-slate-200 px-3 py-4 sm:px-4">{children}</div>
      ) : null}
    </div>
  );
}

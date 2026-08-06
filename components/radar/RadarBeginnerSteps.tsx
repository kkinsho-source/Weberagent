'use client';

import { useEffect, useState } from 'react';

const KEY = 'radar-steps-dismissed-v1';

/** 頁頂簡短閱讀順序（可關；不標「新手」） */
export function RadarBeginnerSteps() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // 僅首次進站預設展開；關過就維持收起
      if (typeof window !== 'undefined' && !localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate-500 hover:text-cyan-300 hover:underline"
      >
        本頁怎麼看
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs leading-relaxed text-slate-400">
          <span className="font-medium text-slate-200">建議順序：</span>
          今日重點 → 熱區圖落點 → 點圓點看詳情；回放可看最近移動。
          位置是相對比較，非買賣建議。
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md px-2 py-0.5 text-xs text-slate-400 hover:bg-white hover:text-slate-600"
        >
          收起
        </button>
      </div>
    </div>
  );
}

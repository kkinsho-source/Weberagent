'use client';

import { useEffect, useState } from 'react';

const KEY = 'radar-howto-dismissed-v2';

/** 圖上怎麼看（與四區上色一致；v2 避免舊錯誤文案 localStorage） */
export function RadarHowTo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem(KEY)) setOpen(true);
    } catch {
      setOpen(true);
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
        className="text-xs font-medium text-brand-600 hover:underline"
      >
        圖例說明
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">泡泡圖怎麼讀</h3>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md px-2 py-0.5 text-xs text-slate-500 hover:bg-white"
        >
          收起
        </button>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {[
          { t: '中心＝普通', d: '籌與價都不特別強也不特別弱' },
          { t: '顏色＝所在區域', d: '紅熱／琥珀觀察／紫降溫／灰冷（不是越紅越好）' },
          { t: '往右', d: '法人籌碼相對偏買（錢比較有進）' },
          { t: '往上', d: '價相對偏強（短動能／相對強弱）' },
          { t: '泡泡大小', d: '近幾日籌碼規模略大者較大' },
          { t: '表格 S 分', d: '綜合排序分 0–100，方便排行，不是報酬預測' },
        ].map((c) => (
          <div key={c.t} className="rounded-lg bg-white px-2.5 py-2 text-xs ring-1 ring-slate-100">
            <div className="font-semibold text-slate-800">{c.t}</div>
            <div className="mt-0.5 text-slate-500">{c.d}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        僅供研究描述；非投資建議。
      </p>
    </div>
  );
}

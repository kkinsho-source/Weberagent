'use client';

import { useEffect, useMemo, useState } from 'react';

const KEY = 'radar-howto-dismissed-v1';

/** U6：首次 怎麼看（可關閉，localStorage） */
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
        怎麼看這張圖？
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">10 秒看懂資金雷達</h3>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md px-2 py-0.5 text-xs text-slate-500 hover:bg-white"
        >
          知道了
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: '中心 (0,0)＝普通', d: 'C100：籌也不強、價也不特別' },
          { t: '右上＝熱區', d: '錢偏有進，價也相對強' },
          { t: '左上＝觀察', d: '價先動，籌還沒明顯' },
          { t: '右下／左下', d: '降溫或雙弱，偏冷敘事' },
        ].map((c) => (
          <div key={c.t} className="rounded-lg bg-white/90 px-3 py-2 text-xs">
            <div className="font-semibold text-slate-800">{c.t}</div>
            <div className="mt-0.5 text-slate-500">{c.d}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        顏色越偏紅＝綜合分 S 越高（在目前篩選下的相對位置）。這是描述統計，不是買賣點。
      </p>
    </div>
  );
}

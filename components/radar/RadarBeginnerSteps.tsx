'use client';

import { useEffect, useState } from 'react';

const KEY = 'radar-steps-dismissed-v1';

/** R3：頁頂三步怎麼用（初學者導覽） */
export function RadarBeginnerSteps() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(KEY)) setOpen(false);
    } catch {
      /* keep open */
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
        顯示：三步怎麼用
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/90 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">三步看懂本頁</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            不用先懂專有名詞。這頁在看：哪個題材最近「錢比較有進、價相對有沒有變強」。
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white"
        >
          知道了，收起
        </button>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          {
            n: '1',
            t: '先看「今日重點」',
            d: '法人今天買超／賣超集中在哪些題材，30 秒抓方向。',
          },
          {
            n: '2',
            t: '再看泡泡在哪一區',
            d: '右上偏熱、左上觀察、右下可能降溫、左下偏冷。中心＝普通。',
          },
          {
            n: '3',
            t: '點泡泡看詳情',
            d: '右側會出現說明與題材連結。回放可看「最近怎麼移動」。',
          },
        ].map((s) => (
          <li
            key={s.n}
            className="flex gap-3 rounded-xl border border-white bg-white/90 px-3 py-3 shadow-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {s.n}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">{s.t}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-slate-400">
        位置是「和其他題材比」的相對結果，不是買賣建議。
      </p>
    </div>
  );
}

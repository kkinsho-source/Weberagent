'use client';

import { useState } from 'react';

const TERMS: Array<{ key: string; title: string; body: string }> = [
  {
    key: 'hot',
    title: '熱區（右上）',
    body: '相對其他題材，錢比較有進、價也相對偏強。是「敘事上較熱」，不是保證會漲。',
  },
  {
    key: 'watch',
    title: '觀察（左上）',
    body: '價相對先動，籌碼還沒明顯跟上。可能是領先，也可能假突破，宜再對照。',
  },
  {
    key: 'cool',
    title: '降溫（右下）',
    body: '籌碼仍偏有、但價相對偏弱。常見於「錢還在但力道變弱」的階段。',
  },
  {
    key: 'cold',
    title: '冷區（左下）',
    body: '籌碼與價都相對偏弱。可能是休息或退潮，不代表永遠不重要。',
  },
  {
    key: 's',
    title: 'S 分（綜合排序）',
    body: '0–100 的綜合分數，方便排行。權重可在進階選項調整（偏籌碼／均衡／偏價）。不是報酬預測。',
  },
  {
    key: 'res',
    title: '共振★',
    body: '近幾日籌碼淨流入，且價象限落在「領先／改善」。僅統計標註，不是買賣訊號。',
  },
  {
    key: 'inst',
    title: '法人／籌碼',
    body: '外資、投信、自營等三大法人買賣超，彙整成題材淨額（估算）。來源為公開盤後資料。',
  },
  {
    key: 'rs',
    title: '價相對強弱',
    body: '題材相對大盤／股池的表現強弱（簡化模型）。主圖用中期、回放縱軸用當日短動能，略有不同。',
  },
];

/** R12：名詞小辭典，點開才看 */
export function RadarGlossary() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-800">名詞小辭典</h2>
          <p className="mt-0.5 text-xs text-slate-400">熱區、S 分、共振、法人…點開看白話</p>
        </div>
        <span className="text-xs text-slate-400">{open ? '收起 ▴' : '展開 ▾'}</span>
      </button>
      {open ? (
        <div className="grid gap-2 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
          {TERMS.map((t) => (
            <div
              key={t.key}
              className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed"
            >
              <div className="font-semibold text-slate-800">{t.title}</div>
              <p className="mt-1 text-slate-600">{t.body}</p>
            </div>
          ))}
          <p className="sm:col-span-2 text-[11px] text-slate-400">
            以上皆為描述用詞，不構成投資建議。
          </p>
        </div>
      ) : null}
    </div>
  );
}

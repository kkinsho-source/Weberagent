'use client';

import { useState } from 'react';
import Link from 'next/link';

export type DualRow = {
  slug: string;
  title: string;
  tideLabel: string;
  net5dYi: number;
  quadrantLabel: string;
  rsRatio: number;
  resonance: boolean;
};

/** R4：進階對照表，預設摺疊 */
export function DualAxisTable({ rows }: { rows: DualRow[] }) {
  const [open, setOpen] = useState(false);
  if (!rows.length) return null;
  const res = rows.filter((r) => r.resonance);

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-slate-900/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-cyan-50">進階對照表</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            籌碼四態 × 價象限一覽
            {res.length ? ` · 目前 ${res.length} 題材標示共振★` : ''}
            （可選看）
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-500">{open ? '收起 ▴' : '展開 ▾'}</span>
      </button>
      {open ? (
        <div className="border-t border-cyan-500/10 px-4 pb-4">
          <p className="mt-3 text-xs text-slate-400">
            共振＝近5日籌碼淨流入，且價象限為「領先／改善」。統計描述，非買賣建議。
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-950/80 text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">題材</th>
                  <th className="px-2 py-1.5">籌碼狀態</th>
                  <th className="px-2 py-1.5 text-right">5日（億）</th>
                  <th className="px-2 py-1.5">價象限</th>
                  <th className="px-2 py-1.5 text-right">相對強弱</th>
                  <th className="px-2 py-1.5">共振</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-t border-slate-800">
                    <td className="px-2 py-1.5">
                      <Link
                        href={`/themes/${r.slug}?from=radar`}
                        className="font-medium text-cyan-300 hover:underline"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-slate-400">{r.tideLabel}</td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums ${
                        r.net5dYi >= 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {r.net5dYi >= 0 ? '+' : ''}
                      {r.net5dYi.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-300">{r.quadrantLabel}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">
                      {r.rsRatio.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5">
                      {r.resonance ? (
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-medium text-rose-300">
                          ★
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

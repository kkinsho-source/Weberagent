'use client';

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

/** 籌碼 × 價動能交叉表 */
export function DualAxisTable({ rows }: { rows: DualRow[] }) {
  if (!rows.length) return null;
  const res = rows.filter((r) => r.resonance);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800">雙軸摘要</h2>
      <p className="mt-1 text-xs text-slate-400">
        共振＝近5日籌碼淨流入 且 價象限為「領先／改善」。僅統計描述，非買賣建議。
        {res.length ? ` 目前 ${res.length} 個題材符合共振。` : ''}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-2 py-1.5">題材</th>
              <th className="px-2 py-1.5">籌碼四態</th>
              <th className="px-2 py-1.5 text-right">5日億</th>
              <th className="px-2 py-1.5">價象限</th>
              <th className="px-2 py-1.5 text-right">RS</th>
              <th className="px-2 py-1.5">共振</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-slate-100">
                <td className="px-2 py-1.5">
                  <Link href={`/themes/${r.slug}`} className="font-medium text-brand-700 hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-2 py-1.5 text-slate-600">{r.tideLabel}</td>
                <td
                  className={`px-2 py-1.5 text-right tabular-nums ${r.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}
                >
                  {r.net5dYi >= 0 ? '+' : ''}
                  {r.net5dYi.toFixed(1)}
                </td>
                <td className="px-2 py-1.5">{r.quadrantLabel}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.rsRatio.toFixed(1)}</td>
                <td className="px-2 py-1.5">
                  {r.resonance ? (
                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">
                      ★
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { ZONE_META, type CompositeRow } from '@/lib/data/theme-composite';

/** U8 點泡泡側欄 */
export function BubbleDetailPanel({
  row,
  onClose,
}: {
  row: CompositeRow;
  onClose: () => void;
}) {
  const z = ZONE_META[row.zone];
  return (
    <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-72">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-800">{row.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {z.corner} · {z.label}（{z.blurb}）
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-0.5 text-xs text-slate-500 hover:bg-white"
        >
          關閉
        </button>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">綜合分 S</dt>
          <dd className="font-semibold tabular-nums text-slate-800">{row.scoreS.toFixed(1)}</dd>
        </div>
          <div className="text-xs text-slate-500">
            籌碼 / 價動能為 C100（−100～+100，0＝中性）
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">籌碼 C100</dt>
            <dd className="tabular-nums">
              {row.flowScore > 0 ? '+' : ''}
              {row.flowScore.toFixed(0)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-slate-500">價動能 C100</dt>
            <dd className="tabular-nums">
              {row.priceScore == null
                ? '—'
                : `${row.priceScore > 0 ? '+' : ''}${row.priceScore.toFixed(0)}`}
            </dd>
          </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">近5日法人</dt>
          <dd className={`tabular-nums ${row.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {row.net5dYi >= 0 ? '+' : ''}
            {row.net5dYi.toFixed(2)} 億
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">籌碼四態</dt>
          <dd>{row.tideLabel}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">價象限</dt>
          <dd>{row.quadrantLabel}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">共振</dt>
          <dd>{row.resonance ? '★ 是' : '否'}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">成分檔數</dt>
          <dd>{row.stockCount}</dd>
        </div>
      </dl>
      <Link
        href={`/themes/${row.slug}`}
        className="mt-4 block rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
      >
        看題材與成分股
      </Link>
      <p className="mt-2 text-[10px] text-slate-400">相對位置描述，非投資建議。</p>
    </aside>
  );
}

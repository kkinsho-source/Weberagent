import Link from 'next/link';
import { ZONE_META, type CompositeZone } from '@/lib/data/theme-composite';

/** 題材頁：在資金雷達的相對位置摘要（B/D） */
export function ThemeRadarContext({
  title,
  zone,
  zoneLabel,
  zoneBlurb,
  scoreS,
  flowScore,
  priceScore,
  net5dYi,
  resonance,
  rank,
  total,
  asOf,
}: {
  title: string;
  zone: CompositeZone;
  zoneLabel: string;
  zoneBlurb: string;
  scoreS: number;
  flowScore: number;
  priceScore: number | null;
  net5dYi: number;
  resonance: boolean;
  rank: number | null;
  total: number;
  asOf: string | null;
}) {
  const z = ZONE_META[zone];
  const fmt = (n: number | null) => {
    if (n == null || !Number.isFinite(n)) return '—';
    return `${n > 0 ? '+' : ''}${n.toFixed(0)}`;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">在資金雷達上的位置</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            與其他題材比較後的相對位置
            {asOf ? ` · 資料日 ${asOf}` : ''}
            {rank != null ? ` · 綜合排序第 ${rank} / ${total}` : ''}
          </p>
        </div>
        <Link
          href="/radar"
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          打開資金雷達 →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${z.badgeBg}`}
        >
          {zoneLabel}
        </span>
        <span className="text-xs text-slate-500">{zoneBlurb}</span>
        {resonance ? (
          <span className="rounded bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
            共振★
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini k="綜合排序" v={scoreS.toFixed(1)} />
        <Mini k="籌碼位置" v={fmt(flowScore)} />
        <Mini k="價位置" v={fmt(priceScore)} />
        <Mini
          k="近5日法人"
          v={`${net5dYi >= 0 ? '+' : ''}${net5dYi.toFixed(2)} 億`}
          tone={net5dYi >= 0 ? 'up' : 'down'}
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {title}：以上為相對描述，非買賣建議。
      </p>
    </section>
  );
}

function Mini({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone?: 'up' | 'down';
}) {
  const c =
    tone === 'up' ? 'text-rose-600' : tone === 'down' ? 'text-emerald-700' : 'text-slate-800';
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-400">{k}</div>
      <div className={`text-sm font-semibold tabular-nums ${c}`}>{v}</div>
    </div>
  );
}

import Link from 'next/link';
import type { ThemeFlowBrief } from '@/lib/data/theme-flow';

function fmtYi(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}億`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function RadarTodayBrief({ brief }: { brief: ThemeFlowBrief }) {
  return (
    <section className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">今日重點</h2>
        <span className="text-xs text-slate-400">資料日 {brief.asOf || '—'}</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">{brief.summary}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <BriefCol
          title="法人買超 Top"
          items={brief.topBuy1d.map((t) => ({
            slug: t.slug,
            title: t.title,
            primary: fmtYi(t.net1dYi),
            secondary: `成分均 ${fmtPct(t.avgChangePct)}`,
            positive: true,
          }))}
        />
        <BriefCol
          title="法人賣超 Top"
          items={brief.topSell1d.map((t) => ({
            slug: t.slug,
            title: t.title,
            primary: fmtYi(t.net1dYi),
            secondary: `成分均 ${fmtPct(t.avgChangePct)}`,
            positive: false,
          }))}
        />
        <BriefCol
          title="昨日買超 · 今日回顧"
          items={brief.prevBuyReview.map((t) => ({
            slug: t.slug,
            title: t.title,
            primary: fmtPct(t.avgChangePct),
            secondary: `昨淨額 ${fmtYi(t.netPrev1dYi)}`,
            positive: (t.avgChangePct ?? 0) >= 0,
          }))}
          emptyHint="需至少兩個交易日法人快取"
        />
      </div>
    </section>
  );
}

function BriefCol({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: Array<{
    slug: string;
    title: string;
    primary: string;
    secondary: string;
    positive: boolean;
  }>;
  emptyHint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 p-3">
      <div className="text-xs font-medium text-slate-500">{title}</div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{emptyHint || '—'}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((it, i) => (
            <li key={it.slug} className="flex items-start justify-between gap-2 text-sm">
              <Link href={`/themes/${it.slug}`} className="min-w-0 font-medium text-slate-800 hover:text-brand-600">
                <span className="mr-1 text-xs text-slate-400">{i + 1}.</span>
                {it.title}
              </Link>
              <div className="shrink-0 text-right">
                <div className={`tabular-nums text-xs font-semibold ${it.positive ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {it.primary}
                </div>
                <div className="text-[10px] text-slate-400">{it.secondary}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from 'next/link';
import type { ThemeFlowBrief } from '@/lib/data/theme-flow';

function fmtYi(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/** 今日重點：區塊化排版，避免長文牆 */
export function RadarTodayBrief({ brief }: { brief: ThemeFlowBrief }) {
  const reviewAvg = (() => {
    const vals = brief.prevBuyReview
      .map((p) => p.avgChangePct)
      .filter((x): x is number => x != null && Number.isFinite(x));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();
  const reviewBest = [...brief.prevBuyReview].sort(
    (a, b) => (b.avgChangePct ?? -999) - (a.avgChangePct ?? -999),
  )[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.06)]">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600/90 text-sm font-semibold text-slate-950">
            ◎
          </span>
          <div>
            <h2 className="text-base font-semibold text-cyan-50">今日重點</h2>
            <p className="text-[11px] text-slate-500">盤後法人籌碼速覽 · 非投資建議</p>
          </div>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-slate-900 px-3 py-1 text-xs font-medium tabular-nums text-cyan-200/90">
          資料日 {brief.asOf || '—'}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* 三欄主內容 */}
        <div className="grid gap-3 md:grid-cols-3">
          <BriefCol
            tone="buy"
            title="法人買超"
            subtitle="今日淨額 Top"
            items={brief.topBuy1d.map((t) => ({
              slug: t.slug,
              title: t.title,
              primary: `${fmtYi(t.net1dYi)} 億`,
              secondary: `成分均 ${fmtPct(t.avgChangePct)}`,
              positive: true,
            }))}
          />
          <BriefCol
            tone="sell"
            title="法人賣超"
            subtitle="今日淨額 Top"
            items={brief.topSell1d.map((t) => ({
              slug: t.slug,
              title: t.title,
              primary: `${fmtYi(t.net1dYi)} 億`,
              secondary: `成分均 ${fmtPct(t.avgChangePct)}`,
              positive: false,
            }))}
          />
          <BriefCol
            tone="review"
            title="昨日買超回顧"
            subtitle="今日成分表現"
            items={brief.prevBuyReview.map((t) => ({
              slug: t.slug,
              title: t.title,
              primary: fmtPct(t.avgChangePct),
              secondary: `昨淨額 ${fmtYi(t.netPrev1dYi)} 億`,
              positive: (t.avgChangePct ?? 0) >= 0,
            }))}
            emptyHint="需至少兩個交易日資料"
          />
        </div>

        {/* 補充資訊：短列，不要長段落 */}
        <div className="grid gap-2 sm:grid-cols-2">
          {reviewAvg != null ? (
            <div className="flex items-start gap-2 rounded-xl border border-cyan-500/10 bg-slate-950/50 px-3 py-2.5">
              <span className="mt-0.5 text-sm">↩</span>
              <div className="min-w-0 text-xs leading-relaxed text-slate-400">
                <span className="font-medium text-slate-200">回顧摘要</span>
                <span className="mt-0.5 block">
                  昨買超題材今日成分均{' '}
                  <strong className={reviewAvg >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {fmtPct(reviewAvg)}
                  </strong>
                  {reviewBest?.avgChangePct != null ? (
                    <>
                      ，最佳{' '}
                      <Link
                        href={`/themes/${reviewBest.slug}?from=radar`}
                        className="font-medium text-cyan-300 hover:underline"
                      >
                        {reviewBest.title}
                      </Link>{' '}
                      {fmtPct(reviewBest.avgChangePct)}
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          ) : null}

          {brief.tideLeaders.length > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/15 bg-rose-950/20 px-3 py-2.5">
              <span className="mt-0.5 text-sm">🌊</span>
              <div className="min-w-0 text-xs leading-relaxed text-slate-400">
                <span className="font-medium text-slate-200">近 5 日偏「漲潮」</span>
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  {brief.tideLeaders.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/themes/${t.slug}?from=radar`}
                      className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 font-medium text-rose-300 ring-1 ring-rose-500/20 hover:bg-slate-800"
                    >
                      {t.title}
                      <span className="ml-1 tabular-nums text-[10px] text-rose-400">
                        {fmtYi(t.net5dYi)}億
                      </span>
                    </Link>
                  ))}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <p className="text-[11px] text-slate-500">
          金額為法人淨股數 × 最新收盤之估算（億）。公開資料彙整，非投資建議。
        </p>
      </div>
    </section>
  );
}

function BriefCol({
  tone,
  title,
  subtitle,
  items,
  emptyHint,
}: {
  tone: 'buy' | 'sell' | 'review';
  title: string;
  subtitle: string;
  items: Array<{
    slug: string;
    title: string;
    primary: string;
    secondary: string;
    positive: boolean;
  }>;
  emptyHint?: string;
}) {
  const head =
    tone === 'buy'
      ? 'border-rose-500/20 bg-rose-950/35 text-rose-100'
      : tone === 'sell'
        ? 'border-emerald-500/20 bg-emerald-950/35 text-emerald-100'
        : 'border-sky-500/20 bg-sky-950/35 text-sky-100';
  const badge =
    tone === 'buy'
      ? 'bg-rose-500 text-white'
      : tone === 'sell'
        ? 'bg-emerald-600 text-white'
        : 'bg-sky-600 text-white';

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-cyan-500/10 bg-slate-950/60 ring-1 ring-white/5">
      <div className={`border-b px-3 py-2 ${head}`}>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] opacity-70">{subtitle}</div>
      </div>
      <div className="flex-1 px-2 py-2">
        {items.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-slate-500">{emptyHint || '—'}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={it.slug}>
                <Link
                  href={`/themes/${it.slug}?from=radar`}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-800/70"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${badge}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-100">{it.title}</div>
                    <div className="text-[10px] text-slate-500">{it.secondary}</div>
                  </div>
                  <div
                    className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
                      it.positive ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {it.primary}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

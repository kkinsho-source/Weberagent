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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            ◎
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-800">今日重點</h2>
            <p className="text-[11px] text-slate-400">盤後法人籌碼速覽 · 非投資建議</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tabular-nums text-slate-600">
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
            <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="mt-0.5 text-sm">↩</span>
              <div className="min-w-0 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">回顧摘要</span>
                <span className="mt-0.5 block">
                  昨買超題材今日成分均{' '}
                  <strong className={reviewAvg >= 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {fmtPct(reviewAvg)}
                  </strong>
                  {reviewBest?.avgChangePct != null ? (
                    <>
                      ，最佳{' '}
                      <Link
                        href={`/themes/${reviewBest.slug}`}
                        className="font-medium text-brand-700 hover:underline"
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
            <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
              <span className="mt-0.5 text-sm">🌊</span>
              <div className="min-w-0 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">近 5 日偏「漲潮」</span>
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  {brief.tideLeaders.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/themes/${t.slug}`}
                      className="inline-flex items-center rounded-full bg-white px-2 py-0.5 font-medium text-rose-700 ring-1 ring-rose-100 hover:bg-rose-50"
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

        <p className="text-[11px] text-slate-400">
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
      ? 'border-rose-100 bg-rose-50/60 text-rose-900'
      : tone === 'sell'
        ? 'border-emerald-100 bg-emerald-50/60 text-emerald-900'
        : 'border-sky-100 bg-sky-50/60 text-sky-900';
  const badge =
    tone === 'buy'
      ? 'bg-rose-600 text-white'
      : tone === 'sell'
        ? 'bg-emerald-700 text-white'
        : 'bg-sky-600 text-white';

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-150 bg-white shadow-sm ring-1 ring-slate-100">
      <div className={`border-b px-3 py-2 ${head}`}>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] opacity-70">{subtitle}</div>
      </div>
      <div className="flex-1 px-2 py-2">
        {items.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-slate-400">{emptyHint || '—'}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={it.slug}>
                <Link
                  href={`/themes/${it.slug}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${badge}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{it.title}</div>
                    <div className="text-[10px] text-slate-400">{it.secondary}</div>
                  </div>
                  <div
                    className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
                      it.positive ? 'text-rose-600' : 'text-emerald-700'
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

'use client';

import { useEffect, useState } from 'react';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';

type NewsItem = { title: string; link: string; pubDate?: string; source: string };
type OfficialItem = {
  symbol: string;
  companyName: string;
  speakDate: string;
  speakTime: string;
  title: string;
  content: string;
  source: string;
};

/** N0+N1：官方公告（MOPS/證交所）與外鏈新聞分區必顯示 */
export function NewsPanel({ symbol, name }: { symbol: string; name: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [official, setOfficial] = useState<OfficialItem[]>([]);
  const [officialSource, setOfficialSource] = useState('');
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingOfficial, setLoadingOfficial] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingNews(true);
      setLoadingOfficial(true);
      try {
        const [prof, mops] = await Promise.all([
          fetch(`/api/stock-profile/${symbol}`, { cache: 'no-store' }),
          fetch(`/api/v1/mops?symbol=${encodeURIComponent(symbol)}&limit=30`, {
            cache: 'no-store',
          }),
        ]);
        const pj = await prof.json();
        const mj = await mops.json();
        if (cancelled) return;
        setNews(pj.news || []);
        setOfficial(mj.items || []);
        setOfficialSource(mj.dataSource || '');
      } catch {
        if (!cancelled) {
          setNews([]);
          setOfficial([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingNews(false);
          setLoadingOfficial(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="space-y-8">
      {/* 官方：MOPS + 證交所 OpenAPI（後端已合併） */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            官方公告（MOPS / 證交所）
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            source: {officialSource || (loadingOfficial ? '…' : '—')}
          </span>
        </div>

        {loadingOfficial && (
          <p className="text-sm text-slate-400">載入官方公告…</p>
        )}

        {!loadingOfficial && official.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            目前沒有 {symbol} 的官方重大訊息（DB + 證交所當日 OpenAPI 皆無）。
            可稍後再試，或看下方媒體外鏈。
          </div>
        )}

        {!loadingOfficial && official.length > 0 && (
          <ul className="space-y-2">
            {official.map((it, idx) => (
              <li
                key={`${it.speakDate}-${it.speakTime}-${idx}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="font-medium text-brand-600">
                    {it.symbol} {it.companyName}
                  </span>
                  <span>
                    {it.speakDate} {it.speakTime}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 text-slate-500">
                    {it.source?.includes('OpenAPI') ? '證交所 OpenAPI' : 'MOPS'}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-800">{it.title}</div>
                {it.content && (
                  <p className="mt-2 max-h-24 overflow-hidden text-xs leading-relaxed text-slate-500 whitespace-pre-wrap">
                    {it.content.slice(0, 280)}
                    {it.content.length > 280 ? '…' : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* 完整篩選 UI 仍可用 */}
        <details className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <summary className="cursor-pointer text-xs text-slate-500">
            進階：完整公告篩選（關鍵字）
          </summary>
          <div className="mt-3">
            <MopsAnnouncementsPanel initialSymbol={symbol} />
          </div>
        </details>
      </section>

      {/* 外鏈媒體 */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">媒體外鏈新聞</h3>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
            僅標題外連 · 非全文轉載
          </span>
        </div>

        {loadingNews && <p className="text-sm text-slate-400">載入外鏈新聞…</p>}

        {!loadingNews && news.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            暫無外鏈新聞（Google / Yahoo RSS 可能暫時不可用）。
          </div>
        )}

        {!loadingNews && news.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
            {Array.from(new Set(news.map((n) => n.source))).map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5">
                {s} × {news.filter((n) => n.source === s).length}
              </span>
            ))}
          </div>
        )}

        <ul className="space-y-2">
          {news.map((n) => (
            <li key={n.link} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                {n.title}
              </a>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    n.source.startsWith('Yahoo')
                      ? 'bg-purple-50 text-purple-700'
                      : n.source.includes('Google')
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {n.source}
                </span>
                {n.pubDate ? <span>{n.pubDate}</span> : null}
                <span>· {name}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

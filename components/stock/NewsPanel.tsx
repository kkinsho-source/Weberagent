'use client';

import { useEffect, useState } from 'react';
import { MopsAnnouncementsPanel } from '@/components/mops/MopsAnnouncementsPanel';

type NewsItem = { title: string; link: string; pubDate?: string; source: string };

/** 官方公告 + 外鏈新聞 */
export function NewsPanel({ symbol, name }: { symbol: string; name: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock-profile/${symbol}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) setNews(json.news || []);
      } catch {
        if (!cancelled) setNews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">官方公告（MOPS / 證交所）</h3>
        <MopsAnnouncementsPanel initialSymbol={symbol} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">相關新聞（外鏈）</h3>
        {loading && <p className="text-sm text-slate-400">載入新聞…</p>}
        {!loading && news.length === 0 && (
          <p className="text-sm text-slate-400">暫無新聞列表（RSS 可能暫時不可用）。</p>
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
              <div className="mt-1 text-[11px] text-slate-400">
                {n.source}
                {n.pubDate ? ` · ${n.pubDate}` : ''}
                {' · '}
                {name}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-400">
          僅顯示標題與外連，全文請至原站閱讀。非正式投資建議。
        </p>
      </section>
    </div>
  );
}

/**
 * 外鏈新聞 RSS（標題 + 連結，不轉載全文）
 */
import 'server-only';

export type NewsItem = {
  title: string;
  link: string;
  pubDate?: string;
  source: string;
};

function stripCdata(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseRss(xml: string, source: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    const title = stripCdata((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
    const link = stripCdata((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '');
    const pubDate = stripCdata((b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '');
    if (!title || !link) continue;
    items.push({ title, link, pubDate, source });
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchStockNews(
  symbol: string,
  name: string,
  limit = 8
): Promise<NewsItem[]> {
  const q = encodeURIComponent(`${name} OR ${symbol}`);
  // Google News RSS（標題列表，點擊外開）
  const url = `https://news.google.com/rss/search?q=${q}+when:30d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'weberagent/0.7 (news-list; +https://weberagent.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, 'Google News', limit);
  } catch {
    return [];
  }
}

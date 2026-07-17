/**
 * 外鏈新聞 + 多來源 RSS（標題 + 連結，不轉載全文）
 * N3：Google News + Yahoo（股市 RSS + 新聞搜尋 RSS）
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
    let link = stripCdata((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || '');
    if (!link) {
      link = stripCdata((b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '');
    }
    if (!link) {
      link = stripCdata((b.match(/<id[^>]*>([\s\S]*?)<\/id>/i) || [])[1] || '');
    }
    const pubDate = stripCdata(
      (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        b.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
        [])[1] || ''
    );
    if (!title || !link) continue;
    items.push({ title, link, pubDate, source });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchRss(url: string, source: string, limit: number): Promise<NewsItem[]> {
  if (limit <= 0) return [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'weberagent/0.9 (news-list; +https://weberagent.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), source, limit);
  } catch {
    return [];
  }
}

export async function fetchStockNews(
  symbol: string,
  name: string,
  limit = 12
): Promise<NewsItem[]> {
  const q = encodeURIComponent(`${name} ${symbol}`);
  const qName = encodeURIComponent(name);
  const half = Math.max(4, Math.ceil(limit / 2));

  const parts = await Promise.all([
    fetchRss(
      `https://news.google.com/rss/search?q=${q}+when:30d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
      'Google News',
      limit
    ),
    fetchRss(
      `https://tw.stock.yahoo.com/rss?s=${encodeURIComponent(symbol)}`,
      'Yahoo 股市',
      half
    ),
    fetchRss(`https://tw.news.yahoo.com/rss/search?p=${q}`, 'Yahoo 新聞', half),
    fetchRss(
      `https://news.search.yahoo.com/rss?p=${qName}+${encodeURIComponent(symbol)}`,
      'Yahoo 新聞',
      half
    ),
  ]);

  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const list of parts) {
    for (const it of list) {
      const key = it.title.slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

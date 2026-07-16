/**
 * 外鏈新聞 + 多來源 RSS（標題 + 連結，不轉載全文）
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
    const pubDate = stripCdata((b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || '');
    if (!title || !link) continue;
    items.push({ title, link, pubDate, source });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchRss(url: string, source: string, limit: number): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'weberagent/0.8 (news-list; +https://weberagent.vercel.app)',
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
  const q2 = encodeURIComponent(name);

  const sources: Array<Promise<NewsItem[]>> = [
    // Google News
    fetchRss(
      `https://news.google.com/rss/search?q=${q}+when:30d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
      'Google News',
      limit
    ),
    // Yahoo 股市新聞搜尋 RSS（若可用）
    fetchRss(
      `https://tw.stock.yahoo.com/rss?s=${encodeURIComponent(symbol)}`,
      'Yahoo 股市',
      Math.ceil(limit / 2)
    ),
    // MoneyDJ 關鍵字（外鏈；失敗則略）
    fetchRss(
      `https://www.moneydj.com/KMDJ/Search/Search.aspx?QueryType=2&Keyword=${q2}`,
      'MoneyDJ',
      0 // 非 RSS 時會空
    ).then(() => [] as NewsItem[]),
  ];

  const parts = await Promise.all(sources);
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const list of parts) {
    for (const it of list) {
      const key = it.title.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

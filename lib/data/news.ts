/**
 * 外鏈新聞 + 多來源 RSS（標題 + 連結，不轉載全文）
 * N3：Google News + Yahoo 股市 RSS（交錯合併，避免 Google 佔滿名額）
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
    .replace(/&#39;/g, "'")
    .replace(/\\u3000/g, ' ')
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
      link = stripCdata((b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || '');
    }
    const pubDate = stripCdata(
      (b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        b.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
        [])[1] || ''
    );
    if (!title || !link) continue;
    // skip channel-like noise
    if (title.length < 4) continue;
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
        'User-Agent':
          'Mozilla/5.0 (compatible; weberagent/0.9; +https://weberagent.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      // 外鏈新聞要較新鮮；仍可短 cache
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const text = await res.text();
    // HTML 頁（非 RSS）直接略過
    if (/^\s*<!doctype html/i.test(text) || /<html[\s>]/i.test(text.slice(0, 200))) {
      return [];
    }
    return parseRss(text, source, limit);
  } catch {
    return [];
  }
}

/** 交錯合併：每輪各來源取 1 則，避免單一來源塞滿 limit */
function interleave(parts: NewsItem[][], limit: number): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  const cursors = parts.map(() => 0);
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (let i = 0; i < parts.length; i++) {
      if (out.length >= limit) break;
      const list = parts[i];
      while (cursors[i] < list.length) {
        const it = list[cursors[i]++];
        const key = it.title.slice(0, 48);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
        progressed = true;
        break;
      }
    }
  }
  return out;
}

export async function fetchStockNews(
  symbol: string,
  name: string,
  limit = 12
): Promise<NewsItem[]> {
  const q = encodeURIComponent(`${name} ${symbol}`);
  const per = Math.max(6, limit);

  // 並行抓取；Yahoo 個股 RSS 在 tw.stock.yahoo.com 可用
  const [google, yahooSym, yahooFin] = await Promise.all([
    fetchRss(
      `https://news.google.com/rss/search?q=${q}+when:30d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
      'Google News',
      per
    ),
    fetchRss(
      `https://tw.stock.yahoo.com/rss?s=${encodeURIComponent(symbol)}`,
      'Yahoo 股市',
      per
    ),
    // 財經總覽再以關鍵字過濾（備援）
    fetchRss('https://tw.news.yahoo.com/rss/finance', 'Yahoo 新聞', 30).then((list) => {
      const key = name.replace(/-KY$/i, '').slice(0, 2);
      const filtered = list.filter(
        (it) =>
          it.title.includes(name) ||
          it.title.includes(symbol) ||
          (key.length >= 2 && it.title.includes(key))
      );
      return filtered.slice(0, per);
    }),
  ]);

  // 交錯：Yahoo 股市 → Google → Yahoo 新聞（確保 Yahoo 可見）
  return interleave([yahooSym, google, yahooFin], limit);
}

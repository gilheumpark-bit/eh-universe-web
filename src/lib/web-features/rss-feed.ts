// ============================================================
// RSS/Atom Feed Generator — 아카이브 업데이트 구독
// ============================================================
// 새 세계관 문서, 보고서 등을 RSS 리더로 구독.
// /api/feed 엔드포인트에서 호출.

export interface FeedItem {
  title: string;
  slug: string;
  description: string;
  category: string;
  datePublished: string; // ISO 8601
  content?: string;
}

export function generateAtomFeed(items: FeedItem[], baseUrl: string = 'https://eh-universe.com'): string {
  const updated = items.length > 0 ? items[0].datePublished : new Date().toISOString();
  const entries = items.map(item => `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${baseUrl}/archive/${item.slug}"/>
    <id>${baseUrl}/archive/${item.slug}</id>
    <updated>${item.datePublished}</updated>
    <summary>${escapeXml(item.description)}</summary>
    <category term="${escapeXml(item.category)}"/>
    ${item.content ? `<content type="html">${escapeXml(item.content)}</content>` : ''}
  </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>EH Universe Archive</title>
  <subtitle>세계관 설정집 업데이트</subtitle>
  <link href="${baseUrl}/api/feed" rel="self"/>
  <link href="${baseUrl}/archive"/>
  <id>${baseUrl}/archive</id>
  <updated>${updated}</updated>
  <rights>CC-BY-NC-4.0</rights>
  <generator>EH Universe</generator>
${entries}
</feed>`;
}

export function generateRssFeed(items: FeedItem[], baseUrl: string = 'https://eh-universe.com'): string {
  const rssItems = items.map(item => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${baseUrl}/archive/${item.slug}</link>
      <guid>${baseUrl}/archive/${item.slug}</guid>
      <pubDate>${new Date(item.datePublished).toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>EH Universe Archive</title>
    <description>세계관 설정집 업데이트</description>
    <link>${baseUrl}/archive</link>
    <atom:link href="${baseUrl}/api/feed?format=rss" rel="self" type="application/rss+xml"/>
    <language>ko</language>
    <copyright>CC-BY-NC-4.0</copyright>
${rssItems}
  </channel>
</rss>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

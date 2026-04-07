// ============================================================
// URL Import — 웹 URL 붙여넣기 → 본문 자동 추출
// ============================================================
// 웹 기사, 블로그, 소설 URL → 본문 텍스트 추출 → 번역/분석에 바로 사용
// 설치형에선 복사→붙여넣기 해야 하지만 여기선 URL만 넣으면 끝

/** URL에서 본문 텍스트 추출 (서버 프록시 경유) */
export async function extractTextFromUrl(url: string): Promise<{
  title: string;
  text: string;
  language: string;
  wordCount: number;
  source: string;
} | null> {
  try {
    // 서버의 fetch-url-guard를 통해 안전하게 가져오기
    const res = await fetch('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;

    const html = await res.text();
    return parseHtmlContent(html, url);
  } catch {
    return null;
  }
}

/** HTML에서 본문 텍스트 추출 (클라이언트 사이드) */
function parseHtmlContent(html: string, sourceUrl: string): {
  title: string;
  text: string;
  language: string;
  wordCount: number;
  source: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 제목 추출
  const title = doc.querySelector('title')?.textContent?.trim()
    || doc.querySelector('h1')?.textContent?.trim()
    || doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    || 'Untitled';

  // 불필요한 요소 제거
  const removals = ['script', 'style', 'nav', 'footer', 'header', 'aside', '.sidebar', '.ad', '.advertisement', '.comment', '.comments'];
  for (const sel of removals) {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  }

  // 본문 추출 (우선순위: article > main > .content > body)
  const candidates = ['article', 'main', '.content', '.post-body', '.entry-content', '.article-body', 'body'];
  let textEl: Element | null = null;
  for (const sel of candidates) {
    textEl = doc.querySelector(sel);
    if (textEl && textEl.textContent && textEl.textContent.trim().length > 100) break;
  }

  const rawText = (textEl || doc.body)?.textContent || '';
  const text = rawText
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 언어 감지 (간이)
  const langAttr = doc.documentElement.lang || '';
  let language = 'unknown';
  if (/^ko/i.test(langAttr) || /[가-힣]/.test(text.slice(0, 200))) language = 'ko';
  else if (/^ja/i.test(langAttr) || /[\u3040-\u309f\u30a0-\u30ff]/.test(text.slice(0, 200))) language = 'ja';
  else if (/^zh/i.test(langAttr) || /[\u4e00-\u9fff]/.test(text.slice(0, 200))) language = 'zh';
  else if (/^en/i.test(langAttr) || /^[a-zA-Z\s,.!?]+$/.test(text.slice(0, 200))) language = 'en';

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return { title, text, language, wordCount, source: sourceUrl };
}

/** 클립보드에서 URL 감지 */
export function detectUrlInClipboard(text: string): string | null {
  const urlPattern = /^https?:\/\/[^\s]+$/i;
  const trimmed = text.trim();
  return urlPattern.test(trimmed) ? trimmed : null;
}

/** URL인지 일반 텍스트인지 판별 */
export function isUrl(text: string): boolean {
  try {
    new URL(text.trim());
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// URL Import — 웹 URL 붙여넣기 → 본문 자동 추출
// ============================================================
// 웹 기사, 블로그, 소설 URL → 본문 텍스트 추출 → 번역/분석에 바로 사용
// 설치형에선 복사→붙여넣기 해야 하지만 여기선 URL만 넣으면 끝

import { getFirebaseBearerHeaders } from '@/lib/firebase-bearer-headers';

interface FetchUrlResponse {
  text: string;
  sourceUrl?: string;
}

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
    const headers = await getFirebaseBearerHeaders('로그인 후 URL 불러오기를 사용할 수 있습니다.').catch(() => ({}));
    const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`, { headers });
    if (!res.ok) return null;

    const payload = (await res.json()) as Partial<FetchUrlResponse>;
    if (!payload.text) return null;
    return buildExtractedText(payload.text, payload.sourceUrl ?? url);
  } catch {
    return null;
  }
}

function detectLanguage(text: string): string {
  if (/[가-힣]/.test(text.slice(0, 200))) return 'ko';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text.slice(0, 200))) return 'ja';
  if (/[\u4e00-\u9fff]/.test(text.slice(0, 200))) return 'zh';
  if (/^[a-zA-Z\s,.!?]+$/.test(text.slice(0, 200))) return 'en';
  return 'unknown';
}

function buildExtractedText(text: string, sourceUrl: string): {
  title: string;
  text: string;
  language: string;
  wordCount: number;
  source: string;
} {
  const normalizedText = text
    .replace(/\s{3,}/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const firstLine = normalizedText.split('\n').find(Boolean)?.trim();
  const title = firstLine && firstLine.length <= 120 ? firstLine : 'Untitled';
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;

  return { title, text: normalizedText, language: detectLanguage(normalizedText), wordCount, source: sourceUrl };
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

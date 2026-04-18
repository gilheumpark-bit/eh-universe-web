// ============================================================
// Publishing Metadata Translation — 출판용 메타데이터
// ============================================================

import { logger } from '@/lib/logger';

export interface PublishMetadata {
  title: string;
  titleTranslated: string;
  author: string;
  authorRomanized: string;
  synopsis: string;
  synopsisTranslated: string;
  genre: string[];
  tags: string[];
  tagsTranslated: string[];
  targetLang: string;
  /** 플랫폼별 양식 (4종 한국 + 3종 해외) */
  platform?: 'royalroad' | 'webnovel' | 'kakaopage' | 'novelpia' | 'munpia' | 'joara' | 'syosetu' | 'custom';

  // ── 출판 식별 (EPUB dc:* 필드에 매핑됨) ──
  /** ISBN-13 또는 ISBN-10, 없으면 UUID 자동 생성 */
  isbn?: string;
  /** YYYY-MM-DD 형식 권장 (EPUB dc:date) */
  publishDate?: string;
  /** 라이선스 고지 (dc:rights). CC-BY-NC-4.0 / 전체 권리 보유 / 공개 도메인 등 */
  license?: string;
  /** 출판사/레이블 (dc:publisher) */
  publisher?: string;
  /** 번역가 (dc:contributor role="trl") */
  translator?: string;
  /** 원저작권 표기 (dc:rights 추가) */
  copyright?: string;
}

/** 메타데이터 번역 프롬프트 생성 */
export function buildMetadataPrompt(
  title: string,
  author: string,
  synopsis: string,
  tags: string[],
  targetLang: string,
  platform?: string,
): string {
  const platformHint = platform
    ? `\nAdapt the style to fit ${platform}'s conventions (title length, synopsis format, popular tags).`
    : '';

  return `Translate the following novel metadata to ${targetLang}.${platformHint}

Title: ${title}
Author: ${author}
Synopsis:
${synopsis}
Tags: ${tags.join(', ')}

Respond with ONLY a JSON object:
{
  "titleTranslated": "...",
  "authorRomanized": "...",
  "synopsisTranslated": "...",
  "tagsTranslated": ["...", "..."]
}

Rules:
- Title: catchy, marketable for ${targetLang} audience
- Author: romanized/localized form
- Synopsis: localized, not literal — match ${platform || 'general'} style
- Tags: use popular tags in ${targetLang} platform conventions`;
}

/** 메타데이터 응답 파싱 */
export function parseMetadataResponse(raw: string): Partial<PublishMetadata> {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]);
  } catch (err) {
    logger.warn('PublishMetadata', 'parseMetadataResponse JSON parse failed', err);
    return {};
  }
}

/** EPUB 메타데이터 XML 생성 — dc:* 전 필드 지원 */
export function toEpubMetadataXml(meta: PublishMetadata): string {
  const identifier = meta.isbn ? `urn:isbn:${meta.isbn}` : `urn:uuid:${cryptoUuid()}`;
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">`,
    `  <dc:identifier id="bookid">${escapeXml(identifier)}</dc:identifier>`,
    `  <dc:title>${escapeXml(meta.titleTranslated || meta.title)}</dc:title>`,
    `  <dc:creator opf:role="aut">${escapeXml(meta.authorRomanized || meta.author)}</dc:creator>`,
    `  <dc:language>${escapeXml(meta.targetLang.toLowerCase())}</dc:language>`,
    `  <dc:description>${escapeXml(meta.synopsisTranslated || meta.synopsis)}</dc:description>`,
  ];
  if (meta.publishDate) lines.push(`  <dc:date>${escapeXml(meta.publishDate)}</dc:date>`);
  if (meta.publisher) lines.push(`  <dc:publisher>${escapeXml(meta.publisher)}</dc:publisher>`);
  if (meta.translator) lines.push(`  <dc:contributor opf:role="trl">${escapeXml(meta.translator)}</dc:contributor>`);
  if (meta.license) lines.push(`  <dc:rights>${escapeXml(meta.license)}</dc:rights>`);
  if (meta.copyright) lines.push(`  <dc:rights>${escapeXml(meta.copyright)}</dc:rights>`);
  for (const t of meta.tagsTranslated) lines.push(`  <dc:subject>${escapeXml(t)}</dc:subject>`);
  lines.push(`</metadata>`);
  return lines.join('\n');
}

/** ISBN 형식 검증 (ISBN-10 또는 ISBN-13). 하이픈/공백 허용 */
export function validateIsbn(raw: string): { ok: boolean; normalized?: string; error?: string } {
  if (!raw) return { ok: false, error: 'empty' };
  const cleaned = raw.replace(/[-\s]/g, '');
  if (cleaned.length === 10) {
    if (!/^\d{9}[\dX]$/.test(cleaned)) return { ok: false, error: 'ISBN-10 형식 오류' };
    return { ok: true, normalized: cleaned };
  }
  if (cleaned.length === 13) {
    if (!/^\d{13}$/.test(cleaned)) return { ok: false, error: 'ISBN-13 형식 오류' };
    if (!cleaned.startsWith('978') && !cleaned.startsWith('979')) {
      return { ok: false, error: 'ISBN-13은 978/979로 시작' };
    }
    return { ok: true, normalized: cleaned };
  }
  return { ok: false, error: '10자리 또는 13자리 필요' };
}

/** 표준 CC 라이선스 프리셋 */
export const LICENSE_PRESETS = [
  { id: 'all-rights-reserved', ko: '전체 권리 보유', en: 'All rights reserved' },
  { id: 'cc-by-4', ko: 'CC BY 4.0', en: 'Creative Commons Attribution 4.0' },
  { id: 'cc-by-nc-4', ko: 'CC BY-NC 4.0', en: 'Creative Commons Attribution-NonCommercial 4.0' },
  { id: 'cc-by-sa-4', ko: 'CC BY-SA 4.0', en: 'Creative Commons Attribution-ShareAlike 4.0' },
  { id: 'cc0', ko: 'CC0 (공개 도메인)', en: 'CC0 (Public Domain)' },
  { id: 'custom', ko: '사용자 지정', en: 'Custom' },
] as const;

function cryptoUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (약한 품질, 서버 렌더링 대응)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

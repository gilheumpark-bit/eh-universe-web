// ============================================================
// Publishing Metadata Translation — 출판용 메타데이터
// ============================================================

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
  /** 플랫폼별 양식 */
  platform?: 'royalroad' | 'webnovel' | 'kakaopage' | 'novelpia' | 'syosetu' | 'custom';
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
  } catch {
    return {};
  }
}

/** EPUB 메타데이터 XML 생성 */
export function toEpubMetadataXml(meta: PublishMetadata): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${escapeXml(meta.titleTranslated || meta.title)}</dc:title>
  <dc:creator>${escapeXml(meta.authorRomanized || meta.author)}</dc:creator>
  <dc:language>${meta.targetLang.toLowerCase()}</dc:language>
  <dc:description>${escapeXml(meta.synopsisTranslated || meta.synopsis)}</dc:description>
  ${meta.tagsTranslated.map(t => `<dc:subject>${escapeXml(t)}</dc:subject>`).join('\n  ')}
</metadata>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

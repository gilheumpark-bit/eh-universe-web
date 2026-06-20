// ============================================================
// Joara Adapter — 조아라 회차 업로드 규격 (MVP)
// 메타 제한 가장 느슨. HTML 일부 허용 (br, b, i).
// ============================================================
import type { PlatformAdapter } from './types';
import {
  stripHtmlTags,
  normalizeBlankLines,
  splitByDoubleBlank,
  validateMetaWithConstraints,
} from './base';

export const joaraAdapter: PlatformAdapter = {
  id: 'joara',
  name: '조아라',
  description: '조아라 회차 업로드. 메타 제한 느슨, 본문 HTML 일부 태그 허용.',
  constraints: {
    titleMaxLength: 100,
    tagMaxCount: 10,
    tagMaxLength: 20,
    descriptionMaxLength: 2000,
    allowHtml: false, // MVP는 순수 텍스트로 변환 (안전)
    maxConsecutiveBlanks: 3,
    guideUrl: 'https://www.joara.com',
  },
  toText(episode, opts = {}) {
    const lines: string[] = [];
    if (opts.includeTitle && episode.title) {
      const prefix = opts.includeChapterNumber ? `${episode.episode}화. ` : '';
      lines.push(`${prefix}${episode.title}`);
      lines.push('');
    }
    const body = stripHtmlTags(episode.content);
    // 조아라는 연속 공백 3줄까지 허용
    const normalized = normalizeBlankLines(body, 3);
    lines.push(normalized);
    return lines.join('\n').trim();
  },
  validateMeta(meta) {
    return validateMetaWithConstraints(meta, joaraAdapter.constraints);
  },
  splitChapters: splitByDoubleBlank,
};

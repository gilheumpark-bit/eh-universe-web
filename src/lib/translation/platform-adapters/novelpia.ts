// ============================================================
// Novelpia Adapter — 노벨피아 회차 업로드 규격
// 주의: 실제 제한치는 플랫폼 변경 가능. 보수적 값 적용.
// ============================================================
import type { PlatformAdapter } from './types';
import {
  stripHtmlTags,
  normalizeBlankLines,
  splitByDoubleBlank,
  validateMetaWithConstraints,
} from './base';

export const novelpiaAdapter: PlatformAdapter = {
  id: 'novelpia',
  name: '노벨피아',
  description: '웹소설 전용 플랫폼. 회차별 업로드, 순수 텍스트 위주.',
  constraints: {
    titleMaxLength: 60,
    tagMaxCount: 5,
    tagMaxLength: 12,
    descriptionMaxLength: 500,
    allowHtml: false,
    maxConsecutiveBlanks: 2,
    guideUrl: 'https://novelpia.com',
  },
  toText(episode, opts = {}) {
    const lines: string[] = [];
    if (opts.includeTitle && episode.title) {
      const prefix = opts.includeChapterNumber ? `${episode.episode}화. ` : '';
      lines.push(`${prefix}${episode.title}`);
      lines.push(''); // 제목 아래 빈 줄
    }
    const body = stripHtmlTags(episode.content);
    const normalized = normalizeBlankLines(body, 2);
    lines.push(normalized);
    return lines.join('\n').trim();
  },
  validateMeta(meta) {
    return validateMetaWithConstraints(meta, novelpiaAdapter.constraints);
  },
  splitChapters: splitByDoubleBlank,
};

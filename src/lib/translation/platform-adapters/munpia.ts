// ============================================================
// Munpia Adapter — 문피아 회차 업로드 규격
// 주의: 실제 제한치는 플랫폼 변경 가능. 보수적 값 적용.
// ============================================================
import type { PlatformAdapter } from './types';
import {
  stripHtmlTags,
  normalizeBlankLines,
  splitByDoubleBlank,
  validateMetaWithConstraints,
} from './base';

export const munpiaAdapter: PlatformAdapter = {
  id: 'munpia',
  name: '문피아',
  description: '웹소설 플랫폼. 회차별 업로드, 문피아 HTML 에디터는 br/b/i 정도 허용.',
  constraints: {
    titleMaxLength: 50,
    tagMaxCount: 10,
    tagMaxLength: 15,
    descriptionMaxLength: 800,
    allowHtml: false, // 순수 텍스트 권장, HTML 변환 옵션 시에만 허용
    maxConsecutiveBlanks: 2,
    guideUrl: 'https://munpia.com',
  },
  toText(episode, opts = {}) {
    const lines: string[] = [];
    if (opts.includeTitle && episode.title) {
      const prefix = opts.includeChapterNumber ? `${episode.episode}화. ` : '';
      lines.push(`${prefix}${episode.title}`);
      lines.push('');
    }
    // 문피아는 연속 공백 2줄까지 표시. 3줄 이상은 1줄로 압축.
    const body = stripHtmlTags(episode.content);
    const normalized = normalizeBlankLines(body, 2);
    lines.push(normalized);
    return lines.join('\n').trim();
  },
  validateMeta(meta) {
    return validateMetaWithConstraints(meta, munpiaAdapter.constraints);
  },
  splitChapters: splitByDoubleBlank,
};

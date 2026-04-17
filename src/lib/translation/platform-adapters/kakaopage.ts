// ============================================================
// KakaoPage Adapter — 카카오페이지 회차 업로드 규격 (MVP)
// 주의: 실제 제한치는 플랫폼 변경 가능. 보수적 값.
// 카카오페이지는 태그 대신 장르/키워드 셀렉터 사용 — 태그 한도 0.
// ============================================================
import type { PlatformAdapter } from './types';
import {
  stripHtmlTags,
  normalizeBlankLines,
  splitByDoubleBlank,
  validateMetaWithConstraints,
} from './base';

export const kakaopageAdapter: PlatformAdapter = {
  id: 'kakaopage',
  name: '카카오페이지',
  description: '카카오페이지 회차 업로드. 태그 미사용 (장르·키워드 셀렉터), 본문 순수 텍스트 권장.',
  constraints: {
    titleMaxLength: 100,
    tagMaxCount: 0,
    descriptionMaxLength: 1000,
    allowHtml: false,
    maxConsecutiveBlanks: 2,
    guideUrl: 'https://page.kakao.com',
  },
  toText(episode, opts = {}) {
    const lines: string[] = [];
    if (opts.includeTitle && episode.title) {
      const prefix = opts.includeChapterNumber ? `${episode.episode}화. ` : '';
      lines.push(`${prefix}${episode.title}`);
      lines.push('');
    }
    const body = stripHtmlTags(episode.content);
    const normalized = normalizeBlankLines(body, 2);
    lines.push(normalized);
    return lines.join('\n').trim();
  },
  validateMeta(meta) {
    return validateMetaWithConstraints(meta, kakaopageAdapter.constraints);
  },
  splitChapters: splitByDoubleBlank,
};

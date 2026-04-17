// ============================================================
// Platform Adapter Base — 공통 헬퍼
// ============================================================
import type { EpisodeInput, PlatformMeta, ValidationResult, PlatformConstraints } from './types';

/** Unicode 코드포인트 기준 문자 수 (surrogate pair 고려) */
export function countChars(text: string): number {
  return [...(text || '')].length;
}

/** HTML 태그 제거 + 대표 엔티티 복원 */
export function stripHtmlTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<p\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** 연속 빈 줄을 maxBlanks 개수로 제한 */
export function normalizeBlankLines(text: string, maxBlanks: number): string {
  if (!text) return '';
  const pattern = new RegExp(`\\n{${maxBlanks + 2},}`, 'g');
  const replacement = '\n'.repeat(maxBlanks + 1);
  return text.replace(pattern, replacement);
}

/** 빈 줄 2개 이상을 기준으로 챕터 분할 (기본 구현) */
export function splitByDoubleBlank(source: string): EpisodeInput[] {
  if (!source || !source.trim()) return [];
  // 3개 이상 빈 줄 = 섹션 구분
  const parts = source.split(/\n\s*\n\s*\n+/).map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length <= 1) {
    return [{ episode: 1, content: source.trim() }];
  }
  return parts.map((content, i) => ({
    episode: i + 1,
    title: `Chapter ${i + 1}`,
    content,
  }));
}

/** 공통 메타 검증 — 각 어댑터가 constraints 주입해서 호출 */
export function validateMetaWithConstraints(
  meta: PlatformMeta,
  constraints: PlatformConstraints,
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const detail: ValidationResult['detail'] = {};

  // Title
  if (meta.title !== undefined) {
    const len = countChars(meta.title);
    const ok = len <= constraints.titleMaxLength;
    detail.title = { length: len, limit: constraints.titleMaxLength, ok };
    if (!ok) errors.push(`제목 ${constraints.titleMaxLength}자 초과 (현재 ${len}자)`);
  }

  // Tags
  if (meta.tags !== undefined) {
    const count = meta.tags.length;
    const ok = count <= constraints.tagMaxCount;
    detail.tags = { count, limit: constraints.tagMaxCount, ok };
    if (!ok) errors.push(`태그 ${constraints.tagMaxCount}개 초과 (현재 ${count}개)`);
    if (constraints.tagMaxLength) {
      const overlong = meta.tags.filter(t => countChars(t) > constraints.tagMaxLength!);
      if (overlong.length > 0) {
        warnings.push(`태그 길이 초과: ${overlong.slice(0, 3).join(', ')}${overlong.length > 3 ? '…' : ''}`);
      }
    }
  }

  // Description
  if (meta.description !== undefined && constraints.descriptionMaxLength) {
    const len = countChars(meta.description);
    const ok = len <= constraints.descriptionMaxLength;
    detail.description = { length: len, limit: constraints.descriptionMaxLength, ok };
    if (!ok) warnings.push(`소개글 ${constraints.descriptionMaxLength}자 초과 (현재 ${len}자)`);
  }

  return { ok: errors.length === 0, warnings, errors, detail };
}

/**
 * story-bible-normalizer.test.ts (2026-05-10 — F-05 검증)
 *
 * Story Bible 출력의 bullet 표준화 동작 검증.
 * 정규식이 다양한 환경에서 일관 작동하는지.
 */

import {
  normalizeStoryBibleBullets,
  extractConflictChecks,
  processStoryBibleOutput,
} from '../story-bible-normalizer';

describe('story-bible-normalizer (F-05)', () => {
  describe('normalizeStoryBibleBullets — bullet 표준화', () => {
    it('• → -', () => {
      expect(normalizeStoryBibleBullets('• 항목 1\n• 항목 2')).toBe('- 항목 1\n- 항목 2');
    });

    it('* → -', () => {
      expect(normalizeStoryBibleBullets('* item 1\n* item 2')).toBe('- item 1\n- item 2');
    });

    it('· → - (한국어 가운뎃점)', () => {
      expect(normalizeStoryBibleBullets('· 한국어\n· 일본어')).toBe('- 한국어\n- 일본어');
    });

    it('– (en dash) → -', () => {
      expect(normalizeStoryBibleBullets('– item 1\n– item 2')).toBe('- item 1\n- item 2');
    });

    it('— (em dash) → -', () => {
      expect(normalizeStoryBibleBullets('— item 1\n— item 2')).toBe('- item 1\n- item 2');
    });

    it('들여쓰기 보존', () => {
      expect(normalizeStoryBibleBullets('  • 들여쓴 항목')).toBe('  - 들여쓴 항목');
      expect(normalizeStoryBibleBullets('    * 더 깊은 들여쓰기')).toBe('    - 더 깊은 들여쓰기');
    });

    it('빈 라인 보존', () => {
      const input = '• 항목 1\n\n• 항목 2';
      const expected = '- 항목 1\n\n- 항목 2';
      expect(normalizeStoryBibleBullets(input)).toBe(expected);
    });

    it('이미 - 인 항목은 unchanged', () => {
      expect(normalizeStoryBibleBullets('- 이미 정상')).toBe('- 이미 정상');
    });

    it('빈 입력 unchanged', () => {
      expect(normalizeStoryBibleBullets('')).toBe('');
    });

    it('혼합 마커 (•/*/–) 모두 변환', () => {
      const input = '• A\n* B\n– C\n— D';
      const expected = '- A\n- B\n- C\n- D';
      expect(normalizeStoryBibleBullets(input)).toBe(expected);
    });
  });

  describe('extractConflictChecks — CONFLICT CHECK 추출', () => {
    it('CONFLICT CHECK: 라인 추출', () => {
      const input = '- 일반 bullet\nCONFLICT CHECK: 이름 변경 감지\n- 다른 bullet';
      expect(extractConflictChecks(input)).toEqual(['이름 변경 감지']);
    });

    it('CONFLICT CHECK 없으면 빈 배열', () => {
      expect(extractConflictChecks('- normal bullets')).toEqual([]);
    });

    it('multiple CONFLICT CHECK 모두 추출', () => {
      const input = 'CONFLICT CHECK: A\n- bullet\nCONFLICT CHECK: B';
      expect(extractConflictChecks(input)).toEqual(['A', 'B']);
    });

    it('빈 입력 빈 배열', () => {
      expect(extractConflictChecks('')).toEqual([]);
    });
  });

  describe('processStoryBibleOutput — 통합', () => {
    it('normalized + conflicts 동시 반환', () => {
      const input = '• 항목 1\nCONFLICT CHECK: 충돌\n• 항목 2';
      const result = processStoryBibleOutput(input);
      expect(result.normalized).toBe('- 항목 1\nCONFLICT CHECK: 충돌\n- 항목 2');
      expect(result.conflicts).toEqual(['충돌']);
    });

    it('빈 입력 안전', () => {
      const result = processStoryBibleOutput('');
      expect(result.normalized).toBe('');
      expect(result.conflicts).toEqual([]);
    });
  });
});

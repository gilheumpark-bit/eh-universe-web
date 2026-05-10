/**
 * detail-pass-validator.test.ts (2026-05-10 — M-13 / M-15 검증)
 *
 * 한국 인명 false positive 회피 + 4언어 출력 정합 검증.
 */

import { validateDetailPass } from '../detail-pass-validator';

describe('detail-pass-validator (M-13)', () => {
  describe('한국 인명 false positive 회피', () => {
    it('일반 명사 ("사람들이", "이야기는", "시간이") 를 인명으로 검출하지 않는다', () => {
      const input = '그가 깊은 한숨을 쉬었다.';
      const output = '그가 깊은 한숨을 쉬었다. 사람들이 모여들었고 이야기는 시작되었으며 시간이 흘렀다.';
      const result = validateDetailPass(input, output);
      const characterWarning = result.warnings.find(w => w.kind === 'new-character');
      // 일반 명사들이 새 인명으로 잡히지 않아야 함
      if (characterWarning) {
        expect(characterWarning.detail).not.toMatch(/사람들|이야기|시간/);
      }
    });

    it('진짜 새 인명 ("김민준", "이서연") 은 검출한다', () => {
      const input = '그는 어두운 방에 앉아 있었다.';
      const output = '그는 어두운 방에 앉아 있었다. 김민준이 들어왔고 이서연은 그를 노려보았다.';
      const result = validateDetailPass(input, output);
      const characterWarning = result.warnings.find(w => w.kind === 'new-character');
      expect(characterWarning).toBeDefined();
      expect(characterWarning?.detail).toMatch(/김민준|이서연/);
    });

    it('성씨 X (외국식 이름) 는 인명으로 검출하지 않는다', () => {
      const input = '그가 말했다.';
      const output = '그가 말했다. 폴리아나는 미소를 지었다.';
      const result = validateDetailPass(input, output);
      const characterWarning = result.warnings.find(w => w.kind === 'new-character');
      // '폴리아나' 는 한국 성씨로 시작 X — 인명 검출 X
      if (characterWarning) {
        expect(characterWarning.detail).not.toMatch(/폴리아나/);
      }
    });

    it('단순 호칭 ("김씨", "이씨") 는 인명으로 검출하지 않는다', () => {
      const input = '그가 거리를 걸었다.';
      const output = '그가 거리를 걸었다. 김씨가 인사했고 이씨도 고개를 끄덕였다.';
      const result = validateDetailPass(input, output);
      const characterWarning = result.warnings.find(w => w.kind === 'new-character');
      if (characterWarning) {
        expect(characterWarning.detail).not.toMatch(/김씨|이씨/);
      }
    });
  });

  describe('분량 검증', () => {
    it('30% 초과 증가 시 over-growth warning 발생', () => {
      const input = 'a'.repeat(100);
      const output = 'a'.repeat(140); // 40% 증가
      const result = validateDetailPass(input, output);
      expect(result.warnings.find(w => w.kind === 'over-growth')).toBeDefined();
      expect(result.passed).toBe(false);
    });

    it('정상 30% 이내 증가 시 warning 없음', () => {
      const input = 'a'.repeat(100);
      const output = 'a'.repeat(125); // 25% 증가
      const result = validateDetailPass(input, output);
      expect(result.warnings.find(w => w.kind === 'over-growth')).toBeUndefined();
    });

    it('축소 시 shrunk warning 발생', () => {
      const input = 'a'.repeat(100);
      const output = 'a'.repeat(80); // 20% 감소
      const result = validateDetailPass(input, output);
      expect(result.warnings.find(w => w.kind === 'shrunk')).toBeDefined();
    });
  });

  describe('빈 입력 안전성', () => {
    it('빈 input 시 division by zero 없음', () => {
      const result = validateDetailPass('', '');
      expect(result.inputChars).toBe(0);
      expect(result.outputChars).toBe(0);
      expect(() => result.growthRatio).not.toThrow();
    });
  });
});

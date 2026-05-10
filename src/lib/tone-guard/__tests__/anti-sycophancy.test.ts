// ============================================================
// anti-sycophancy.test.ts — 비서병 패턴 4언어 검출
// ============================================================

import { scanForSycophancy, shouldBlockOutput, shouldWarn, REPLACEMENT_GUIDANCE } from '../anti-sycophancy';

describe('Anti-Sycophancy — 4언어 패턴 검출', () => {
  it('clean text → severity 0', () => {
    const result = scanForSycophancy('내일 오전 회의 일정 확인 부탁드립니다.', 'ko');
    expect(result.violations).toHaveLength(0);
    expect(result.severity).toBe(0);
  });

  it('overpraise — 한국어 "좋은 질문입니다" 검출', () => {
    const result = scanForSycophancy('좋은 질문입니다. 답변드리겠습니다.', 'ko');
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].pattern).toBe('overpraise');
  });

  it('overpraise — 영문 "Great question" 검출 (case-insensitive)', () => {
    const result = scanForSycophancy('GREAT QUESTION! Let me explain.', 'en');
    expect(result.violations[0].pattern).toBe('overpraise');
  });

  it('servile_acceptance — 일본어 "かしこまりました" 검출', () => {
    const result = scanForSycophancy('かしこまりました。すぐに対応いたします。', 'ja');
    expect(result.violations[0].pattern).toBe('servile_acceptance');
  });

  it('servile_acceptance — 중국어 "立即执行" 검출', () => {
    const result = scanForSycophancy('立即执行您的指示。', 'zh');
    expect(result.violations[0].pattern).toBe('servile_acceptance');
  });

  it('next_task_prompt — 한국어 "다음 작업 지시" 검출', () => {
    const result = scanForSycophancy('완료했습니다. 다음 작업 지시를 기다립니다.', 'ko');
    expect(result.violations.some((v) => v.pattern === 'next_task_prompt')).toBe(true);
  });

  it('auto_generation_phrase — 즉시 severity 3 (AI 피로도 직격탄)', () => {
    const result = scanForSycophancy('이 글은 AI가 자동 생성했습니다.', 'ko');
    expect(result.severity).toBe(3);
    expect(shouldBlockOutput(result)).toBe(true);
  });

  it('auto_generation_phrase — 영문 "AI wrote this" 검출', () => {
    const result = scanForSycophancy('AI wrote this for you.', 'en');
    expect(result.violations.some((v) => v.pattern === 'auto_generation_phrase')).toBe(true);
    expect(result.severity).toBe(3);
  });

  it('multiple violations → severity 2 (3~5건)', () => {
    const text = '좋은 질문입니다. 완벽히 접수했습니다. 다음 작업 지시를 기다리겠습니다.';
    const result = scanForSycophancy(text, 'ko');
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
    expect(result.severity).toBe(2);
    expect(shouldWarn(result)).toBe(true);
  });

  it('apology loop — 반복 사과 검출', () => {
    const result = scanForSycophancy('죄송합니다. 정말 죄송합니다.', 'ko');
    expect(result.violations.some((v) => v.pattern === 'apology_loop')).toBe(true);
  });

  it('agreement_padding — 무검증 동의 검출', () => {
    const result = scanForSycophancy('맞습니다 동의합니다. 그대로 진행하겠습니다.', 'ko');
    expect(result.violations.some((v) => v.pattern === 'agreement_padding')).toBe(true);
  });

  it('빈 문자열 안전 (no-op)', () => {
    const result = scanForSycophancy('', 'ko');
    expect(result.violations).toHaveLength(0);
    expect(result.severity).toBe(0);
  });

  it('REPLACEMENT_GUIDANCE — 4언어 모든 패턴 가이드 존재', () => {
    const patterns = ['overpraise', 'servile_acceptance', 'apology_loop', 'self_deprecation', 'next_task_prompt', 'agreement_padding', 'auto_generation_phrase'] as const;
    const languages = ['ko', 'en', 'ja', 'zh'] as const;
    for (const p of patterns) {
      for (const l of languages) {
        expect(REPLACEMENT_GUIDANCE[p][l]).toBeTruthy();
        expect(REPLACEMENT_GUIDANCE[p][l].length).toBeGreaterThan(5);
      }
    }
  });

  it('shouldBlockOutput — severity 3 만 true', () => {
    expect(shouldBlockOutput({ violations: [], severity: 0 })).toBe(false);
    expect(shouldBlockOutput({ violations: [], severity: 1 })).toBe(false);
    expect(shouldBlockOutput({ violations: [], severity: 2 })).toBe(false);
    expect(shouldBlockOutput({ violations: [], severity: 3 })).toBe(true);
  });

  it('shouldWarn — severity 2+ true', () => {
    expect(shouldWarn({ violations: [], severity: 0 })).toBe(false);
    expect(shouldWarn({ violations: [], severity: 1 })).toBe(false);
    expect(shouldWarn({ violations: [], severity: 2 })).toBe(true);
    expect(shouldWarn({ violations: [], severity: 3 })).toBe(true);
  });
});

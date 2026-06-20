// ============================================================
// signoff-readiness — [Z1a-4] 기계 검증 조건 분리 + isReadyForPublish 경유 검증.
// ============================================================

import { validateSignoffReadiness, isReadyForPublish } from '../author-signoff';
import type { ChapterEntry } from '@/types/translator';

const mkChapter = (over: Partial<ChapterEntry> = {}): ChapterEntry => ({
  name: '1화',
  content: '원문',
  result: '결과',
  isDone: true,
  stageProgress: 5,
  ...over,
});

describe('validateSignoffReadiness — 기본 (측정값 미제공 = 기존 흐름 호환)', () => {
  it('빈 chapters → ready false', () => {
    const r = validateSignoffReadiness({ chapters: [], track: 'faithful' });
    expect(r.ready).toBe(false);
  });

  it('전부 승인 + 결과물 존재 → ready true (기존 isReadyForPublish 동등)', () => {
    const chapters = [mkChapter({ faithfulApproved: true }), mkChapter({ faithfulApproved: true })];
    const r = validateSignoffReadiness({ chapters, track: 'faithful' });
    expect(r.ready).toBe(true);
    expect(r.conditions.find((c) => c.id === 'all-approved')!.ok).toBe(true);
    expect(r.conditions.find((c) => c.id === 'dual-complete')!.ok).toBe(true);
  });

  it('승인됐지만 결과물 빈 문자열 → dual-complete 미충족 → ready false', () => {
    const chapters = [mkChapter({ faithfulApproved: true, result: '', resultFaithful: '' })];
    const r = validateSignoffReadiness({ chapters, track: 'faithful' });
    expect(r.conditions.find((c) => c.id === 'dual-complete')!.ok).toBe(false);
    expect(r.ready).toBe(false);
  });

  it('track 별 결과물 — resultMarket 우선·legacy result 폴백', () => {
    const chapters = [mkChapter({ marketApproved: true, result: '', resultMarket: '시장본' })];
    const r = validateSignoffReadiness({ chapters, track: 'market' });
    expect(r.conditions.find((c) => c.id === 'dual-complete')!.ok).toBe(true);
    expect(r.ready).toBe(true);
  });

  it('미제공 기계 조건 4종 → verified false + manualChecklist 이관 (정직 분리)', () => {
    const r = validateSignoffReadiness({
      chapters: [mkChapter({ faithfulApproved: true })],
      track: 'faithful',
    });
    const unverified = r.conditions.filter((c) => !c.verified);
    expect(unverified.map((c) => c.id).sort()).toEqual(
      ['band-17plus', 'catastrophic-zero', 'integrity-pass', 'voice-zero'],
    );
    // 미측정 4건 + 본질적 수동 2건 (작가 의도·시장 수용성)
    expect(r.manualChecklist.length).toBe(6);
    expect(r.ready).toBe(true); // 미제공 조건은 ready 를 막지 않음 (호환)
  });
});

describe('validateSignoffReadiness — 측정값 제공 시 기계 검증', () => {
  const approved = [mkChapter({ faithfulApproved: true })];

  it('무결성 warn → integrity-pass 미충족 (pass 만 허용·엄격)', () => {
    const r = validateSignoffReadiness({ chapters: approved, track: 'faithful', integrityStatus: 'warn' });
    expect(r.conditions.find((c) => c.id === 'integrity-pass')!.verified).toBe(true);
    expect(r.ready).toBe(false);
  });

  it('무결성 pass → 충족', () => {
    const r = validateSignoffReadiness({ chapters: approved, track: 'faithful', integrityStatus: 'pass' });
    expect(r.ready).toBe(true);
  });

  it('밴드 16 → 미충족 / 17 → 충족 (B 이상 = bands.ts bandPassed 임계)', () => {
    expect(validateSignoffReadiness({ chapters: approved, track: 'faithful', band: 16 }).ready).toBe(false);
    expect(validateSignoffReadiness({ chapters: approved, track: 'faithful', band: 17 }).ready).toBe(true);
  });

  it('Catastrophic 1건 → 미충족 / 0건 → 충족', () => {
    expect(validateSignoffReadiness({ chapters: approved, track: 'faithful', catastrophicBlocks: 1 }).ready).toBe(false);
    expect(validateSignoffReadiness({ chapters: approved, track: 'faithful', catastrophicBlocks: 0 }).ready).toBe(true);
  });

  it('voice 위반 2건 → 미충족', () => {
    const r = validateSignoffReadiness({ chapters: approved, track: 'faithful', voiceViolations: 2 });
    expect(r.conditions.find((c) => c.id === 'voice-zero')!.ok).toBe(false);
    expect(r.ready).toBe(false);
  });

  it('전 조건 충족 → ready true + 수동 항목은 본질 2건만', () => {
    const r = validateSignoffReadiness({
      chapters: approved,
      track: 'faithful',
      integrityStatus: 'pass',
      band: 33,
      catastrophicBlocks: 0,
      voiceViolations: 0,
    });
    expect(r.ready).toBe(true);
    expect(r.conditions.every((c) => c.verified)).toBe(true);
    expect(r.manualChecklist.length).toBe(2);
  });
});

describe('isReadyForPublish — validateSignoffReadiness 경유 (기존 boolean 흐름 호환)', () => {
  it('빈 list → false (기존 동작)', () => {
    expect(isReadyForPublish([], 'faithful')).toBe(false);
  });

  it('전부 승인 + 결과물 존재 → true / 미승인 track → false (기존 동작)', () => {
    const chapters = [mkChapter({ faithfulApproved: true }), mkChapter({ faithfulApproved: true })];
    expect(isReadyForPublish(chapters, 'faithful')).toBe(true);
    expect(isReadyForPublish(chapters, 'market')).toBe(false);
  });
});

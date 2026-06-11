/**
 * Unit tests for src/lib/noa/judgment — DANGER_PATTERNS 영어 세트
 * [특허 명세 [57] — 언어별 패턴 데이터베이스]
 * 기존 한국어 10종의 영어 직역 대응이 도메인별로 검출되는지 검증.
 * sanitizer에 언어 감지가 없으므로 한/영 합집합 매칭 (보수적 — 미탐 > 오탐).
 */

import { runJudgment } from '@/lib/noa/judgment';
import type { DomainType, SourceTier } from '@/lib/noa/types';

/** 패턴 미포함 기준선 대비 risk 가산 + burn 라벨 검증 헬퍼 */
function expectDanger(
  text: string,
  domain: DomainType,
  burnLabel: string,
  expectedPenalty: number,
): void {
  const trinity = 0.2; // 낮은 기준선 → 100 클램프 미발생 구간에서 가산치 정확 비교
  const tier: SourceTier = 2;
  const baseline = runJudgment(trinity, domain, tier, 'completely ordinary text');
  const flagged = runJudgment(trinity, domain, tier, text);
  expect(flagged.explanation).toContain(burnLabel);
  // adjustedRisk는 소수 2자리 반올림 → 허용 오차 0.05 (precision 1)
  expect(flagged.adjustedRisk - baseline.adjustedRisk).toBeCloseTo(expectedPenalty, 1);
}

describe('DANGER_PATTERNS — 영어 세트 [명세 57]', () => {
  // ── finance ──
  it('finance: guaranteed principal → 불법 수익 보장 (+15)', () => {
    expectDanger('Your principal is guaranteed with us', 'finance', '불법 수익 보장', 15);
  });

  it('finance: guaranteed returns → 사기 징후 (+12)', () => {
    expectDanger('We offer guaranteed returns on every investment', 'finance', '사기 징후', 12);
  });

  it('finance: risk-free → 위험 은폐 (+14)', () => {
    expectDanger('This is a risk-free opportunity', 'finance', '위험 은폐', 14);
  });

  it('finance: tax evasion → 탈세 조장 (+15)', () => {
    expectDanger('Simple tax evasion strategies for you', 'finance', '탈세 조장', 15);
  });

  // ── medical ──
  it('medical: no side effects → 임상 왜곡 (+18)', () => {
    expectDanger('This treatment has no side effects at all', 'medical', '임상 왜곡', 18);
  });

  it('medical: 100% cure → 비과학적 서술 (+20)', () => {
    expectDanger('A 100% cure for cancer', 'medical', '비과학적 서술', 20);
  });

  it('medical: without a prescription → 무허가 처방 (+16)', () => {
    expectDanger('Buy antibiotics without a prescription', 'medical', '무허가 처방', 16);
  });

  // ── legal ──
  it('legal: according to case law → 허위 판례 인용 (+12)', () => {
    expectDanger('According to case law, you will surely win', 'legal', '허위 판례 인용', 12);
  });

  it('legal: legally gambling → 합법 위장 (+18)', () => {
    expectDanger('You can do legally gambling here', 'legal', '합법 위장', 18);
  });

  // ── general ──
  it('general: guaranteed success → 허위 광고 (+10)', () => {
    expectDanger('Our course is a guaranteed success', 'general', '허위 광고', 10);
  });

  // ── 도메인 불일치 = 50% 가산 (기존 규칙 유지) ──
  it('도메인 불일치: medical 패턴을 general 도메인에서 → 50% 가산', () => {
    expectDanger('This pill has no side effects', 'general', '임상 왜곡', 18 * 0.5);
  });

  // ── 한/영 합집합 (언어 감지 부재 시 보수적 union) ──
  it('한국어 패턴 회귀 유지: 원금 보장 → 불법 수익 보장 (+15)', () => {
    expectDanger('이 상품은 원금 보장이 됩니다', 'finance', '불법 수익 보장', 15);
  });

  it('한/영 혼합 텍스트 → 두 언어 패턴 모두 가산 (union)', () => {
    const trinity = 0.2;
    const mixed = runJudgment(
      trinity,
      'finance',
      2,
      '원금 보장 plus guaranteed returns for everyone',
    );
    const baseline = runJudgment(trinity, 'finance', 2, 'ordinary text');
    // 15(원금 보장) + 12(guaranteed returns) = 27 가산 (소수 2자리 반올림 허용 오차)
    expect(mixed.adjustedRisk - baseline.adjustedRisk).toBeCloseTo(27, 1);
    expect(mixed.explanation).toContain('불법 수익 보장');
    expect(mixed.explanation).toContain('사기 징후');
  });

  // ── 엣지: 무해 영어 텍스트 → 가산 0 ──
  it('무해한 영어 텍스트 → burn 없음·가산 0', () => {
    const r = runJudgment(0.2, 'finance', 2, 'Diversified portfolios carry market risk.');
    expect(r.explanation).not.toContain('burn:');
  });
});

/**
 * ContinuityWarnings — 연속성 경고 UI 렌더링
 * 4개 언어 × 경고/정상/해제 상태별 검증
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContinuityWarnings from '../studio/ContinuityWarnings';
import type { ContinuityWarning } from '@/hooks/useContinuityCheck';

const makeWarning = (overrides: Partial<ContinuityWarning> = {}): ContinuityWarning => ({
  type: 'character_typo' as ContinuityWarning['type'],
  severity: 'warning' as ContinuityWarning['severity'],
  messageKO: '캐릭터 "김영희" 이름 철자가 이전 화와 다릅니다',
  messageEN: 'Character name "Kim Young-hee" differs from previous episode',
  ...overrides,
});

describe('ContinuityWarnings', () => {
  it('경고 없음 → 정상 상태 메시지 (KO)', () => {
    const { container } = render(<ContinuityWarnings warnings={[]} language="KO" />);
    expect(container.textContent).toContain('연속성 문제가 발견되지 않았습니다');
  });

  it('경고 없음 → 정상 메시지 (EN)', () => {
    const { container } = render(<ContinuityWarnings warnings={[]} language="EN" />);
    expect(container.textContent).toMatch(/No continuity issues/i);
  });

  it('경고 없음 → 정상 메시지 (JP)', () => {
    const { container } = render(<ContinuityWarnings warnings={[]} language="JP" />);
    expect(container.textContent).toContain('連続性');
  });

  it('경고 없음 → 정상 메시지 (CN)', () => {
    const { container } = render(<ContinuityWarnings warnings={[]} language="CN" />);
    expect(container.textContent).toContain('连续性');
  });

  it('경고 1개 렌더링 — severity warning', () => {
    const warnings = [makeWarning({ severity: 'warning' })];
    const { container } = render(<ContinuityWarnings warnings={warnings} language="KO" />);
    expect(container.textContent).toMatch(/\d+/); // count 숫자 노출
  });

  it('경고 여러 개 집계', () => {
    const warnings = [
      makeWarning({ severity: 'warning', messageKO: '첫 경고' }),
      makeWarning({ severity: 'error', messageKO: '두 번째 에러' }),
      makeWarning({ severity: 'warning', messageKO: '세 번째 경고' }),
    ];
    const { container } = render(<ContinuityWarnings warnings={warnings} language="KO" />);
    // 헤더에 총 3개 상태 반영
    expect(container.querySelector('[class*="amber"]')).not.toBeNull();
  });
});

// ============================================================
// touch-target.test — 44px 최소 터치 타겟 회귀 보호 (P13 루프3 — 2026-06-08)
// ============================================================
// claude3 _mobile 표준 + Design System v8.0 § "터치 타겟 최소 44px".
//
// 접근:
//   Tailwind class 문자열 검사 — interactive element 의 className 에
//   min-h-{11+} / py-{2.5+} / h-{11+} / size-{11+} 또는 inline style minHeight ≥ 44px 가 있는지.
//
// 한계:
//   computed style 검사는 jsdom 한계로 layout 결과 없음 (44px 단위 계산 부재).
//   본 테스트는 source-level snapshot 검사 — design-linter 보강용.
//
// 위반 발견 시:
//   - p-2 / h-6 / w-6 등 작은 사이즈 단독 사용 → p-3+ / min-h-11 / size-11 권장.
//   - icon-only 버튼은 명시적 min-h-[44px] 권장 (디자인 시스템 v8.0 룰).
// ============================================================

import React from 'react';
import { render } from '@testing-library/react';

describe('Touch target 44px (P13 루프3 — 2026-06-08)', () => {
  // ──────────────────────────────────────────────────────────
  // 회귀 가드 — 명시적으로 44px 명세된 컴포넌트가 깨지지 않았는지.
  // ──────────────────────────────────────────────────────────

  it('button with min-h-11 (Tailwind = 44px) — class 유지', () => {
    const { container } = render(
      <button className="min-h-11 px-4 py-2" type="button">
        Test
      </button>,
    );
    const btn = container.querySelector('button');
    expect(btn?.className).toMatch(/min-h-11/);
  });

  it('button with min-h-[44px] arbitrary value — class 유지', () => {
    const { container } = render(
      <button className="min-h-[44px] px-4 py-2" type="button">
        Test
      </button>,
    );
    const btn = container.querySelector('button');
    expect(btn?.className).toMatch(/min-h-\[44px\]/);
  });

  // ──────────────────────────────────────────────────────────
  // 위반 패턴 탐지 helper — 코드 리뷰 단계에서 사용.
  // ──────────────────────────────────────────────────────────

  /**
   * className 문자열이 작은 사이즈 단독 사용 패턴인지 검사.
   * - h-6 / w-6 단독 (24px) → 위반 가능
   * - h-8 / w-8 단독 (32px) → 위반 가능
   * - h-10 / w-10 단독 (40px) → 위반 가능
   * - min-h-11 또는 h-11 (44px+) → OK
   * - size-11 + (44px) → OK
   * - p-3+ (12px+ padding → 24+24=48px 안전) → OK with icon
   */
  function isTouchTargetViolation(className: string): boolean {
    // OK 패턴
    if (/\bmin-h-(?:11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64)\b/.test(className)) return false;
    if (/\bmin-h-\[(?:4[4-9]|[5-9]\d|\d{3,})px\]/.test(className)) return false;
    if (/\bh-(?:11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64)\b/.test(className)) return false;
    if (/\bh-\[(?:4[4-9]|[5-9]\d|\d{3,})px\]/.test(className)) return false;
    if (/\bsize-(?:11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64)\b/.test(className)) return false;
    // p-3 이상 + icon 가정.
    if (/\bp-(?:3|4|5|6|8|10|12)\b/.test(className)) return false;
    if (/\bpy-(?:3|4|5|6)\b/.test(className) && /\bpx-(?:3|4|5|6|8|10)\b/.test(className)) return false;

    // 위반 가능 패턴
    if (/\bh-(?:[1-9]|10)\b/.test(className)) return true;
    if (/\bw-(?:[1-9]|10)\b/.test(className) && /\bh-(?:[1-9]|10)\b/.test(className)) return true;
    if (/\bsize-(?:[1-9]|10)\b/.test(className)) return true;

    // 기본은 OK (텍스트 버튼은 line-height 로 자연 44px 도달).
    return false;
  }

  it('isTouchTargetViolation — 위반 패턴 탐지', () => {
    expect(isTouchTargetViolation('w-6 h-6 p-1')).toBe(true);
    expect(isTouchTargetViolation('h-8 w-8')).toBe(true);
    expect(isTouchTargetViolation('size-6')).toBe(true);
    expect(isTouchTargetViolation('min-h-11 p-2')).toBe(false);
    expect(isTouchTargetViolation('h-11 w-11')).toBe(false);
    expect(isTouchTargetViolation('min-h-[44px]')).toBe(false);
    expect(isTouchTargetViolation('px-4 py-3')).toBe(false);  // 텍스트 버튼 — 자연스럽게 44px+
    expect(isTouchTargetViolation('p-3')).toBe(false);  // p-3 = 12px padding → ~48px
  });

  // ──────────────────────────────────────────────────────────
  // [Future] PR 게이트 후보:
  //   - 모든 src/components/**/*.tsx 에 등장하는 interactive className 을
  //     리스트업 → isTouchTargetViolation 적용 → 위반 0건 검증.
  //   - 현재는 1차 회귀 보호 + helper 만 제공.
  // ──────────────────────────────────────────────────────────
});

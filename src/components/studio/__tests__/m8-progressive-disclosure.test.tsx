/**
 * M8 — Writer UX Balance: Progressive Disclosure tests
 *
 * G7 게이트 검증:
 *   - 새로 도입된 중첩 accordion은 기본 접힘이어야 한다.
 *   - KPM / focus-drift 같은 niche 토글은 기본 화면에서 보이지 않아야 한다.
 *   - Temperature 프리셋 버튼은 기본 값에 맞게 선택된 상태로 렌더된다.
 *   - ui-preferences 헬퍼는 SSR-safe 하고 저장 실패에도 crash 하지 않는다.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import SessionSection from '../settings/SessionSection';
import AdvancedSection from '../settings/AdvancedSection';
import {
  readUIPref,
  writeUIPref,
  UI_PREF_KEYS,
} from '@/lib/ui-preferences';

// ============================================================
// PART 1 — Setup
// ============================================================

beforeEach(() => {
  localStorage.clear();
});

// ============================================================
// PART 2 — SessionSection: M6 ergonomics nested accordion
// ============================================================

describe('M8 SessionSection progressive disclosure', () => {
  it('M6 ergonomics 그룹은 기본적으로 접혀 있다 (KPM 토글 미노출)', () => {
    render(<SessionSection language="KO" />);

    // 먼저 외곽 세션 아코디언을 펼친다 — details 태그이므로 open 속성 강제
    const outerDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    expect(outerDetails).toBeTruthy();
    outerDetails.open = true;

    // M6 ergo 토글 버튼은 존재해야 한다
    const ergoToggle = screen.getByTestId('m8-ergo-toggle');
    expect(ergoToggle).toBeInTheDocument();
    expect(ergoToggle).toHaveAttribute('aria-expanded', 'false');

    // KPM 라벨이 기본 상태에서는 렌더되지 않아야 한다 (접혀 있음)
    expect(screen.queryByText(/KPM/i)).toBeNull();
    expect(screen.queryByText(/분당 타자수/)).toBeNull();
  });

  it('M6 ergo 그룹을 펼쳐도 통계·고급 서브 그룹은 여전히 접혀 있다 (2중 방어)', () => {
    render(<SessionSection language="KO" />);
    const outerDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    outerDetails.open = true;

    const ergoToggle = screen.getByTestId('m8-ergo-toggle');
    act(() => {
      fireEvent.click(ergoToggle);
    });
    expect(ergoToggle).toHaveAttribute('aria-expanded', 'true');

    // 이제 "통계·고급" 내부 토글은 존재하지만 접힌 상태여야 한다
    const statsToggle = screen.getByTestId('m8-stats-toggle');
    expect(statsToggle).toHaveAttribute('aria-expanded', 'false');

    // KPM / 탭 복귀 토글은 여전히 렌더되지 않아야 한다
    expect(screen.queryByText(/분당 타자수/)).toBeNull();
    expect(screen.queryByText(/탭 복귀 안내/)).toBeNull();
  });

  it('통계·고급 서브 그룹을 펼치면 KPM·탭 복귀 토글이 노출된다 (기능 보존)', () => {
    render(<SessionSection language="KO" />);
    const outerDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    outerDetails.open = true;

    act(() => {
      fireEvent.click(screen.getByTestId('m8-ergo-toggle'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('m8-stats-toggle'));
    });

    // 이제 KPM·탭 복귀 토글이 노출되어야 한다 (기능 제거 아님)
    // "분당 타자수"는 label과 description 양쪽에 등장하므로 getAllByText로 검증한다
    expect(screen.getAllByText(/분당 타자수/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/탭 복귀 안내/).length).toBeGreaterThanOrEqual(1);
  });

  it('펼침 상태는 ui-preferences localStorage로 영속된다', () => {
    render(<SessionSection language="KO" />);
    const outerDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    outerDetails.open = true;

    act(() => {
      fireEvent.click(screen.getByTestId('m8-ergo-toggle'));
    });

    expect(readUIPref(UI_PREF_KEYS.sessionErgoOpen, false)).toBe(true);
  });
});

// ============================================================
// PART 3 — AdvancedSection: Temperature presets (Pattern B)
// ============================================================

describe('M8 AdvancedSection Temperature presets', () => {
  it('3 프리셋 버튼이 라디오 그룹으로 존재한다', () => {
    render(<AdvancedSection language="KO" onManageApiKey={() => {}} />);
    // AdvancedSection 외곽 accordion을 펼친다
    const advancedDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    advancedDetails.open = true;

    // 내부 advanced 블록을 펼친다 — advancedOpen 토글 버튼은
    // "노아 엔진 연결, 창의성 조절" 설명 문구 위에 있는 유일한 button 이다.
    // 페이지에 여러 button이 있으므로, 노아 엔진 설명 부모에서 부터 탐색한다.
    const explainP = screen.getByText(/노아 엔진 연결/);
    const cardDiv = explainP.closest('.ds-card-lg');
    const innerBtn = cardDiv?.querySelector('button');
    if (innerBtn) {
      act(() => {
        fireEvent.click(innerBtn);
      });
    }

    expect(screen.getByTestId('m8-temp-preset-0.6')).toBeInTheDocument();
    expect(screen.getByTestId('m8-temp-preset-0.9')).toBeInTheDocument();
    expect(screen.getByTestId('m8-temp-preset-1.2')).toBeInTheDocument();
  });

  it('기본값 0.9 에서는 "균형" 프리셋이 선택(aria-checked=true)된다', () => {
    render(<AdvancedSection language="KO" onManageApiKey={() => {}} />);
    const advancedDetails = document.querySelector('details.ds-accordion') as HTMLDetailsElement;
    advancedDetails.open = true;

    const explainP = screen.getByText(/노아 엔진 연결/);
    const cardDiv = explainP.closest('.ds-card-lg');
    const innerBtn = cardDiv?.querySelector('button');
    if (innerBtn) {
      act(() => {
        fireEvent.click(innerBtn);
      });
    }

    const balanced = screen.getByTestId('m8-temp-preset-0.9');
    expect(balanced).toHaveAttribute('aria-checked', 'true');
  });
});

// ============================================================
// PART 4 — ui-preferences helper
// ============================================================

describe('M8 ui-preferences helper', () => {
  it('readUIPref returns fallback when key absent', () => {
    expect(readUIPref('m8-test-absent', false)).toBe(false);
    expect(readUIPref('m8-test-absent', true)).toBe(true);
  });

  it('writeUIPref then readUIPref round-trips', () => {
    writeUIPref('m8-test-roundtrip', true);
    expect(readUIPref('m8-test-roundtrip', false)).toBe(true);
    writeUIPref('m8-test-roundtrip', false);
    expect(readUIPref('m8-test-roundtrip', true)).toBe(false);
  });

  it('readUIPref is SSR-safe and silent on localStorage failure', () => {
    // localStorage throw 상황 시뮬레이션
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('simulated quota exceeded');
      },
    });
    expect(() => readUIPref('m8-test-throw', false)).not.toThrow();
    expect(readUIPref('m8-test-throw', true)).toBe(true);
    expect(() => writeUIPref('m8-test-throw', true)).not.toThrow();
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});

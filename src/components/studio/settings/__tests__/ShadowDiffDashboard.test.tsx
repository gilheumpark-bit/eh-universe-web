// ============================================================
// PART 1 — Setup + Mocks
// ============================================================

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// useShadowDiff 훅 모킹 — 리포트/액션을 테스트별로 주입
jest.mock('@/hooks/useShadowDiff', () => ({
  useShadowDiff: jest.fn(),
}));
// useJournalEngineMode (M1.5.4) — 승격 UI 용 훅. 테스트에선 고정 스텁.
jest.mock('@/hooks/useJournalEngineMode', () => ({
  useJournalEngineMode: () => ({
    currentMode: 'shadow',
    promotionStatus: null,
    promoteNow: jest.fn().mockResolvedValue(false),
    downgradeNow: jest.fn().mockResolvedValue(true),
    refreshStatus: jest.fn().mockResolvedValue(undefined),
    reportJournalError: jest.fn(),
  }),
}));
// getPromotionHistory (M1.5.4) — IDB 의존 회피
jest.mock('@/lib/save-engine/promotion-audit', () => ({
  getPromotionHistory: jest.fn().mockResolvedValue([]),
}));

import { useShadowDiff } from '@/hooks/useShadowDiff';
import ShadowDiffDashboard from '../ShadowDiffDashboard';

const mockedUseShadowDiff = useShadowDiff as jest.MockedFunction<typeof useShadowDiff>;

function makeReport(over: Partial<ReturnType<typeof buildBaseReport>> = {}) {
  return { ...buildBaseReport(), ...over };
}

function buildBaseReport() {
  return {
    total: 150,
    matched: 149,
    unmatched: 1,
    matchRatePct: 99.33,
    byOperation: [
      { operation: 'save-project' as const, total: 100, unmatched: 1, matchRatePct: 99 },
      { operation: 'save-manuscript' as const, total: 50, unmatched: 0, matchRatePct: 100 },
    ],
    recent1hMatchRatePct: 100,
    recent24hMatchRatePct: 99.33,
    topDiffPatterns: [{ pattern: 'title', count: 1 }],
    generatedAt: Date.now(),
  };
}

function makeReadiness(ready: boolean, reason = 'test') {
  return {
    ready,
    reason,
    matchRatePct: 99.33,
    threshold: 99.9,
    sampleSize: 150,
    minSampleSize: 100,
  };
}

beforeEach(() => {
  mockedUseShadowDiff.mockReset();
  localStorage.clear();
});

// ============================================================
// PART 2 — 기본 렌더
// ============================================================

describe('ShadowDiffDashboard', () => {
  test('SD1: 빈 리포트 상태 — "수집된 데이터 없음" 노출', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: null,
      readiness: null,
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: null,
    });
    render(<ShadowDiffDashboard language="KO" />);
    expect(screen.getByText(/Shadow Diff/)).toBeInTheDocument();
    expect(screen.getByText(/로딩 중|Loading/)).toBeInTheDocument();
  });

  test('SD2: 리포트 있음 → 일치율 % 표시', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(false, '전체 일치율 부족 (99.33% < 99.9%)'),
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    const { container } = render(<ShadowDiffDashboard language="EN" />);
    expect(container.textContent).toMatch(/99\.33/);
  });

  test('SD3: 4언어 라벨 — KO', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true, 'On 승격 가능'),
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    const { container } = render(<ShadowDiffDashboard language="KO" />);
    expect(container.textContent).toMatch(/전체 일치율/);
    expect(container.textContent).toMatch(/불일치 Top-10/);
  });

  test('SD4: 4언어 라벨 — EN', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true),
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    const { container } = render(<ShadowDiffDashboard language="EN" />);
    expect(container.textContent).toMatch(/Overall Match Rate/);
    expect(container.textContent).toMatch(/Top-10 Unmatched Operations/);
  });

  test('SD5: 4언어 라벨 — JP', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true),
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    const { container } = render(<ShadowDiffDashboard language="JP" />);
    expect(container.textContent).toMatch(/全体一致率/);
  });

  test('SD6: 4언어 라벨 — CN', () => {
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true),
      refresh: jest.fn(),
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    const { container } = render(<ShadowDiffDashboard language="CN" />);
    expect(container.textContent).toMatch(/总体一致率/);
  });
});

// ============================================================
// PART 3 — Interactions
// ============================================================

describe('ShadowDiffDashboard — interactions', () => {
  test('SD7: 새로고침 버튼 → refresh 호출', () => {
    const refresh = jest.fn();
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true),
      refresh,
      clear: jest.fn(),
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    render(<ShadowDiffDashboard language="EN" />);
    const btn = screen.getByLabelText(/Refresh/);
    fireEvent.click(btn);
    expect(refresh).toHaveBeenCalled();
  });

  test('SD8: 초기화 버튼 2단계 확인 — 첫 클릭은 경고, 두 번째 클릭에 clear 호출', async () => {
    const clear = jest.fn().mockResolvedValue(undefined);
    mockedUseShadowDiff.mockReturnValue({
      report: makeReport(),
      readiness: makeReadiness(true),
      refresh: jest.fn(),
      clear,
      loading: false,
      lastRefreshedAt: Date.now(),
    });
    render(<ShadowDiffDashboard language="EN" />);

    const clearBtn = screen.getByLabelText(/Clear shadow log/);
    fireEvent.click(clearBtn);
    // 아직 clear 호출 안 됨 (확인 대기)
    expect(clear).not.toHaveBeenCalled();
    // 버튼 라벨이 "Click again…"으로 변경
    expect(clearBtn.textContent).toMatch(/Click again/);

    await act(async () => {
      fireEvent.click(clearBtn);
    });
    await waitFor(() => expect(clear).toHaveBeenCalled());
  });
});

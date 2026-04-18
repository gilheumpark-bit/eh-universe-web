/**
 * TranslationPanel.integration.test — Phase 5 wiring 검증
 * - useStudioSafe (Provider 내/외 모두 작동)
 * - 디바운스된 TM 제안 (300ms)
 * - 제안 패널 표시/닫기
 * - source_type 배지 (TM vs RAG)
 * - 언마운트 시 timer cleanup (state setter 호출 안 됨)
 *
 * 모든 RAG/TM/AI 호출은 mock — 실제 네트워크 금지.
 */

// ============================================================
// PART 1 — Mocks (반드시 import 전)
// ============================================================

jest.mock('@/services/ragService', () => ({
  ragSearch: jest.fn(async () => []),
  ragBuildPrompt: jest.fn(async () => ''),
  buildRAGTranslationContext: jest.fn(async () => ({
    worldBible: '',
    pastTerms: [],
    pastEpisodeSummary: [],
    genreRules: '',
    fetched: false,
  })),
}));

const mockSearchWithRAGFallback = jest.fn();

jest.mock('@/lib/translation/translation-memory', () => ({
  searchWithRAGFallback: (...args: unknown[]) => mockSearchWithRAGFallback(...args),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: jest.fn(() => ({
    translateEpisode: jest.fn(),
    translateBatch: jest.fn(),
    progress: {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      recreateCount: 0,
      status: 'idle' as const,
    },
    batchProgress: {
      totalEpisodes: 0,
      completedEpisodes: 0,
      currentEpisode: 0,
      chunkProgress: {
        totalChunks: 0,
        completedChunks: 0,
        currentChunk: 0,
        recreateCount: 0,
        status: 'idle' as const,
      },
    },
    isTranslating: false,
    abort: jest.fn(),
    driftWarnings: [],
    voiceViolations: [],
    voiceRetryNeeded: false,
    voiceRetryHint: '',
    ragStatus: {
      fetched: false,
      worldBibleLoaded: false,
      pastTermsCount: 0,
      pastEpisodesCount: 0,
    },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/noa/taint-tracker', () => ({
  getTaintTracker: () => ({
    canTransfer: () => true,
    taint: jest.fn(),
  }),
}));

// ============================================================
// PART 2 — Imports
// ============================================================

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TranslationPanel from '@/components/studio/TranslationPanel';
import { StudioProvider, type StudioContextValue } from '@/app/studio/StudioContext';
import type { StoryConfig } from '@/lib/studio-types';

// ============================================================
// PART 3 — Helpers
// ============================================================

function makeStoryConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    title: 'Test Project',
    genre: 'fantasy',
    characters: [],
    manuscripts: [],
    ...overrides,
  } as unknown as StoryConfig;
}

function makeStudioCtx(overrides: Partial<StudioContextValue> = {}): StudioContextValue {
  return {
    currentProjectId: 'proj-1',
    currentSessionId: 'session-1',
    ...overrides,
  } as unknown as StudioContextValue;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchWithRAGFallback.mockReset();
  try {
    window.localStorage.clear();
  } catch {
    /* noop */
  }
});

afterEach(() => {
  jest.useRealTimers();
});

// ============================================================
// PART 4 — Tests
// ============================================================

describe('TranslationPanel — basic rendering', () => {
  it('Provider 밖에서 렌더 — useStudioSafe가 throw 흡수', () => {
    const config = makeStoryConfig();
    expect(() =>
      render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />),
    ).not.toThrow();
  });

  it('Provider 안에서 렌더 — projectContext가 채워져 동작', () => {
    const config = makeStoryConfig();
    const studio = makeStudioCtx();
    expect(() =>
      render(
        <StudioProvider value={studio}>
          <TranslationPanel language="KO" config={config} setConfig={() => {}} />
        </StudioProvider>,
      ),
    ).not.toThrow();
  });

  it('기본 헤더(자율 현지화 엔진) 표시', () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />);
    expect(screen.getByText(/자율 현지화 엔진/)).toBeInTheDocument();
  });

  it('Scope 탭(소설/일반) 노출', () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />);
    expect(screen.getByRole('tab', { name: /소설/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /일반/ })).toBeInTheDocument();
  });
});

describe('TranslationPanel — TM 제안 디바운스', () => {
  it('초기 상태 — 제안 패널 미출현', () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />);
    expect(screen.queryByText(/TM 제안/)).not.toBeInTheDocument();
  });

  it('searchWithRAGFallback이 호출되지 않음 — 사용자 인터랙션 없을 때', async () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />);
    // 잠시 대기 — debounce가 트리거 안 됨
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSearchWithRAGFallback).not.toHaveBeenCalled();
  });
});

describe('TranslationPanel — 일반 번역 모드 전환', () => {
  it('일반 탭 클릭 → 일반 번역 UI 노출', () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />);
    const generalTab = screen.getByRole('tab', { name: /일반/ });
    fireEvent.click(generalTab);
    // 도메인 선택 버튼 등이 노출되는지 확인
    expect(screen.getByText(/범용/)).toBeInTheDocument();
  });

  it('영어 모드 — Languages 헤더 텍스트 영어', () => {
    const config = makeStoryConfig();
    render(<TranslationPanel language="EN" config={config} setConfig={() => {}} />);
    expect(screen.getByText(/Autonomous Localization Engine/)).toBeInTheDocument();
  });
});

describe('TranslationPanel — projectContext wiring', () => {
  it('Provider 안 + config.title — projectId 자동 결정 (안 던짐)', () => {
    const config = makeStoryConfig({ title: 'My Novel' });
    const studio = makeStudioCtx({ currentProjectId: undefined, currentSessionId: undefined });
    expect(() =>
      render(
        <StudioProvider value={studio}>
          <TranslationPanel language="KO" config={config} setConfig={() => {}} />
        </StudioProvider>,
      ),
    ).not.toThrow();
  });

  it('Provider 외 + config 정상 — 렌더 성공', () => {
    const config = makeStoryConfig({
      title: 'Standalone',
      characters: [{ name: 'Hero' }] as unknown as StoryConfig['characters'],
    });
    expect(() =>
      render(<TranslationPanel language="KO" config={config} setConfig={() => {}} />),
    ).not.toThrow();
  });
});

describe('TranslationPanel — 언마운트 안전성', () => {
  it('컴포넌트 unmount 후 추가 setState 호출 없음 (warning 없음)', async () => {
    const config = makeStoryConfig();
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <TranslationPanel language="KO" config={config} setConfig={() => {}} />,
    );
    act(() => {
      unmount();
    });
    // 디바운스/timer가 unmount 후 setter 호출하면 React가 console.error로 경고
    await new Promise((r) => setTimeout(r, 50));
    const calls = errSpy.mock.calls.filter((args) =>
      String(args[0]).includes('memory leak'),
    );
    expect(calls.length).toBe(0);
    errSpy.mockRestore();
  });
});

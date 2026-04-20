/**
 * DetailPassButton.test — flag gating + click flow.
 */

import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (before imports)
// ============================================================

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
  createT: () => (_key: string, fallback?: string) => fallback ?? _key,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// runDetailPass 를 직접 모킹 — streamSparkAI 호출 경로 우회.
jest.mock('@/engine/detail-pass', () => ({
  runDetailPass: jest.fn(),
}));

import DetailPassButton from '../DetailPassButton';
import { runDetailPass } from '@/engine/detail-pass';
import type { StoryConfig } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

const mockedRun = runDetailPass as jest.MockedFunction<typeof runDetailPass>;

function mkConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '주인공',
    setting: '',
    primaryEmotion: 'tense',
    episode: 1,
    title: 'T',
    totalEpisodes: 10,
    guardrails: { min: 3500, max: 5500 },
    characters: [],
    charRelations: [],
    platform: PlatformType.MOBILE,
  };
}

const SAMPLE_DRAFT = '초안 본문입니다. '.repeat(20);

function setFlag(value: 'off' | 'shadow' | 'on' | null) {
  if (value === null) {
    localStorage.removeItem('noa_flag_draft_detail_v2');
  } else {
    localStorage.setItem('noa_flag_draft_detail_v2', value);
  }
}

// ============================================================
// PART 2 — 렌더 가시성 (플래그 게이트)
// ============================================================

describe('DetailPassButton — flag gating', () => {
  beforeEach(() => {
    mockedRun.mockReset();
    localStorage.clear();
  });

  test('flag off (default) → 렌더 안 됨 (null)', () => {
    setFlag('off');
    const { container } = render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('flag shadow → 렌더됨', () => {
    setFlag('shadow');
    render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={jest.fn()}
      />,
    );
    expect(screen.getByTestId('detail-pass-button')).toBeInTheDocument();
  });

  test('flag on → 렌더됨 + 라벨 "AI 살 붙이기"', () => {
    setFlag('on');
    render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={jest.fn()}
      />,
    );
    expect(screen.getByText(/AI 살 붙이기/)).toBeInTheDocument();
  });
});

// ============================================================
// PART 3 — 클릭 핸들러
// ============================================================

describe('DetailPassButton — click flow', () => {
  beforeEach(() => {
    mockedRun.mockReset();
    localStorage.clear();
    setFlag('shadow');
  });

  test('클릭 시 runDetailPass 호출 + onExpanded(expanded, meta) 전달', async () => {
    mockedRun.mockResolvedValueOnce({
      expandedText: '확장된 본문입니다.',
      incrementChars: 2000,
      elapsedMs: 100,
      modelTokens: { prompt: 1000, completion: 2500 },
    });

    const onExpanded = jest.fn();
    render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={onExpanded}
      />,
    );

    const btn = screen.getByTestId('detail-pass-button');
    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(mockedRun).toHaveBeenCalledTimes(1);
    });
    expect(onExpanded).toHaveBeenCalledWith(
      '확장된 본문입니다.',
      expect.objectContaining({ incrementChars: 2000 }),
    );
  });

  test('에러 시 onError 호출 + 버튼 상태 error', async () => {
    mockedRun.mockRejectedValueOnce(new Error('DGX 게이트웨이 불안정'));
    const onError = jest.fn();

    render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={jest.fn()}
        onError={onError}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('detail-pass-button'));
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('DGX 게이트웨이 불안정');
    });
    expect(screen.getByTestId('detail-pass-button')).toHaveAttribute('data-status', 'error');
  });

  test('빈 draftText → 버튼 disabled (클릭해도 runDetailPass 미호출)', async () => {
    const onExpanded = jest.fn();
    render(
      <DetailPassButton
        draftText=""
        config={mkConfig()}
        language="KO"
        onExpanded={onExpanded}
      />,
    );

    const btn = screen.getByTestId('detail-pass-button');
    expect(btn).toBeDisabled();
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(mockedRun).not.toHaveBeenCalled();
    expect(onExpanded).not.toHaveBeenCalled();
  });

  test('disabled prop → 버튼 disabled', () => {
    render(
      <DetailPassButton
        draftText={SAMPLE_DRAFT}
        config={mkConfig()}
        language="KO"
        onExpanded={jest.fn()}
        disabled
      />,
    );
    expect(screen.getByTestId('detail-pass-button')).toBeDisabled();
  });
});

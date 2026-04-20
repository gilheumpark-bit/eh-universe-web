/**
 * EpisodeTransitionPanel — 패널 UI 테스트
 * Covers: 빈 시 비렌더 / 적용/무시 클릭 / 일괄 무시 / 4언어
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/i18n', () => ({
  L4: (lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => {
    const raw = typeof lang === 'string' ? lang.toLowerCase() : 'ko';
    if (raw === 'en') return v.en;
    if (raw === 'ja' || raw === 'jp') return v.ja || v.ko;
    if (raw === 'zh' || raw === 'cn') return v.zh || v.ko;
    return v.ko;
  },
}));

import { EpisodeTransitionPanel } from '../EpisodeTransitionPanel';
import type { TransitionSuggestion } from '@/hooks/useEpisodeTransition';

function fixSuggestion(overrides?: Partial<TransitionSuggestion>): TransitionSuggestion {
  return {
    id: 's1',
    fromEpisode: 1,
    toEpisode: 2,
    field: 'hooks',
    previousValue: { cliffType: 'c', desc: 'd' },
    suggestedValue: [{ position: 'opening', hookType: 'shock', desc: 'new' }],
    reason: 'cliff-to-hook',
    reasonText: {
      ko: '클리프 → 훅',
      en: 'Cliff → Hook',
      ja: 'クリフ → フック',
      zh: '悬念 → 钩子',
    },
    ...overrides,
  };
}

describe('EpisodeTransitionPanel', () => {
  test('빈 suggestions → 렌더 안 함', () => {
    const { container } = render(
      <EpisodeTransitionPanel
        language="KO"
        suggestions={[]}
        onApply={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('헤더 카운트 표시', () => {
    render(
      <EpisodeTransitionPanel
        language="KO"
        suggestions={[fixSuggestion(), fixSuggestion({ id: 's2' })]}
        onApply={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(screen.getByText(/이전 화 연결 제안 2건/)).toBeInTheDocument();
  });

  test('적용 버튼 클릭 → onApply 호출', () => {
    const handleApply = jest.fn();
    const s = fixSuggestion();
    render(
      <EpisodeTransitionPanel
        language="KO"
        suggestions={[s]}
        onApply={handleApply}
        onDismiss={jest.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /적용/ }));
    expect(handleApply).toHaveBeenCalledWith(s);
  });

  test('무시 버튼 클릭 → onDismiss(id) 호출', () => {
    const handleDismiss = jest.fn();
    const s = fixSuggestion();
    render(
      <EpisodeTransitionPanel
        language="KO"
        suggestions={[s]}
        onApply={jest.fn()}
        onDismiss={handleDismiss}
      />
    );
    // 무시 버튼은 aria-label 검색
    const dismissBtn = screen.getByRole('button', { name: /무시/ });
    fireEvent.click(dismissBtn);
    expect(handleDismiss).toHaveBeenCalledWith(s.id);
  });

  test('reasonText 렌더링', () => {
    render(
      <EpisodeTransitionPanel
        language="EN"
        suggestions={[fixSuggestion()]}
        onApply={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(screen.getByText('Cliff → Hook')).toBeInTheDocument();
  });

  test('4언어 — JP', () => {
    render(
      <EpisodeTransitionPanel
        language="JP"
        suggestions={[fixSuggestion()]}
        onApply={jest.fn()}
        onDismiss={jest.fn()}
      />
    );
    expect(screen.getByText(/前話連結提案/)).toBeInTheDocument();
  });

  test('일괄 무시 버튼 — onDismissAll prop 있을 때만', () => {
    const handleDismissAll = jest.fn();
    render(
      <EpisodeTransitionPanel
        language="KO"
        suggestions={[fixSuggestion()]}
        onApply={jest.fn()}
        onDismiss={jest.fn()}
        onDismissAll={handleDismissAll}
      />
    );
    const all = screen.getAllByText(/모두 무시/);
    fireEvent.click(all[0]);
    expect(handleDismissAll).toHaveBeenCalledTimes(1);
  });
});

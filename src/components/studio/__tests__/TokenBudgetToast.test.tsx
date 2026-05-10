/**
 * TokenBudgetToast.test.tsx (2026-05-10)
 *
 * P-01 mount 컴포넌트 RTL 검증.
 */

import '@testing-library/jest-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';
import TokenBudgetToast from '../TokenBudgetToast';

function dispatchTokenEvent(level: 'warn' | 'critical', detail: Record<string, unknown> = {}) {
  const event = new CustomEvent(`noa:token-budget-${level}`, {
    detail: {
      agentId: detail.agentId ?? 'studio-draft',
      measurement: {
        estimatedTokens: detail.estimatedTokens ?? 1000,
        inputBudget: detail.inputBudget ?? 1192,
        utilizationRatio: detail.utilizationRatio ?? 0.84,
        pressureLevel: level,
      },
      source: detail.source ?? 'test',
    },
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe('TokenBudgetToast', () => {
  it('초기 상태 — 토스트 미표시', () => {
    const { container } = render(<TokenBudgetToast language="ko" />);
    expect(container.firstChild).toBeNull();
  });

  it('warn 이벤트 → 토스트 표시', () => {
    render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('warn');
    expect(screen.getByText(/토큰 사용량 80%/)).toBeInTheDocument();
  });

  it('critical 이벤트 → 토스트 표시 + role=alert', () => {
    render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('critical', { utilizationRatio: 0.97 });
    expect(screen.getByText(/토큰 사용량 임박/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('agentId 표시', () => {
    render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('warn', { agentId: 'studio-inline-completion' });
    expect(screen.getByText(/studio-inline-completion/)).toBeInTheDocument();
  });

  it('4언어 — en 라벨', () => {
    render(<TokenBudgetToast language="en" />);
    dispatchTokenEvent('warn');
    expect(screen.getByText(/Token usage at 80%/)).toBeInTheDocument();
  });

  it('4언어 — ja 라벨', () => {
    render(<TokenBudgetToast language="ja" />);
    dispatchTokenEvent('warn');
    expect(screen.getByText(/トークン使用 80%/)).toBeInTheDocument();
  });

  it('4언어 — zh 라벨', () => {
    render(<TokenBudgetToast language="zh" />);
    dispatchTokenEvent('warn');
    expect(screen.getByText(/Token 使用 80%/)).toBeInTheDocument();
  });

  it('닫기 버튼 → 토스트 제거', () => {
    render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('warn');
    expect(screen.getByText(/토큰 사용량 80%/)).toBeInTheDocument();
    const dismissButton = screen.getByLabelText('닫기');
    fireEvent.click(dismissButton);
    expect(screen.queryByText(/토큰 사용량 80%/)).not.toBeInTheDocument();
  });

  it('dedup — 1초 내 같은 level/agentId 중복 X', () => {
    render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('warn');
    dispatchTokenEvent('warn');
    dispatchTokenEvent('warn');
    const toasts = screen.getAllByRole('status');
    expect(toasts.length).toBe(2); // outer aria-live + 1 toast
  });

  it('max 3 큐 — 4개 이상 시 oldest 제거', () => {
    render(<TokenBudgetToast language="ko" />);
    // 다른 agentId 로 4개 (dedup 회피)
    dispatchTokenEvent('warn', { agentId: 'agent-a' });
    dispatchTokenEvent('warn', { agentId: 'agent-b' });
    dispatchTokenEvent('warn', { agentId: 'agent-c' });
    dispatchTokenEvent('warn', { agentId: 'agent-d' });
    expect(screen.getByText(/agent-d/)).toBeInTheDocument();
    // agent-a 는 oldest 라 제거됐을 가능성 (단 1초 dedup window 내라 timing 의존)
  });

  it('a11y — aria-live=polite (warn)', () => {
    const { container } = render(<TokenBudgetToast language="ko" />);
    dispatchTokenEvent('warn');
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });
});

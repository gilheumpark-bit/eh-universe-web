/**
 * PrismRejectionToast.test.tsx (2026-05-10)
 *
 * M-05 호출 측 통합 mount 컴포넌트 RTL 검증.
 */

import '@testing-library/jest-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PrismRejectionToast from '../PrismRejectionToast';

function dispatchRejection(message: string, level?: string) {
  const event = new CustomEvent('noa:prism-rejection', {
    detail: { message, level },
  });
  act(() => {
    window.dispatchEvent(event);
  });
}

describe('PrismRejectionToast', () => {
  it('초기 — 토스트 미표시', () => {
    const { container } = render(<PrismRejectionToast language="ko" />);
    expect(container.firstChild).toBeNull();
  });

  it('이벤트 수신 → 토스트 표시 + role=alert', () => {
    render(<PrismRejectionToast language="ko" />);
    dispatchRejection('이 콘텐츠는 PRISM 등급 제한.');
    expect(screen.getByText(/PRISM 등급 제한/)).toBeInTheDocument();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('level 표시', () => {
    render(<PrismRejectionToast language="ko" />);
    dispatchRejection('Test', 'mature-18');
    expect(screen.getByText(/mature-18/i)).toBeInTheDocument();
  });

  it('4언어 라벨 — en', () => {
    render(<PrismRejectionToast language="en" />);
    dispatchRejection('Test message');
    expect(screen.getByText(/Noa response declined/)).toBeInTheDocument();
  });

  it('4언어 라벨 — ja', () => {
    render(<PrismRejectionToast language="ja" />);
    dispatchRejection('Test message');
    expect(screen.getByText(/ノア応答の拒否/)).toBeInTheDocument();
  });

  it('닫기 버튼 → 제거', () => {
    render(<PrismRejectionToast language="ko" />);
    dispatchRejection('Test message');
    const btn = screen.getByLabelText('닫기');
    fireEvent.click(btn);
    expect(screen.queryByText(/Test message/)).not.toBeInTheDocument();
  });

  it('dedup — 같은 메시지 3초 내 중복 X', () => {
    render(<PrismRejectionToast language="ko" />);
    dispatchRejection('Same message');
    dispatchRejection('Same message');
    dispatchRejection('Same message');
    // 1개만 노출
    expect(screen.getAllByText('Same message').length).toBe(1);
  });

  it('detail.message 누락 → 무시', () => {
    render(<PrismRejectionToast language="ko" />);
    act(() => {
      window.dispatchEvent(new CustomEvent('noa:prism-rejection', { detail: {} }));
    });
    expect(screen.queryByText(/노아 응답/)).not.toBeInTheDocument();
  });
});

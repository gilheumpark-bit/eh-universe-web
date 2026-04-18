/**
 * EmptyState — 공용 빈 상태 컴포넌트 테스트
 * Covers: 기본 렌더, 아이콘, 설명, 액션 클릭 콜백, compact 모드, role="status" 접근성,
 *         신규 actions[] API + 구 action/secondaryAction 하위 호환, tip 렌더.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Plus, Sparkles } from 'lucide-react';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  // ============================================================
  // PART 1 — 기본 렌더
  // ============================================================

  it('title만 있으면 제목만 표시한다', () => {
    const { getByText, container } = render(<EmptyState title="비어 있음" />);
    expect(getByText('비어 있음')).toBeInTheDocument();
    // description 없음
    expect(container.querySelector('p')).toBeNull();
    // 아이콘 링 없음 — svg 자체가 없어야 함
    expect(container.querySelector('svg')).toBeNull();
    // 버튼 없음
    expect(container.querySelector('button')).toBeNull();
  });

  it('icon prop 전달 시 SVG 아이콘을 렌더한다', () => {
    const { container } = render(<EmptyState title="t" icon={Plus} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    // aria-hidden 적용돼 스크린리더 중복 발화 방지
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('description prop을 렌더한다', () => {
    const { getByText } = render(
      <EmptyState title="t" description="자세한 안내" />,
    );
    expect(getByText('자세한 안내')).toBeInTheDocument();
  });

  // ============================================================
  // PART 2 — actions 콜백
  // ============================================================

  it('actions[] 클릭 시 onClick 콜백이 실행된다', () => {
    const fn = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="t"
        actions={[
          { label: '추가', onClick: fn, variant: 'primary', icon: Plus },
          { label: 'AI 생성', onClick: jest.fn(), icon: Sparkles },
        ]}
      />,
    );
    fireEvent.click(getByText('추가'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('legacy action prop(하위 호환)도 동작한다', () => {
    const fn = jest.fn();
    const { getByText } = render(
      <EmptyState title="t" action={{ label: '다시 시도', onClick: fn }} />,
    );
    fireEvent.click(getByText('다시 시도'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('secondaryAction(구 API)이 두 번째 버튼으로 렌더된다', () => {
    const { container } = render(
      <EmptyState
        title="t"
        action={{ label: '주' }}
        secondaryAction={{ label: '보조' }}
      />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('주');
    expect(buttons[1].textContent).toContain('보조');
  });

  it('action.href 지정 시 <a> 태그로 렌더한다', () => {
    const { container } = render(
      <EmptyState
        title="t"
        actions={[{ label: '문서 보기', href: '/docs', variant: 'primary' }]}
      />,
    );
    const anchor = container.querySelector('a');
    expect(anchor).toBeTruthy();
    expect(anchor?.getAttribute('href')).toBe('/docs');
  });

  // ============================================================
  // PART 3 — compact / tip / 접근성
  // ============================================================

  it('compact 모드는 여백이 축소된다 (py-6 적용)', () => {
    const { container } = render(<EmptyState title="t" compact />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('py-6');
    expect(root.className).not.toContain('py-12');
  });

  it('기본(비-compact) 모드는 py-12을 사용한다', () => {
    const { container } = render(<EmptyState title="t" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('py-12');
  });

  it('tip prop은 💡 프리픽스와 함께 렌더된다', () => {
    const { getByText } = render(
      <EmptyState title="t" tip="Ctrl+K로 빠른 검색" />,
    );
    expect(getByText(/Ctrl\+K로 빠른 검색/)).toBeInTheDocument();
    expect(getByText(/💡/)).toBeInTheDocument();
  });

  it('role="status" 접근성 속성이 적용된다', () => {
    const { container } = render(<EmptyState title="t" />);
    const status = container.querySelector('[role="status"]');
    expect(status).toBeTruthy();
  });
});

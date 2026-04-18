/**
 * TermTooltip — 전문 용어 툴팁 테스트
 * Covers: 사전 매칭 / 비매칭 / hover-click 열기 / outside 닫기 / Escape 닫기 /
 *         키보드 접근 (Enter, Space) / aria-describedby 접근성.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TermTooltip } from '../TermTooltip';

describe('TermTooltip', () => {
  // ============================================================
  // PART 1 — 기본 렌더
  // ============================================================

  it('사전에 있는 용어는 점선 밑줄 + HelpCircle과 함께 렌더된다', () => {
    const { getByRole, container } = render(<TermTooltip term="씬시트" />);
    const trigger = getByRole('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger.className).toContain('decoration-dotted');
    // HelpCircle svg 존재
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('사전에 없는 용어는 children(또는 term)만 그대로 렌더한다 (툴팁 없음)', () => {
    const { queryByRole, getByText } = render(
      <TermTooltip term="존재하지않는용어">플레인 텍스트</TermTooltip>,
    );
    expect(queryByRole('button')).toBeNull();
    expect(getByText('플레인 텍스트')).toBeInTheDocument();
  });

  it('children을 주면 children이 보이고, 없으면 term이 보인다', () => {
    const { getByText, rerender } = render(<TermTooltip term="RAG" />);
    expect(getByText('RAG')).toBeInTheDocument();
    rerender(<TermTooltip term="RAG">검색 증강</TermTooltip>);
    expect(getByText('검색 증강')).toBeInTheDocument();
  });

  // ============================================================
  // PART 2 — 열기/닫기 상호작용
  // ============================================================

  it('클릭 시 툴팁이 열리고 role="tooltip" 요소가 렌더된다', () => {
    const { getByRole, queryByRole } = render(<TermTooltip term="6축 점수" />);
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.click(getByRole('button'));
    expect(getByRole('tooltip')).toBeInTheDocument();
  });

  it('hover(mouseenter) 시 툴팁이 열린다', () => {
    const { getByRole, queryByRole } = render(<TermTooltip term="Voice Guard" />);
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(getByRole('button'));
    expect(getByRole('tooltip')).toBeInTheDocument();
  });

  it('Escape 키로 툴팁이 닫힌다', () => {
    const { getByRole, queryByRole } = render(<TermTooltip term="BYOK" />);
    fireEvent.click(getByRole('button'));
    expect(queryByRole('tooltip')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('외부 포인터 다운 시 툴팁이 닫힌다', () => {
    const { getByRole, queryByRole } = render(
      <div>
        <TermTooltip term="드리프트" />
        <span data-testid="outside">외부</span>
      </div>,
    );
    fireEvent.click(getByRole('button'));
    expect(queryByRole('tooltip')).toBeInTheDocument();
    // 사용자 document 레벨 pointerdown은 jsdom에서 PointerEvent 대신 Event로 디스패치.
    act(() => {
      document.dispatchEvent(new Event('pointerdown'));
    });
    expect(queryByRole('tooltip')).toBeNull();
  });

  // ============================================================
  // PART 3 — 접근성 / 키보드
  // ============================================================

  it('Enter / Space 키로 툴팁이 토글된다', () => {
    const { getByRole, queryByRole } = render(<TermTooltip term="평행우주" />);
    const trigger = getByRole('button');
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(queryByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(queryByRole('tooltip')).toBeInTheDocument();
  });

  it('aria-describedby가 툴팁 id와 일치한다', () => {
    const { getByRole } = render(<TermTooltip term="포모도로" />);
    fireEvent.click(getByRole('button'));
    const trigger = getByRole('button');
    const tooltip = getByRole('tooltip');
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(tooltip.id).toBe(describedBy);
  });
});

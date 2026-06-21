import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SlideOver } from '../SlideOver';

describe('SlideOver', () => {
  it('closed 상태에서는 렌더하지 않는다', () => {
    const { container } = render(
      <SlideOver open={false} onClose={jest.fn()} title="원고 정보">
        내용
      </SlideOver>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('title/description/content를 접근 가능한 dialog로 렌더한다', () => {
    render(
      <SlideOver open onClose={jest.fn()} title="원고 정보" description="출고 전 확인">
        <p>본문 패널</p>
      </SlideOver>,
    );

    const dialog = screen.getByRole('dialog', { name: '원고 정보' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('출고 전 확인')).toBeInTheDocument();
    expect(screen.getByText('본문 패널')).toBeInTheDocument();
  });

  it('backdrop 클릭 시 onClose를 호출한다', () => {
    const onClose = jest.fn();
    render(
      <SlideOver open onClose={onClose} title="원고 정보">
        내용
      </SlideOver>,
    );

    fireEvent.mouseDown(screen.getByTestId('slide-over-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closeOnBackdrop=false면 backdrop 클릭을 무시한다', () => {
    const onClose = jest.fn();
    render(
      <SlideOver open closeOnBackdrop={false} onClose={onClose} title="원고 정보">
        내용
      </SlideOver>,
    );

    fireEvent.mouseDown(screen.getByTestId('slide-over-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('닫기 버튼과 footer를 렌더한다', () => {
    const onClose = jest.fn();
    render(
      <SlideOver open onClose={onClose} title="원고 정보" footer={<button type="button">저장</button>}>
        내용
      </SlideOver>,
    );

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('wide 폭은 설계 backlog의 560px 토큰을 사용한다', () => {
    render(
      <SlideOver open onClose={jest.fn()} title="검수" width="wide">
        내용
      </SlideOver>,
    );

    expect(screen.getByRole('dialog', { name: '검수' })).toHaveClass('max-w-[560px]');
  });

  it('Escape 입력 시 안정화된 onClose를 호출한다', () => {
    const onClose = jest.fn();
    render(
      <SlideOver open onClose={onClose} title="검수">
        <button type="button">초점 대상</button>
      </SlideOver>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

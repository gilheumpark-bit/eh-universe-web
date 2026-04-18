// ============================================================
// PART 1 — Setup & mocks
// ============================================================

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlossaryManagerDialog } from '../GlossaryManagerDialog';

const mockLoad = jest.fn();
const mockSave = jest.fn();

jest.mock('@/lib/translation/project-bridge', () => ({
  loadLocalGlossary: () => mockLoad(),
  saveLocalGlossary: (entries: unknown) => mockSave(entries),
}));

jest.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockReturnValue([]);
  mockSave.mockReturnValue(true);
});

// ============================================================
// PART 2 — Render & basic UI
// ============================================================

describe('GlossaryManagerDialog — render', () => {
  it('open=false → 렌더 안 됨 (null 반환)', () => {
    const { container } = render(
      <GlossaryManagerDialog open={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open=true → 다이얼로그 표시 (role=dialog)', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('KO 기본: "용어집 관리" 타이틀 표시', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    expect(screen.getByText('용어집 관리')).toBeInTheDocument();
  });

  it('빈 상태: 안내 메시지 표시', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    expect(screen.getByText(/저장된 용어가 없/)).toBeInTheDocument();
  });

  it('aria-modal="true" 및 aria-labelledby 설정', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'glossary-dialog-title');
  });
});

// ============================================================
// PART 3 — Add / Delete / Edit flows
// ============================================================

describe('GlossaryManagerDialog — CRUD', () => {
  it('추가 버튼: source 없으면 disabled', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const addBtn = screen.getByRole('button', { name: '추가' });
    expect(addBtn).toBeDisabled();
  });

  it('source 입력 후 추가 버튼 활성화', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const sourceInput = screen.getByPlaceholderText('원문 단어');
    fireEvent.change(sourceInput, { target: { value: '마왕' } });
    const addBtn = screen.getByRole('button', { name: '추가' });
    expect(addBtn).not.toBeDisabled();
  });

  it('추가 버튼 클릭 → saveLocalGlossary 호출', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const sourceInput = screen.getByPlaceholderText('원문 단어');
    const targetInput = screen.getByPlaceholderText('번역 (선택)');
    fireEvent.change(sourceInput, { target: { value: '마왕' } });
    fireEvent.change(targetInput, { target: { value: 'Demon King' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0] as Array<{
      source: string;
      target?: string;
      locked?: boolean;
    }>;
    expect(saved).toHaveLength(1);
    expect(saved[0].source).toBe('마왕');
    expect(saved[0].target).toBe('Demon King');
    expect(saved[0].locked).toBe(true);
  });

  it('Enter 키로 추가 가능', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const sourceInput = screen.getByPlaceholderText('원문 단어');
    fireEvent.change(sourceInput, { target: { value: '용사' } });
    fireEvent.keyDown(sourceInput, { key: 'Enter' });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('기존 entries 로드 후 렌더', () => {
    mockLoad.mockReturnValue([
      { source: '마왕', target: 'Demon King', locked: true },
      { source: '용사', target: 'Hero', locked: false },
    ]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    // inputs with the source values should exist
    expect(screen.getByDisplayValue('마왕')).toBeInTheDocument();
    expect(screen.getByDisplayValue('용사')).toBeInTheDocument();
  });

  it('삭제 버튼 클릭 → 해당 항목 제거', () => {
    mockLoad.mockReturnValue([{ source: '마왕', target: 'Demon King', locked: true }]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const deleteBtn = screen.getByLabelText('삭제');
    fireEvent.click(deleteBtn);
    expect(mockSave).toHaveBeenLastCalledWith([]);
  });

  it('잠금 토글 버튼 클릭 → locked flip', () => {
    mockLoad.mockReturnValue([{ source: '마왕', target: 'Demon King', locked: true }]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const lockBtn = screen.getByLabelText('잠금 해제');
    fireEvent.click(lockBtn);
    expect(mockSave).toHaveBeenLastCalledWith([
      { source: '마왕', target: 'Demon King', locked: false },
    ]);
  });
});

// ============================================================
// PART 4 — Close / Apply / Filter / Lang
// ============================================================

describe('GlossaryManagerDialog — interactions', () => {
  it('X 버튼 클릭 → onClose 호출', () => {
    const onClose = jest.fn();
    render(<GlossaryManagerDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('닫기'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('백드롭 클릭 → onClose 호출', () => {
    const onClose = jest.fn();
    const { container } = render(
      <GlossaryManagerDialog open={true} onClose={onClose} />,
    );
    // backdrop is the outermost div with onClick
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('내부 클릭 → stopPropagation (onClose 미호출)', () => {
    const onClose = jest.fn();
    render(<GlossaryManagerDialog open={true} onClose={onClose} />);
    const dialogInner = screen.getByRole('dialog');
    fireEvent.click(dialogInner);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('필터 입력 → 일치 항목만 표시', () => {
    mockLoad.mockReturnValue([
      { source: '마왕', target: 'Demon King' },
      { source: '용사', target: 'Hero' },
    ]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const filter = screen.getByPlaceholderText('용어 검색...');
    fireEvent.change(filter, { target: { value: '마왕' } });
    // '마왕' filter keyword matches both filter input and the entry input — use
    // target ('Demon King') for scoping since only rendered once.
    expect(screen.getByDisplayValue('Demon King')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Hero')).not.toBeInTheDocument();
  });

  it('onApply 전달 시: 적용 버튼 표시 + 클릭 시 호출', () => {
    mockLoad.mockReturnValue([{ source: 'a' }]);
    const onApply = jest.fn();
    const onClose = jest.fn();
    render(
      <GlossaryManagerDialog
        open={true}
        onClose={onClose}
        onApply={onApply}
      />,
    );
    const applyBtn = screen.getByRole('button', { name: /적용/ });
    fireEvent.click(applyBtn);
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({ source: 'a' }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('onApply 미전달 시: Footer 적용 버튼 없음', () => {
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    // 적용 버튼은 onApply 있을 때만 렌더됨
    expect(screen.queryByRole('button', { name: /^적용/ })).toBeNull();
  });

  it('lang="EN" → 영어 레이블', () => {
    render(
      <GlossaryManagerDialog open={true} onClose={() => {}} lang="EN" />,
    );
    expect(screen.getByText('Glossary Manager')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('lang="JP" → 일본어 레이블', () => {
    render(
      <GlossaryManagerDialog open={true} onClose={() => {}} lang="JP" />,
    );
    expect(screen.getByText('用語集管理')).toBeInTheDocument();
  });

  it('lang="CN" → 중국어 레이블', () => {
    render(
      <GlossaryManagerDialog open={true} onClose={() => {}} lang="CN" />,
    );
    expect(screen.getByText('词汇表管理')).toBeInTheDocument();
  });

  it('Export 버튼: entries 비어 있으면 disabled', () => {
    mockLoad.mockReturnValue([]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const exportBtn = screen.getByLabelText('JSON 내보내기');
    expect(exportBtn).toBeDisabled();
  });

  it('중복 source 추가 → 기존 항목 대체 (length 유지)', () => {
    mockLoad.mockReturnValue([{ source: '마왕', target: 'A', locked: true }]);
    render(<GlossaryManagerDialog open={true} onClose={() => {}} />);
    const sourceInput = screen.getByPlaceholderText('원문 단어');
    const targetInput = screen.getByPlaceholderText('번역 (선택)');
    fireEvent.change(sourceInput, { target: { value: '마왕' } });
    fireEvent.change(targetInput, { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));
    const saved = mockSave.mock.calls[mockSave.mock.calls.length - 1][0];
    expect(saved).toHaveLength(1);
    expect(saved[0].target).toBe('B');
  });
});

// PART-1 | role=Setup | inputs=mocks | outputs=jest env
// PART-2 | role=Render | inputs=props | outputs=dom asserts
// PART-3 | role=CRUD | inputs=input events | outputs=save-call asserts
// PART-4 | role=Interactions | inputs=click/keyboard | outputs=callback asserts

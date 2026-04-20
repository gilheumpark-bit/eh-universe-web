/**
 * DetailPassPreviewModal.test — Accept / Edit / Reject flows + keyboard.
 */
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks
// ============================================================

jest.mock('@/lib/i18n', () => ({
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

import DetailPassPreviewModal from '../DetailPassPreviewModal';

const ORIGINAL = '원본 초안입니다. 짧은 내용.';
const EXPANDED = '확장된 본문입니다. 더 자세한 묘사와 내면 심리와 대사.';

function renderOpen(
  overrides: Partial<React.ComponentProps<typeof DetailPassPreviewModal>> = {},
) {
  const props: React.ComponentProps<typeof DetailPassPreviewModal> = {
    open: true,
    original: ORIGINAL,
    expanded: EXPANDED,
    language: 'KO',
    onAccept: jest.fn(),
    onEdit: jest.fn(),
    onReject: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<DetailPassPreviewModal {...props} />) };
}

// ============================================================
// PART 2 — 렌더 + 기본 콘텐츠
// ============================================================

describe('DetailPassPreviewModal', () => {
  test('open=false → 렌더 안 됨 (null)', () => {
    const { container } = render(
      <DetailPassPreviewModal
        open={false}
        original={ORIGINAL}
        expanded={EXPANDED}
        language="KO"
        onAccept={jest.fn()}
        onEdit={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('open=true → 원본/확장본 모두 렌더', () => {
    renderOpen();
    expect(screen.getByTestId('preview-original')).toHaveTextContent('원본 초안');
    expect(screen.getByTestId('preview-expanded')).toHaveTextContent('확장된 본문');
  });

  test('증분(diff) 헤더 — 확장본 - 원본 길이', () => {
    renderOpen();
    const diff = EXPANDED.length - ORIGINAL.length;
    // 증분은 숫자 + "증분" 레이블 노출
    expect(screen.getByText(new RegExp(`증분.*${diff}`))).toBeInTheDocument();
  });

  // ============================================================
  // PART 3 — Accept / Edit / Reject
  // ============================================================

  test('Accept 버튼 → onAccept 호출', () => {
    const { props } = renderOpen();
    fireEvent.click(screen.getByTestId('preview-accept'));
    expect(props.onAccept).toHaveBeenCalledTimes(1);
  });

  test('Reject 버튼 → onReject 호출', () => {
    const { props } = renderOpen();
    fireEvent.click(screen.getByTestId('preview-reject'));
    expect(props.onReject).toHaveBeenCalledTimes(1);
  });

  test('Edit 버튼 → 편집 모드 진입 → textarea 나타남', () => {
    renderOpen();
    fireEvent.click(screen.getByTestId('preview-edit'));
    expect(screen.getByTestId('preview-expanded-edit')).toBeInTheDocument();
  });

  test('편집 모드에서 Edit 버튼 다시 클릭 → onEdit(editedText)', () => {
    const { props } = renderOpen();
    fireEvent.click(screen.getByTestId('preview-edit')); // 편집 모드 진입
    const ta = screen.getByTestId('preview-expanded-edit') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '내가 고친 본문' } });
    fireEvent.click(screen.getByTestId('preview-edit')); // 저장
    expect(props.onEdit).toHaveBeenCalledWith('내가 고친 본문');
  });

  // ============================================================
  // PART 4 — 키보드
  // ============================================================

  test('ESC → onReject 호출 (useFocusTrap 경유)', () => {
    const { props } = renderOpen();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(props.onReject).toHaveBeenCalledTimes(1);
  });

  test('Enter (비편집 상태, textarea 외부) → onAccept 호출', () => {
    const { props } = renderOpen();
    act(() => {
      fireEvent.keyDown(document, { key: 'Enter' });
    });
    expect(props.onAccept).toHaveBeenCalledTimes(1);
  });

  test('textarea 안에서 Enter → onAccept 호출되지 않음', () => {
    const { props } = renderOpen();
    fireEvent.click(screen.getByTestId('preview-edit'));
    const ta = screen.getByTestId('preview-expanded-edit');
    act(() => {
      fireEvent.keyDown(ta, { key: 'Enter' });
    });
    expect(props.onAccept).not.toHaveBeenCalled();
  });

  // ============================================================
  // PART 5 — focus trap 효과 — aria-modal 세팅 확인
  // ============================================================

  test('dialog 속성 — role/aria-modal/aria-labelledby', () => {
    renderOpen();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'detail-pass-preview-title');
  });
});

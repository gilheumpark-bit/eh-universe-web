/**
 * SavePresetDialog — 저장 다이얼로그 테스트
 * Covers: open/close / role=dialog / 입력 검증 / 4언어 / 저장 호출
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks
// ============================================================

jest.mock('@/lib/i18n', () => ({
  L4: (lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => {
    const raw = typeof lang === 'string' ? lang.toLowerCase() : 'ko';
    if (raw === 'en') return v.en;
    if (raw === 'ja' || raw === 'jp') return v.ja || v.ko;
    if (raw === 'zh' || raw === 'cn') return v.zh || v.ko;
    return v.ko;
  },
}));

jest.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: jest.fn(),
}));

const mockSavePreset = jest.fn();
jest.mock('@/lib/scene-preset-registry', () => {
  const actual = jest.requireActual('@/lib/scene-preset-registry');
  return {
    ...actual,
    savePreset: (...args: unknown[]) => mockSavePreset(...args),
  };
});

import { SavePresetDialog } from '../SavePresetDialog';

beforeEach(() => {
  mockSavePreset.mockReset().mockResolvedValue(true);
});

// ============================================================
// PART 2 — Render & 기본 표시
// ============================================================

describe('SavePresetDialog', () => {
  test('open=false → 렌더 안 함', () => {
    const { container } = render(
      <SavePresetDialog
        open={false}
        onClose={jest.fn()}
        language="KO"
        sceneDirection={{ writerNotes: 'note' }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('open=true → role=dialog + aria-modal=true', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        sceneDirection={{}}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'save-preset-title');
  });

  test('필드 카운트 표시 — 1개 필드', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        sceneDirection={{ writerNotes: 'something' }}
      />
    );
    expect(screen.getByText(/1개 필드/)).toBeInTheDocument();
  });

  test('4언어 — EN', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="EN"
        sceneDirection={{}}
      />
    );
    expect(screen.getByText('Save Preset')).toBeInTheDocument();
  });

  test('4언어 — JP', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="JP"
        sceneDirection={{}}
      />
    );
    expect(screen.getByText('プリセット保存')).toBeInTheDocument();
  });

  test('4언어 — CN', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="CN"
        sceneDirection={{}}
      />
    );
    expect(screen.getByText('保存预设')).toBeInTheDocument();
  });

  // ============================================================
  // PART 3 — 입력 + 저장 플로우
  // ============================================================

  test('빈 이름 → 저장 버튼 비활성', () => {
    render(
      <SavePresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        sceneDirection={{}}
      />
    );
    const saveBtn = screen.getByRole('button', { name: '저장' });
    expect(saveBtn).toBeDisabled();
  });

  test('이름 입력 → 저장 호출', async () => {
    const handleClose = jest.fn();
    const handleSaved = jest.fn();
    render(
      <SavePresetDialog
        open
        onClose={handleClose}
        onSaved={handleSaved}
        language="KO"
        sceneDirection={{ writerNotes: 'note' }}
        currentGenre="romance"
      />
    );
    const nameInput = screen.getByLabelText(/이름/);
    fireEvent.change(nameInput, { target: { value: 'My Preset' } });
    const saveBtn = screen.getByRole('button', { name: '저장' });
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await waitFor(() => {
      expect(mockSavePreset).toHaveBeenCalled();
      const arg = mockSavePreset.mock.calls[0][0];
      expect(arg.name).toBe('My Preset');
      expect(arg.genre).toBe('romance');
      expect(handleSaved).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  test('취소 버튼 → onClose 호출', () => {
    const handleClose = jest.fn();
    render(
      <SavePresetDialog
        open
        onClose={handleClose}
        language="KO"
        sceneDirection={{}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

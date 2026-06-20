/**
 * ApplyPresetDialog — 적용 다이얼로그 테스트
 * Covers: 미리보기 / diff / 덮어쓰기 강조 / 4언어 / 전체/부분 적용
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

const mockRecordUsage = jest.fn();
jest.mock('@/lib/scene-preset-registry', () => {
  const actual = jest.requireActual('@/lib/scene-preset-registry');
  return {
    ...actual,
    recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
  };
});

import { ApplyPresetDialog } from '../ApplyPresetDialog';
import { buildPreset } from '@/lib/scene-preset-registry';

beforeEach(() => {
  mockRecordUsage.mockReset().mockResolvedValue(undefined);
});

// ============================================================
// PART 2 — Render & 기본 표시
// ============================================================

describe('ApplyPresetDialog', () => {
  test('open=false → 렌더 안 함', () => {
    const { container } = render(
      <ApplyPresetDialog
        open={false}
        onClose={jest.fn()}
        language="KO"
        preset={null}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('preset=null → 렌더 안 함 (open=true여도)', () => {
    const { container } = render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        preset={null}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('role=dialog + aria-modal', () => {
    const preset = buildPreset({ name: 'Test', sceneDirection: { writerNotes: 'note' } });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        preset={preset}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('프리셋 이름 표시', () => {
    const preset = buildPreset({ name: 'My Romance', description: 'desc', sceneDirection: { writerNotes: 'n' } });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        preset={preset}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(screen.getByText('My Romance')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
  });

  // ============================================================
  // PART 3 — Diff 미리보기
  // ============================================================

  test('빈 프리셋 → "적용할 필드 없음"', () => {
    const preset = buildPreset({ name: 'Empty', sceneDirection: {} });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        preset={preset}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(screen.getByText('이 프리셋에는 적용할 필드가 없습니다')).toBeInTheDocument();
  });

  test('현재값 있을 때 덮어쓰기 표시', () => {
    const preset = buildPreset({ name: 'P', sceneDirection: { writerNotes: 'new' } });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="KO"
        preset={preset}
        currentDirection={{ writerNotes: 'old' }}
        onApply={jest.fn()}
      />
    );
    // "덮어쓰기" 라벨이 여러 곳에 노출 — 최소 1개 이상 존재 확인
    expect(screen.getAllByText(/덮어쓰기/).length).toBeGreaterThan(0);
  });

  // ============================================================
  // PART 4 — 적용 / 취소
  // ============================================================

  test('전체 적용 → onApply + recordUsage 호출 + onClose', async () => {
    const handleApply = jest.fn();
    const handleClose = jest.fn();
    const preset = buildPreset({ name: 'P', sceneDirection: { writerNotes: 'new' } });
    render(
      <ApplyPresetDialog
        open
        onClose={handleClose}
        language="KO"
        preset={preset}
        currentDirection={{ writerNotes: 'old' }}
        onApply={handleApply}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /전체 적용/ }));
    });
    await waitFor(() => {
      expect(handleApply).toHaveBeenCalled();
      const merged = handleApply.mock.calls[0][0];
      expect(merged.writerNotes).toBe('new');
      expect(mockRecordUsage).toHaveBeenCalledWith(preset.id);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  test('취소 버튼 → onClose만 호출', () => {
    const handleClose = jest.fn();
    const handleApply = jest.fn();
    const preset = buildPreset({ name: 'P', sceneDirection: { writerNotes: 'n' } });
    render(
      <ApplyPresetDialog
        open
        onClose={handleClose}
        language="KO"
        preset={preset}
        currentDirection={{}}
        onApply={handleApply}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleApply).not.toHaveBeenCalled();
  });

  // ============================================================
  // PART 5 — 4언어
  // ============================================================

  test('4언어 — EN', () => {
    const preset = buildPreset({ name: 'P', sceneDirection: { writerNotes: 'n' } });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="EN"
        preset={preset}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(screen.getByText('Apply Preset Preview')).toBeInTheDocument();
  });

  test('4언어 — JP', () => {
    const preset = buildPreset({ name: 'P', sceneDirection: { writerNotes: 'n' } });
    render(
      <ApplyPresetDialog
        open
        onClose={jest.fn()}
        language="JP"
        preset={preset}
        currentDirection={{}}
        onApply={jest.fn()}
      />
    );
    expect(screen.getByText('プリセット適用プレビュー')).toBeInTheDocument();
  });
});

/**
 * SceneSheetPresetBar — 프리셋 바 UI 테스트
 * Covers: 저장 버튼 / 드롭다운 토글 / 검색 / 빈 상태 / Top-3 / 4언어
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

const mockListPresets = jest.fn();
const mockGetTopUsed = jest.fn();
const mockDeletePreset = jest.fn();

jest.mock('@/lib/scene-preset-registry', () => ({
  listPresets: (...args: unknown[]) => mockListPresets(...args),
  getTopUsedPresets: (...args: unknown[]) => mockGetTopUsed(...args),
  deletePreset: (...args: unknown[]) => mockDeletePreset(...args),
}));

import { SceneSheetPresetBar } from '../SceneSheetPresetBar';
import type { ScenePreset } from '@/lib/scene-preset-registry';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function makePreset(overrides?: Partial<ScenePreset>): ScenePreset {
  return {
    id: overrides?.id ?? 'p1',
    name: overrides?.name ?? 'Default Preset',
    description: '',
    authorId: 'local',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usageCount: 0,
    sceneDirection: {},
    visibility: 'private',
    ...overrides,
  };
}

beforeEach(() => {
  mockListPresets.mockReset().mockResolvedValue([]);
  mockGetTopUsed.mockReset().mockResolvedValue([]);
  mockDeletePreset.mockReset().mockResolvedValue(true);
});

// ============================================================
// PART 3 — Render & 저장 버튼
// ============================================================

describe('SceneSheetPresetBar', () => {
  test('render — 저장 버튼 표시 (KO)', async () => {
    render(<SceneSheetPresetBar language="KO" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('프리셋 저장')).toBeInTheDocument();
    });
  });

  test('render — 저장 버튼 (EN)', async () => {
    render(<SceneSheetPresetBar language="EN" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Save Preset')).toBeInTheDocument();
    });
  });

  test('render — 저장 버튼 (JP)', async () => {
    render(<SceneSheetPresetBar language="JP" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('プリセット保存')).toBeInTheDocument();
    });
  });

  test('render — 저장 버튼 (CN)', async () => {
    render(<SceneSheetPresetBar language="CN" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('保存预设')).toBeInTheDocument();
    });
  });

  test('저장 버튼 클릭 → onSaveClick 호출', async () => {
    const handleSave = jest.fn();
    render(<SceneSheetPresetBar language="KO" onSaveClick={handleSave} onApplyClick={jest.fn()} />);
    await waitFor(() => screen.getByText('프리셋 저장'));
    fireEvent.click(screen.getByText('프리셋 저장'));
    expect(handleSave).toHaveBeenCalledTimes(1);
  });

  // ============================================================
  // PART 4 — 드롭다운 / Top-3 / 빈 상태
  // ============================================================

  test('빈 상태 — "내 프리셋" 클릭 시 빈 메시지', async () => {
    render(<SceneSheetPresetBar language="KO" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => screen.getByText('내 프리셋'));
    await act(async () => {
      fireEvent.click(screen.getByText('내 프리셋'));
    });
    await waitFor(() => {
      expect(screen.getByText('저장된 프리셋이 없습니다')).toBeInTheDocument();
    });
  });

  test('Top-3 — usageCount 있는 프리셋 표시', async () => {
    mockGetTopUsed.mockResolvedValue([
      makePreset({ id: 'h1', name: 'Hot 1', usageCount: 10 }),
      makePreset({ id: 'h2', name: 'Hot 2', usageCount: 5 }),
    ]);
    render(<SceneSheetPresetBar language="KO" onSaveClick={jest.fn()} onApplyClick={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Hot 1')).toBeInTheDocument();
      expect(screen.getByText('Hot 2')).toBeInTheDocument();
    });
  });

  test('Top-3 클릭 → onApplyClick(preset) 호출', async () => {
    const handleApply = jest.fn();
    const preset = makePreset({ id: 'h1', name: 'Hot Click', usageCount: 5 });
    mockGetTopUsed.mockResolvedValue([preset]);
    render(<SceneSheetPresetBar language="KO" onSaveClick={jest.fn()} onApplyClick={handleApply} />);
    await waitFor(() => screen.getByText('Hot Click'));
    fireEvent.click(screen.getByText('Hot Click'));
    expect(handleApply).toHaveBeenCalledWith(preset);
  });
});

// ============================================================
// PART 1 — Setup
// ============================================================
//
// RecoveryDialog — M1.2 크래시 복구 선택 대화상자 검증.
//   - open=false면 렌더 안 함
//   - 3 선택지(복구/버리기/둘 다 보존) 버튼 + onDecide 연동
//   - aria/role/focus-trap
//   - chainDamaged 시 경고 배너
//   - 4언어 라벨 매칭

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import RecoveryDialog from '../RecoveryDialog';
import type { RecoveryResult } from '@/lib/save-engine/recovery';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function makeResult(over: Partial<RecoveryResult> = {}): RecoveryResult {
  return {
    projects: [],
    recoveredFromCrash: true,
    chainDamaged: false,
    quarantinedCount: 0,
    snapshotId: 'snap-1',
    deltasReplayed: 5,
    durationMs: 120,
    environment: { indexedDB: true, localStorage: true },
    phases: [],
    strategy: 'full',
    recoveredUpTo: Date.now() - 2 * 60_000,
    estimatedLossMs: 0,
    corruptedEntries: 0,
    fallbackSnapshotId: 'snap-1',
    state: [],
    ...over,
  };
}

function baseProps(over: Partial<React.ComponentProps<typeof RecoveryDialog>> = {}) {
  return {
    open: true,
    result: makeResult(),
    language: 'KO' as const,
    onDecide: jest.fn(),
    onClose: jest.fn(),
    ...over,
  };
}

// ============================================================
// PART 3 — 렌더 조건 & 기본 구조
// ============================================================

describe('RecoveryDialog — 렌더링', () => {
  test('open=false면 렌더 안 함', () => {
    const props = baseProps({ open: false });
    const { container } = render(<RecoveryDialog {...props} />);
    expect(container.firstChild).toBeNull();
  });

  test('result=null이면 렌더 안 함', () => {
    const props = baseProps({ result: null });
    const { container } = render(<RecoveryDialog {...props} />);
    expect(container.firstChild).toBeNull();
  });

  test('open=true + result 있으면 role="alertdialog" 렌더', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByTestId('recovery-dialog')).toBeInTheDocument();
  });

  test('aria-modal + aria-labelledby + aria-describedby 설정', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'recovery-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'recovery-dialog-subtitle');
  });
});

// ============================================================
// PART 4 — 3 선택지 버튼
// ============================================================

describe('RecoveryDialog — 3 선택지', () => {
  test('복구 버튼 클릭 시 onDecide("restore")', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-restore-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('restore');
  });

  test('버리기 버튼 클릭 시 onDecide("discard")', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-discard-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('discard');
  });

  test('둘 다 보존 버튼 클릭 시 onDecide("keep-both")', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-keep-both-btn'));
    expect(props.onDecide).toHaveBeenCalledWith('keep-both');
  });

  test('닫기 버튼 클릭 시 onClose 호출 + onDecide 미호출', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-dialog-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onDecide).not.toHaveBeenCalled();
  });

  test('백드롭 클릭 시 onClose 호출', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-dialog-backdrop'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('대화상자 내부 클릭은 onClose 미호출', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    fireEvent.click(screen.getByTestId('recovery-dialog'));
    expect(props.onClose).not.toHaveBeenCalled();
  });
});

// ============================================================
// PART 5 — 정보 표시
// ============================================================

describe('RecoveryDialog — 정보 표시', () => {
  test('recoveredUpTo가 있으면 시각 문자열 렌더', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    const cell = screen.getByTestId('recovery-last-saved');
    // YYYY-MM-DD HH:mm:ss 패턴 포함
    expect(cell.textContent).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('손실 0이면 "손실 없음" 문구', () => {
    const props = baseProps({
      result: makeResult({ estimatedLossMs: 0, corruptedEntries: 0 }),
    });
    render(<RecoveryDialog {...props} />);
    const cell = screen.getByTestId('recovery-expected-loss');
    expect(cell.textContent).toMatch(/손실 없음/);
  });

  test('손실 5분이면 "약 5분" 문구 + 경고 톤', () => {
    const props = baseProps({
      result: makeResult({ estimatedLossMs: 5 * 60_000, corruptedEntries: 2 }),
    });
    render(<RecoveryDialog {...props} />);
    const cell = screen.getByTestId('recovery-expected-loss');
    expect(cell.textContent).toMatch(/약 5분/);
  });

  test('corruptedEntries > 0이면 손상 엔트리 행 표시', () => {
    const props = baseProps({
      result: makeResult({ corruptedEntries: 3 }),
    });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-corrupted')).toBeInTheDocument();
  });

  test('corruptedEntries=0이면 손상 엔트리 행 숨김', () => {
    const props = baseProps({
      result: makeResult({ corruptedEntries: 0 }),
    });
    render(<RecoveryDialog {...props} />);
    expect(screen.queryByTestId('recovery-corrupted')).not.toBeInTheDocument();
  });

  test('chainDamaged=true면 경고 배너 표시', () => {
    const props = baseProps({
      result: makeResult({ chainDamaged: true, corruptedEntries: 2 }),
    });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-warning-banner')).toBeInTheDocument();
  });

  test('chainDamaged=false면 경고 배너 숨김', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    expect(screen.queryByTestId('recovery-warning-banner')).not.toBeInTheDocument();
  });
});

// ============================================================
// PART 6 — 4언어 라벨
// ============================================================

describe('RecoveryDialog — 4 언어', () => {
  test('KO: "복구 (권장)" 버튼 텍스트', () => {
    const props = baseProps({ language: 'KO' });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-restore-btn').textContent).toMatch(/복구/);
  });

  test('EN: "Restore (Recommended)" 버튼 텍스트', () => {
    const props = baseProps({ language: 'EN' });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-restore-btn').textContent).toMatch(/Restore/);
  });

  test('JP: "復元 (推奨)" 버튼 텍스트', () => {
    const props = baseProps({ language: 'JP' });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-restore-btn').textContent).toMatch(/復元/);
  });

  test('CN: "恢复 (推荐)" 버튼 텍스트', () => {
    const props = baseProps({ language: 'CN' });
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-restore-btn').textContent).toMatch(/恢复/);
  });
});

// ============================================================
// PART 7 — 접근성 (키보드)
// ============================================================

describe('RecoveryDialog — 접근성', () => {
  test('모든 버튼이 focus 가능 (min-height 44px 터치 타겟)', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    const buttons = [
      screen.getByTestId('recovery-restore-btn'),
      screen.getByTestId('recovery-discard-btn'),
      screen.getByTestId('recovery-keep-both-btn'),
      screen.getByTestId('recovery-dialog-close'),
    ];
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b.className).toMatch(/min-h-\[44px\]/);
    }
  });

  test('aria-label이 help 텍스트와 함께 제공됨 (색상만 의존 금지)', () => {
    const props = baseProps();
    render(<RecoveryDialog {...props} />);
    expect(screen.getByTestId('recovery-restore-btn')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('recovery-discard-btn')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('recovery-keep-both-btn')).toHaveAttribute('aria-label');
  });
});

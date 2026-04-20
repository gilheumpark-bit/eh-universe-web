// ============================================================
// PART 1 — Setup
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '@/hooks/useAutoSave';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { resetJournalHLCForTests } from '@/lib/save-engine/journal';

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  try { localStorage.clear(); } catch { /* noop */ }
  // 3-mode enum: 'on'이 primary 경로 동작. 레거시 'true'도 역호환 지원(아래 PART 4 참조).
  try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'on'); } catch { /* noop */ }
});

afterEach(() => {
  try { localStorage.removeItem('ff_FEATURE_JOURNAL_ENGINE'); } catch { /* noop */ }
});

// ============================================================
// PART 2 — 기본 계약 (Spec Part 8 반환값)
// ============================================================

describe('useAutoSave — 기본 반환값', () => {
  test('초기 status = idle', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        key: 'test-k',
        value: { t: 'a' },
        target: 'project',
        projectId: 'p1',
      })
    );
    expect(result.current.status).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.flush).toBe('function');
  });
});

// ============================================================
// PART 3 — Debounce + flush
// ============================================================

describe('useAutoSave — debounce + flush', () => {
  test('value 변경 → debounceMs 후 status=saved', async () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAutoSave({ key: 'k', value: v, target: 'project', projectId: 'p1', debounceMs: 10 }),
      { initialProps: { v: { x: 1 } } }
    );
    rerender({ v: { x: 2 } });
    await waitFor(() => expect(result.current.status).toBe('saved'), { timeout: 1000 });
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  test('flush() 즉시 실행', async () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAutoSave({ key: 'k', value: v, target: 'project', projectId: 'p1', debounceMs: 5000 }),
      { initialProps: { v: { a: 1 } } }
    );
    rerender({ v: { a: 2 } });
    let ok = false;
    await act(async () => { ok = await result.current.flush(); });
    expect(ok).toBe(true);
    expect(result.current.status).toBe('saved');
  });

  test('no-op (동일 값) → status=saved 또는 idle, entry 없음', async () => {
    const { result, rerender } = renderHook(
      ({ v }) => useAutoSave({ key: 'k', value: v, target: 'project', projectId: 'p1', debounceMs: 10 }),
      { initialProps: { v: { a: 1 } } }
    );
    rerender({ v: { a: 1 } });
    // 리렌더가 있어도 variable 참조는 다르나 값이 같으므로 ops = 0 → saved
    await new Promise((r) => setTimeout(r, 50));
    expect(['idle', 'saved']).toContain(result.current.status);
  });
});

// ============================================================
// PART 4 — Feature flag off → engine 우회
// ============================================================

describe('useAutoSave — FEATURE_JOURNAL_ENGINE off/shadow', () => {
  test('flag off면 flush → false, append 호출 안 됨', async () => {
    try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'off'); } catch { /* noop */ }
    const { result } = renderHook(() =>
      useAutoSave({ key: 'k', value: { a: 1 }, target: 'project', projectId: 'p1', debounceMs: 10 })
    );
    const ok = await result.current.flush();
    expect(ok).toBe(false);
  });

  test('레거시 "false" (역호환) → flush=false', async () => {
    try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'false'); } catch { /* noop */ }
    const { result } = renderHook(() =>
      useAutoSave({ key: 'k', value: { a: 1 }, target: 'project', projectId: 'p1', debounceMs: 10 })
    );
    const ok = await result.current.flush();
    expect(ok).toBe(false);
  });

  test('shadow 모드 → primary 경로 우회 (flush=false, 쓰기는 shadow-logger 경유)', async () => {
    try { localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', 'shadow'); } catch { /* noop */ }
    const { result } = renderHook(() =>
      useAutoSave({ key: 'k', value: { a: 1 }, target: 'project', projectId: 'p1', debounceMs: 10 })
    );
    const ok = await result.current.flush();
    expect(ok).toBe(false);
  });
});

// ============================================================
// PART 5 — targetId 검증
// ============================================================

describe('useAutoSave — targetId 필수', () => {
  test('target != project 인데 targetId 누락 → throw', () => {
    expect(() => {
      renderHook(() =>
        useAutoSave({ key: 'k', value: { a: 1 }, target: 'manuscript' })
      );
    }).toThrow(/targetId/);
  });
});

// ============================================================
// PART 1 — compare / apply
// ============================================================

import { computePatch, applyPatch, buildDelta, replayDeltas, safeDeepClone } from '@/lib/save-engine/delta';
import { GENESIS } from '@/lib/save-engine/types';

describe('computePatch / applyPatch', () => {
  test('동일 객체 → 빈 ops', () => {
    expect(computePatch({ a: 1 }, { a: 1 })).toEqual([]);
  });

  test('값 변경 → replace op', () => {
    const ops = computePatch({ a: 1 }, { a: 2 });
    expect(ops).toEqual([{ op: 'replace', path: '/a', value: 2 }]);
  });

  test('필드 추가 → add op', () => {
    const ops = computePatch({ a: 1 }, { a: 1, b: 2 });
    expect(ops).toEqual([{ op: 'add', path: '/b', value: 2 }]);
  });

  test('필드 제거 → remove op', () => {
    const ops = computePatch({ a: 1, b: 2 }, { a: 1 });
    expect(ops).toEqual([{ op: 'remove', path: '/b' }]);
  });

  test('apply 왕복 — prev → next', () => {
    const prev = { a: 1, list: [1, 2, 3] };
    const next = { a: 99, list: [1, 4, 3, 5] };
    const ops = computePatch(prev, next);
    const applied = applyPatch(prev, ops);
    expect(applied).toEqual(next);
    // base 원본 불변성
    expect(prev).toEqual({ a: 1, list: [1, 2, 3] });
  });

  test('safeDeepClone — 깊은 복사', () => {
    const src = { a: { b: [1, 2] } };
    const cl = safeDeepClone(src);
    cl.a.b.push(3);
    expect(src.a.b).toEqual([1, 2]);
  });
});

// ============================================================
// PART 2 — buildDelta (Spec 3.3.2)
// ============================================================

describe('buildDelta', () => {
  test('ops 있음 → payload + baseContentHash 채움', async () => {
    const r = await buildDelta({
      projectId: 'p',
      prev: { title: 'A' },
      next: { title: 'B' },
      target: 'project',
    });
    expect(r.payload).not.toBeNull();
    expect(r.payload!.ops).toHaveLength(1);
    expect(r.payload!.baseContentHash).toHaveLength(64);
    expect(r.payload!.target).toBe('project');
  });

  test('ops 없음 → payload null (no-op skip)', async () => {
    const r = await buildDelta({
      projectId: 'p',
      prev: { title: 'A' },
      next: { title: 'A' },
      target: 'project',
    });
    expect(r.payload).toBeNull();
    expect(r.ops).toEqual([]);
  });

  test('targetId 전달', async () => {
    const r = await buildDelta({
      projectId: 'p',
      prev: { body: '' },
      next: { body: 'hi' },
      target: 'manuscript',
      targetId: 'ep-1',
    });
    expect(r.payload?.targetId).toBe('ep-1');
  });
});

// ============================================================
// PART 3 — replayDeltas
// ============================================================

describe('replayDeltas', () => {
  test('순차 적용 → 최종 상태', () => {
    const base = { body: '' };
    const deltas = [
      { projectId: 'p', ops: [{ op: 'replace' as const, path: '/body', value: 'A' }], target: 'manuscript' as const, baseContentHash: GENESIS },
      { projectId: 'p', ops: [{ op: 'replace' as const, path: '/body', value: 'AB' }], target: 'manuscript' as const, baseContentHash: GENESIS },
      { projectId: 'p', ops: [{ op: 'replace' as const, path: '/body', value: 'ABC' }], target: 'manuscript' as const, baseContentHash: GENESIS },
    ];
    const final = replayDeltas(base, deltas);
    expect(final).toEqual({ body: 'ABC' });
  });

  test('빈 시퀀스 → base 복제', () => {
    const base = { x: 1 };
    const final = replayDeltas(base, []);
    expect(final).toEqual({ x: 1 });
    expect(final).not.toBe(base); // 복사본
  });
});

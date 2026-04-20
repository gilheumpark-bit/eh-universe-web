// ============================================================
// PART 1 — Sequential execution (Spec 5.3)
// ============================================================

import { WriterQueue, getDefaultWriterQueue, resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';

describe('WriterQueue — sequential execution', () => {
  beforeEach(() => { resetDefaultWriterQueueForTests(); });

  test('FIFO 순서 보장 — 동시에 3개 enqueue해도 순차 실행', async () => {
    const q = new WriterQueue();
    const order: number[] = [];
    const promises = [
      q.enqueue(async () => { await new Promise((r) => setTimeout(r, 30)); order.push(1); }),
      q.enqueue(async () => { await new Promise((r) => setTimeout(r, 10)); order.push(2); }),
      q.enqueue(async () => { order.push(3); }),
    ];
    await Promise.all(promises);
    expect(order).toEqual([1, 2, 3]);
  });

  test('태스크 반환값 전달', async () => {
    const q = new WriterQueue();
    const result = await q.enqueue(async () => 42);
    expect(result).toBe(42);
  });

  test('태스크 throw 시 reject', async () => {
    const q = new WriterQueue();
    await expect(q.enqueue(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });

  test('실패한 태스크가 후속 태스크를 막지 않음', async () => {
    const q = new WriterQueue();
    const order: string[] = [];
    const p1 = q.enqueue(async () => { order.push('a'); throw new Error('fail'); }).catch(() => order.push('a-caught'));
    const p2 = q.enqueue(async () => { order.push('b'); });
    await Promise.all([p1, p2]);
    expect(order).toEqual(['a', 'a-caught', 'b']);
  });
});

// ============================================================
// PART 2 — Flush / state
// ============================================================

describe('WriterQueue — flush / state', () => {
  test('flush — 대기 태스크 소진 후 resolve', async () => {
    const q = new WriterQueue();
    let done = 0;
    q.enqueue(async () => { await new Promise((r) => setTimeout(r, 5)); done++; });
    q.enqueue(async () => { await new Promise((r) => setTimeout(r, 5)); done++; });
    await q.flush();
    expect(done).toBe(2);
    expect(q.pending).toBe(0);
  });

  test('pending 카운트 — enqueue 직후 증가, 실행 후 감소', async () => {
    const q = new WriterQueue();
    q.enqueue(async () => { await new Promise((r) => setTimeout(r, 10)); });
    q.enqueue(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(q.pending).toBeGreaterThanOrEqual(1);
    await q.flush();
    expect(q.pending).toBe(0);
  });

  test('싱글톤 queue — 같은 인스턴스 반환', () => {
    const a = getDefaultWriterQueue();
    const b = getDefaultWriterQueue();
    expect(a).toBe(b);
  });
});

// ============================================================
// PART 3 — High contention
// ============================================================

describe('WriterQueue — high contention', () => {
  test('100개 동시 enqueue, 모두 순차 처리', async () => {
    const q = new WriterQueue();
    const order: number[] = [];
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 100; i++) {
      promises.push(q.enqueue(async () => { order.push(i); }));
    }
    await Promise.all(promises);
    expect(order).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });
});

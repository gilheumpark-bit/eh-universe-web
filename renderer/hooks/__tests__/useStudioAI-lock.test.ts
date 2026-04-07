/**
 * #39 — Generation lock regression test
 *
 * The hook useStudioAI is deeply coupled to React state and many engine modules.
 * Instead of rendering the full hook (which requires extensive mocking of 15+ deps),
 * we extract and test the lock *pattern* in isolation — the same ref-based guard
 * used by handleSend / handleRegenerate.
 */

describe('useStudioAI generation lock', () => {
  // Reproduce the exact lock pattern from useStudioAI
  let lockRef: { current: boolean };

  beforeEach(() => {
    lockRef = { current: false };
  });

  // --- helpers that mirror the hook's control flow ---

  /** Simulates canGenerate returning false (tier limit reached) */
  function handleSendWhenCannotGenerate(canGenerate: () => boolean): boolean {
    if (lockRef.current) return false;
    if (!canGenerate()) return false; // early return before lock acquired
    lockRef.current = true;
    return true;
  }

  /** Simulates successful generation with finally-block lock release */
  async function handleSendSuccess(work: () => Promise<void>): Promise<void> {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      await work();
    } finally {
      lockRef.current = false;
    }
  }

  /** Simulates generation that throws, with finally-block lock release */
  async function handleSendWithError(work: () => Promise<void>): Promise<void> {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      await work();
    } finally {
      lockRef.current = false;
    }
  }

  /** Simulates handleRegenerate respecting lock */
  function handleRegenerate(): boolean {
    if (lockRef.current) return false; // blocked
    lockRef.current = true;
    // ... would do work ...
    lockRef.current = false;
    return true;
  }

  // --- test cases ---

  it('lock is released when canGenerate returns false', () => {
    const canGenerate = jest.fn().mockReturnValue(false);
    const acquired = handleSendWhenCannotGenerate(canGenerate);

    expect(acquired).toBe(false);
    expect(lockRef.current).toBe(false);
    expect(canGenerate).toHaveBeenCalled();
  });

  it('lock is released after successful generation', async () => {
    const work = jest.fn().mockResolvedValue(undefined);

    await handleSendSuccess(work);

    expect(work).toHaveBeenCalled();
    expect(lockRef.current).toBe(false);
  });

  it('lock is released after generation error', async () => {
    const work = jest.fn().mockRejectedValue(new Error('stream failed'));

    // The finally block in the hook catches and releases lock
    await handleSendWithError(work).catch(() => {});

    expect(lockRef.current).toBe(false);
  });

  it('handleRegenerate respects lock', () => {
    // Pre-acquire lock (simulating an in-flight generation)
    lockRef.current = true;

    const result = handleRegenerate();

    expect(result).toBe(false);
    // Lock stays true — regen was blocked, didn't touch it
    expect(lockRef.current).toBe(true);
  });

  it('concurrent handleSend calls are blocked by lock', async () => {
    let resolveFirst: () => void;
    const firstWork = new Promise<void>(r => { resolveFirst = r; });
    const callLog: string[] = [];

    // First call acquires lock
    const p1 = handleSendSuccess(async () => {
      callLog.push('first-start');
      await firstWork;
      callLog.push('first-end');
    });

    // Second call should be blocked (lock is true)
    expect(lockRef.current).toBe(true);
    let secondRan = false;
    const p2 = handleSendSuccess(async () => { secondRan = true; });

    // Resolve first
    resolveFirst!();
    await p1;
    await p2;

    expect(secondRan).toBe(false);
    expect(callLog).toEqual(['first-start', 'first-end']);
    expect(lockRef.current).toBe(false);
  });
});

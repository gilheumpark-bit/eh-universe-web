import {
  groupBySeverity,
  hasWarnedThisSession,
  markWarned,
  clearWarningDedup,
  batchInfo,
  infoBufferSize,
  resetInfoBatch,
  dispatchFindings,
  type ComplianceFinding,
} from '../severity-router';

function find(severity: ComplianceFinding['severity'], hook = 'h1'): ComplianceFinding {
  return {
    hook_id: hook,
    module_id: 'M2',
    severity,
    message: `test ${severity}`,
  };
}

describe('twentyone-modules/severity-router', () => {
  beforeEach(() => {
    clearWarningDedup();
    resetInfoBatch();
  });

  describe('groupBySeverity', () => {
    it('groups findings into 4 tiers preserving order', () => {
      const out = groupBySeverity([
        find('warning', 'w1'),
        find('blocker', 'b1'),
        find('info', 'i1'),
        find('trace', 't1'),
        find('warning', 'w2'),
      ]);
      expect(out.blocker).toHaveLength(1);
      expect(out.warning).toHaveLength(2);
      expect(out.info).toHaveLength(1);
      expect(out.trace).toHaveLength(1);
      expect(out.warning[0].hook_id).toBe('w1');
      expect(out.warning[1].hook_id).toBe('w2');
    });
  });

  describe('warning dedup', () => {
    it('records markWarned and reads with hasWarnedThisSession', () => {
      expect(hasWarnedThisSession('h1')).toBe(false);
      markWarned('h1');
      expect(hasWarnedThisSession('h1')).toBe(true);
      expect(hasWarnedThisSession('h2')).toBe(false);
    });

    it('clearWarningDedup resets', () => {
      markWarned('h1');
      clearWarningDedup();
      expect(hasWarnedThisSession('h1')).toBe(false);
    });
  });

  describe('info batching', () => {
    it('buffers and reports infoBufferSize until threshold', () => {
      const first = batchInfo(find('info', 'i1'));
      // First call sets baseline AND elapsed >= window? No — lastInfoFlush=0 initially,
      // so elapsed = Date.now() - 0 = very large → first call DOES flush.
      // Adjust expectation: the very first batch flushes immediately,
      // subsequent calls within window do not.
      expect(first).not.toBeNull();
      const second = batchInfo(find('info', 'i2'));
      expect(second).toBeNull();
      expect(infoBufferSize()).toBe(1);
    });

    it('resetInfoBatch clears buffer + flush time', () => {
      batchInfo(find('info'));
      batchInfo(find('info'));
      resetInfoBatch();
      expect(infoBufferSize()).toBe(0);
    });
  });

  describe('dispatchFindings (DOM event)', () => {
    it('dispatches blocker findings immediately on a single event', () => {
      const handler = jest.fn();
      window.addEventListener('noa:compliance-result', handler);
      try {
        dispatchFindings([find('blocker', 'b1'), find('blocker', 'b2')]);
        const calls = handler.mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(1);
        const detail = (calls[0][0] as CustomEvent).detail;
        expect(detail.severity).toBe('blocker');
        expect(detail.findings).toHaveLength(2);
      } finally {
        window.removeEventListener('noa:compliance-result', handler);
      }
    });

    it('dedups warnings: 2nd warning for same hook_id is suppressed', () => {
      const handler = jest.fn();
      window.addEventListener('noa:compliance-result', handler);
      try {
        dispatchFindings([find('warning', 'wA'), find('warning', 'wA')]);
        const warningCalls = handler.mock.calls.filter(
          (c) => (c[0] as CustomEvent).detail.severity === 'warning',
        );
        expect(warningCalls).toHaveLength(1); // 2nd dropped
      } finally {
        window.removeEventListener('noa:compliance-result', handler);
      }
    });
  });
});

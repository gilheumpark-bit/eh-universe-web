// jsdom lacks crypto.subtle. Mock source-recorder's SHA-256 helper with node:crypto.
// Matches the pattern used in creative-process tests (report-builder.test.ts, submission-package.test.ts).
jest.mock('@/lib/creative-process/source-recorder', () => {
  const { createHash } = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return {
    computeSha256Hex: async (text: string): Promise<string> => {
      return createHash('sha256').update(text).digest('hex');
    },
  };
});

import {
  createEndingLock,
  verifyEndingLock,
  computeEndingLockHash,
  runEndingMatchCheck,
  type CreateEndingLockInput,
} from '../ending-lock';
import type { EndingLock } from '../types';

const minimalInput: CreateEndingLockInput = {
  work_id: 'work-test-1',
  final_chapter_number: 100,
  final_image: 'The protagonist watches the sun rise over the rebuilt city.',
  protagonist_final_state: {
    external: 'Restored as guardian',
    internal: 'At peace with the cost',
    relational: 'Reconciled with the rival',
  },
  world_final_state: 'The cycle of betrayal is broken.',
  theme_resolution: 'Trust can be rebuilt one act at a time.',
  must_payoffs: ['thread-A', 'thread-B'],
  banned_reversals: ['protagonist dies in vain', 'rival is revealed as illusion'],
  lock_level: 'hard',
  locked_by: 'author',
};

describe('twentyone-modules/ending-lock', () => {
  describe('createEndingLock', () => {
    it('builds a complete EndingLock with hash, id, and timestamps', async () => {
      const lock = await createEndingLock(minimalInput);
      expect(lock.id).toMatch(/^el-/);
      expect(lock.work_id).toBe('work-test-1');
      expect(lock.validation_hash).toHaveLength(64); // SHA-256 hex
      expect(lock.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(lock.lock_level).toBe('hard');
      expect(lock.must_payoffs).toEqual(['thread-A', 'thread-B']);
    });

    it('produces a hash that is order-invariant for must_payoffs', async () => {
      const a = await createEndingLock({ ...minimalInput, must_payoffs: ['x', 'y', 'z'] });
      const b = await createEndingLock({ ...minimalInput, must_payoffs: ['z', 'x', 'y'] });
      expect(a.validation_hash).toBe(b.validation_hash);
    });
  });

  describe('verifyEndingLock', () => {
    it('returns true for an untampered lock', async () => {
      const lock = await createEndingLock(minimalInput);
      expect(await verifyEndingLock(lock)).toBe(true);
    });

    it('returns false when banned_reversals tampered', async () => {
      const lock = await createEndingLock(minimalInput);
      const tampered: EndingLock = {
        ...lock,
        banned_reversals: [...lock.banned_reversals, 'sneaky-injection'],
      };
      expect(await verifyEndingLock(tampered)).toBe(false);
    });

    it('returns false when theme_resolution tampered', async () => {
      const lock = await createEndingLock(minimalInput);
      const tampered: EndingLock = { ...lock, theme_resolution: 'different theme' };
      expect(await verifyEndingLock(tampered)).toBe(false);
    });
  });

  describe('runEndingMatchCheck', () => {
    it('emits trace finding when no lock is set', async () => {
      const findings = runEndingMatchCheck({
        // @ts-expect-error — intentional null lock test
        lock: null,
        final_episode_manuscript: 'arbitrary text',
        current_episode: 1,
      });
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('trace');
    });

    it('flags banned_reversal as blocker on hard lock', async () => {
      const lock = await createEndingLock(minimalInput);
      const findings = runEndingMatchCheck({
        lock,
        final_episode_manuscript: 'In the last scene, protagonist dies in vain.',
        current_episode: 100,
      });
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const banned = findings.find((f) => f.message.includes('Banned reversal'));
      expect(banned?.severity).toBe('blocker');
    });

    it('downgrades banned_reversal to warning on soft lock', async () => {
      const lock = await createEndingLock({ ...minimalInput, lock_level: 'soft' });
      const findings = runEndingMatchCheck({
        lock,
        final_episode_manuscript: 'And so, protagonist dies in vain.',
        current_episode: 100,
      });
      const banned = findings.find((f) => f.message.includes('Banned reversal'));
      expect(banned?.severity).toBe('warning');
    });

    it('flags missing final_image at planned final chapter', async () => {
      const lock = await createEndingLock(minimalInput);
      const findings = runEndingMatchCheck({
        lock,
        final_episode_manuscript: 'Something totally unrelated to the planned ending.',
        current_episode: 100,
      });
      const imgMiss = findings.find((f) => f.message.includes('Final image'));
      expect(imgMiss).toBeDefined();
      expect(imgMiss?.severity).toBe('blocker'); // hard locked
    });
  });

  describe('computeEndingLockHash (canonical form)', () => {
    it('is deterministic for identical input', async () => {
      const minimal = {
        ...minimalInput,
        id: 'fixed',
        schema_version: '1.0.0' as const,
        created_at: 'fixed',
        updated_at: 'fixed',
        locked_at: 'fixed',
      };
      const h1 = await computeEndingLockHash(minimal as unknown as Omit<EndingLock, 'validation_hash'>);
      const h2 = await computeEndingLockHash(minimal as unknown as Omit<EndingLock, 'validation_hash'>);
      expect(h1).toBe(h2);
    });
  });
});

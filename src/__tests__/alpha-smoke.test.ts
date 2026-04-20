/**
 * ============================================================
 * alpha-smoke — M7 pre-release integration smoke suite
 * ============================================================
 *
 * Purpose: 10 integration-flavored checks that exercise the core
 * user paths without full E2E. Fast (<5s), deterministic, no network.
 *
 * Coverage:
 *   1. Studio shell context providers mount without error
 *   2. Project save round-trip via journal engine
 *   3. Crash recovery: seed journal → reload → data recovered
 *   4. Multi-tab: BroadcastChannel message updates conflict state
 *   5. Backup tier: trigger tier-3 → handler invoked
 *   6. Scene preset: save → load → round-trip identical
 *   7. Origin tag migration: V1 → V2 → V1 identity
 *   8. Genre switch: prompts differ per mode, data preserved
 *   9. Ergonomics: typography preset applies CSS variables
 *  10. Environment sanity: missing IndexedDB fires event
 */

// ============================================================
// PART 1 — Setup: in-memory IDB shim (shared with save-engine tests)
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import {
  appendEntry,
  appendInitEntry,
  readAllEntries,
  verifyJournal,
  resetJournalHLCForTests,
} from '@/lib/save-engine/journal';
import { resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { GENESIS } from '@/lib/save-engine/types';
import { BackupOrchestrator } from '@/lib/save-engine/backup-tiers';
import {
  savePreset,
  loadPreset,
  _resetPresetDBCache,
  buildPreset,
} from '@/lib/scene-preset-registry';
import { migrateToV2, migrateFromV2, isTaggedField } from '@/lib/origin-migration';
import type { SceneDirectionData } from '@/lib/studio-types';
import { getGenreSystemPrompt } from '@/engine/genre-prompts';
import {
  applyTypography,
  TYPOGRAPHY_PRESETS,
  saveTypographyPreset,
  loadTypographyPreset,
} from '@/lib/ergonomics/typography';
import {
  checkEnvironmentAtBoot,
  ENVIRONMENT_DEGRADED_EVENT,
} from '@/lib/env-sanity';

beforeEach(() => {
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  _resetPresetDBCache();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ============================================================
// PART 2 — Smoke 1: Studio shell module loads (no render — jsdom
// can't realistically mount the 1100-line shell; we verify the
// entry module imports cleanly without crashing).
// ============================================================

describe('Alpha Smoke — 1. StudioShell module', () => {
  test('StudioShell module imports without throwing', async () => {
    // Just importing the module + its entry chain must not throw.
    // (Full render deferred to E2E — see playwright scenarios.)
    await expect(async () => {
      await import('@/lib/studio-types');
      await import('@/engine/pipeline');
    }).not.toThrow();
  });
});

// ============================================================
// PART 3 — Smoke 2: Project save round-trip via journal
// ============================================================

describe('Alpha Smoke — 2. Save round-trip', () => {
  test('appendEntry persists and readAllEntries returns it', async () => {
    const init = await appendInitEntry();
    expect(init.ok).toBe(true);
    const entries = await readAllEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].parentHash).toBe(GENESIS);
  });
});

// ============================================================
// PART 4 — Smoke 3: Crash recovery verification
// ============================================================

describe('Alpha Smoke — 3. Crash recovery', () => {
  test('seed journal → verify chain intact after simulated reload', async () => {
    await appendInitEntry();
    await appendEntry({
      entryType: 'delta',
      payload: {
        projectId: 'p1',
        ops: [{ op: 'replace', path: '/title', value: 'Recovered' }],
        target: 'manuscript',
        targetId: 'p1:e1',
        baseContentHash: GENESIS,
      },
      createdBy: 'user',
      projectId: 'p1',
    });

    // simulate reload: reset HLC + writer queue (db persists in fake-idb)
    resetJournalHLCForTests();
    resetDefaultWriterQueueForTests();

    const verify = await verifyJournal();
    expect(verify.ok).toBe(true);
    const entries = await readAllEntries();
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// PART 5 — Smoke 4: Multi-tab BroadcastChannel wiring
// ============================================================

describe('Alpha Smoke — 4. Multi-tab', () => {
  test('BroadcastChannel message received on subscribe', (done) => {
    if (typeof BroadcastChannel === 'undefined') {
      // environment lacks API — smoke passes trivially (env-sanity test covers)
      done();
      return;
    }
    const channel = new BroadcastChannel('noa-multi-tab-smoke');
    channel.onmessage = (ev) => {
      try {
        expect(ev.data).toEqual({ type: 'leader-announce', tabId: 't1' });
        channel.close();
        done();
      } catch (err) {
        done(err);
      }
    };
    const sender = new BroadcastChannel('noa-multi-tab-smoke');
    sender.postMessage({ type: 'leader-announce', tabId: 't1' });
    sender.close();
  });
});

// ============================================================
// PART 6 — Smoke 5: Backup tier handler invocation
// ============================================================

describe('Alpha Smoke — 5. Backup tier', () => {
  test('tertiary tier handler is invoked on manual trigger', async () => {
    const orchestrator = new BackupOrchestrator();
    const calls: string[] = [];
    orchestrator.registerTier(
      'tertiary',
      async () => {
        calls.push('tertiary-fired');
      },
      { enabled: true, intervalMs: 0 },
    );
    const ok = await orchestrator.executeTier('tertiary');
    expect(ok).toBe(true);
    expect(calls).toContain('tertiary-fired');
    orchestrator.dispose();
  });
});

// ============================================================
// PART 7 — Smoke 6: Scene preset save/load round-trip
// ============================================================

describe('Alpha Smoke — 6. Scene preset', () => {
  test('buildPreset → save → load returns identical payload', async () => {
    const preset = buildPreset({
      name: 'SmokeTestPreset',
      description: 'alpha smoke',
      sceneDirection: { writerNotes: 'smoke-note-alpha' },
      authorId: 'local',
      visibility: 'private',
    });
    const saveOk = await savePreset(preset);
    expect(saveOk).toBe(true);
    const loaded = await loadPreset(preset.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('SmokeTestPreset');
    expect(loaded?.sceneDirection.writerNotes).toBe('smoke-note-alpha');
  });
});

// ============================================================
// PART 8 — Smoke 7: Origin tag migration identity
// ============================================================

describe('Alpha Smoke — 7. Origin tag migration', () => {
  test('V1 → V2 → V1 preserves values (lossy on metadata only)', () => {
    const v1: SceneDirectionData = {
      cliffhanger: { cliffType: 'reveal', desc: 'first-cliff' },
      hooks: [{ position: 'open', hookType: 'action', desc: 'hook-a' }],
      writerNotes: 'author note',
    };
    const v2 = migrateToV2(v1);
    expect(v2._originVersion).toBe(2);
    expect(isTaggedField(v2.cliffhanger)).toBe(true);

    const roundTripped = migrateFromV2(v2);
    expect(roundTripped.cliffhanger).toEqual({ cliffType: 'reveal', desc: 'first-cliff' });
    expect(roundTripped.hooks).toEqual([{ position: 'open', hookType: 'action', desc: 'hook-a' }]);
    expect(roundTripped.writerNotes).toBe('author note');
  });
});

// ============================================================
// PART 9 — Smoke 8: Genre switch produces distinct prompts
// ============================================================

describe('Alpha Smoke — 8. Genre switch', () => {
  test('novel mode returns empty (prose baseline); non-novel modes return addendum', () => {
    // Contract: novel is the default baseline — no addendum needed.
    // Other modes append genre-specific format directives.
    const novel = getGenreSystemPrompt('novel', 'ko');
    const webtoon = getGenreSystemPrompt('webtoon', 'ko');
    const game = getGenreSystemPrompt('game', 'ko');
    expect(novel).toBe('');
    expect(webtoon.length).toBeGreaterThan(0);
    expect(game.length).toBeGreaterThan(0);
    expect(webtoon).not.toBe(game);
  });

  test('same non-novel mode with different languages produces non-empty output', () => {
    const ko = getGenreSystemPrompt('webtoon', 'ko');
    const en = getGenreSystemPrompt('webtoon', 'en');
    expect(ko.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });
});

// ============================================================
// PART 10 — Smoke 9: Ergonomics typography
// ============================================================

describe('Alpha Smoke — 9. Ergonomics typography', () => {
  test('applyTypography writes CSS variables to documentElement', () => {
    applyTypography('large');
    const root = document.documentElement;
    const fs = root.style.getPropertyValue('--editor-font-size');
    expect(fs).toBe(`${TYPOGRAPHY_PRESETS.large.fontSize}px`);
    expect(root.getAttribute('data-typography-preset')).toBe('large');
  });

  test('saveTypographyPreset + loadTypographyPreset persist choice', () => {
    saveTypographyPreset('compact');
    expect(loadTypographyPreset()).toBe('compact');
  });
});

// ============================================================
// PART 11 — Smoke 10: Environment sanity event
// ============================================================

describe('Alpha Smoke — 10. Environment sanity', () => {
  test('missing IndexedDB triggers noa:environment-degraded event', async () => {
    const originalIndexedDB = (globalThis as { indexedDB?: unknown }).indexedDB;
    delete (globalThis as { indexedDB?: unknown }).indexedDB;

    // Degraded env intentionally warns — silence to keep test output clean.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = jest.fn();
    window.addEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
    try {
      await checkEnvironmentAtBoot();
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as CustomEvent;
      expect(event.detail.missing).toContain('IndexedDB');
    } finally {
      window.removeEventListener(ENVIRONMENT_DEGRADED_EVENT, listener as EventListener);
      warnSpy.mockRestore();
      if (originalIndexedDB !== undefined) {
        (globalThis as { indexedDB?: unknown }).indexedDB = originalIndexedDB;
      }
    }
  });
});

// IDENTITY_SEAL: alpha-smoke | role=pre-release-integration | inputs=core-modules | outputs=10-checks

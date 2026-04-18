/**
 * work-profiler-engine — performance benchmarks
 *
 * Validates aggregation cost on real-scale inputs:
 *   - 100 EP  <   500 ms
 *   - 400 EP (sampled to 200) < 2000 ms
 *   - 50 EP × 20k-char bodies < 1500 ms
 *   - 50 EP × 50 characters (regex cache reuse)
 *   - repeated runs do not grow allocation footprint (smoke)
 *
 * These are ceilings, not SLAs — wide margins prevent flakes on slow CI.
 * [K] one file, one suite; no production code touched.
 */

import type { ChatSession, Character, StoryConfig, Message } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';
import { buildProfile } from '../work-profiler-engine';

// ============================================================
// PART 1 — fixture factories (deterministic, keyed on seed)
// ============================================================

/** Build a canned assistant body of `targetChars` length from a small palette. */
function buildBody(targetChars: number, seed: number, charPool: string[]): string {
  // [G] pre-rotate the pool once; avoid modulo inside the join
  const rotated = charPool
    .slice(seed % Math.max(1, charPool.length))
    .concat(charPool.slice(0, seed % Math.max(1, charPool.length)));
  const head = `"안녕, ${rotated[0] ?? '주인공'}!" `;
  const tail = `그 순간 ${rotated[1] ?? '주인공'}은(는) 침묵했다. `;
  const paragraph = `${head}그리고 여러 장면이 교차했다. ${tail}`;
  const reps = Math.max(1, Math.ceil(targetChars / Math.max(1, paragraph.length)));
  // Slice to the exact ceiling — keeps body sizes comparable across seeds.
  return paragraph.repeat(reps).slice(0, targetChars);
}

function mkConfig(ep: number, chars: Character[]): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: chars[0]?.name ?? '',
    setting: 'bench-test',
    primaryEmotion: '',
    episode: ep,
    title: `EP ${ep}`,
    totalEpisodes: 500,
    guardrails: { min: 3000, max: 6000 },
    characters: chars,
    platform: PlatformType.WEB,
    episodeSceneSheets: [
      {
        episode: ep,
        title: `EP ${ep}`,
        scenes: Array.from({ length: 5 }, (_, i) => ({
          sceneId: `${ep}-${i + 1}`,
          sceneName: `Scene ${i + 1}`,
          characters: chars[i % Math.max(1, chars.length)]?.name ?? '',
          tone: '',
          summary: '',
          keyDialogue: '',
          emotionPoint: '',
          nextScene: '',
        })),
        lastUpdate: 0,
      },
    ],
  };
}

function mkCharacters(n: number): Character[] {
  // Use distinct CJK names (regex cache has a CJK path).
  const base = ['주인공', '조력자', '악당', '스승', '연인', '형제', '친구', '라이벌'];
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: base[i % base.length] + (i >= base.length ? `${Math.floor(i / base.length) + 1}` : ''),
    role: '',
    traits: '',
    appearance: '',
    dna: 0,
  }));
}

interface GenOpts {
  charsPerEp?: number;
  characterCount?: number;
}

function genSessions(n: number, opts: GenOpts = {}): ChatSession[] {
  const charsPerEp = opts.charsPerEp ?? 2000;
  const cast = mkCharacters(opts.characterCount ?? 3);
  const pool = cast.map((c) => c.name);
  return Array.from({ length: n }, (_, i) => {
    const ep = i + 1;
    const body = buildBody(charsPerEp, ep, pool);
    const messages: Message[] = [
      {
        id: `s${ep}-m1`,
        role: 'assistant',
        content: body,
        timestamp: ep,
        meta: {
          metrics: { tension: 0.5 + (ep % 10) / 20, pacing: 0.4, immersion: 0.5 },
          eosScore: 0.7 + (ep % 5) / 50,
        },
      },
    ];
    return {
      id: `s${ep}`,
      title: `EP ${ep}`,
      messages,
      config: mkConfig(ep, cast),
      lastUpdate: ep * 1000,
    };
  });
}

// ============================================================
// PART 2 — timing helper (single-run; warms cache once)
// ============================================================

function timed<T>(fn: () => T): { result: T; elapsed: number } {
  const t0 = performance.now();
  const result = fn();
  const elapsed = performance.now() - t0;
  return { result, elapsed };
}

// ============================================================
// PART 3 — benchmarks
// ============================================================

describe('buildProfile — performance', () => {
  // Give ts-jest + jsdom breathing room on cold starts.
  jest.setTimeout(30_000);

  test('100 episodes (≈2k chars each, 3 characters) under 500ms', () => {
    const sessions = genSessions(100, { charsPerEp: 2000, characterCount: 3 });
    const characters = sessions[0].config.characters;
    const { result, elapsed } = timed(() =>
      buildProfile(sessions, { characterNames: characters.map((c) => c.name) }),
    );
    expect(elapsed).toBeLessThan(500);
    expect(result.totalEpisodes).toBeLessThanOrEqual(100);
    expect(result.metrics.length).toBeGreaterThan(0);
  });

  test('400 episodes sampled to 200 under 2000ms', () => {
    const sessions = genSessions(400, { charsPerEp: 2000, characterCount: 3 });
    const characters = sessions[0].config.characters;
    const { result, elapsed } = timed(() =>
      buildProfile(sessions, {
        maxEpisodes: 200,
        characterNames: characters.map((c) => c.name),
      }),
    );
    expect(elapsed).toBeLessThan(2000);
    expect(result.totalEpisodes).toBeLessThanOrEqual(200);
  });

  test('50 episodes × 20,000 chars under 1500ms', () => {
    const sessions = genSessions(50, { charsPerEp: 20_000, characterCount: 3 });
    const characters = sessions[0].config.characters;
    const { elapsed, result } = timed(() =>
      buildProfile(sessions, { characterNames: characters.map((c) => c.name) }),
    );
    expect(elapsed).toBeLessThan(1500);
    // Each EP's charCount should be ≈20k (we slice exactly).
    expect(result.metrics[0].charCount).toBeGreaterThan(10_000);
  });

  test('50 episodes × 50 characters — regex cache keeps runtime < 2000ms', () => {
    const sessions = genSessions(50, { charsPerEp: 2000, characterCount: 50 });
    const names = sessions[0].config.characters.map((c) => c.name);
    const { elapsed, result } = timed(() =>
      buildProfile(sessions, { characterNames: names }),
    );
    expect(elapsed).toBeLessThan(2000);
    // At least one character should actually appear (pool is reused).
    expect(result.characterHeatmap.length).toBeGreaterThan(0);
  });

  test('repeated runs do not amplify runtime (cold vs warm within 5×)', () => {
    const sessions = genSessions(80, { charsPerEp: 2000, characterCount: 4 });
    const names = sessions[0].config.characters.map((c) => c.name);
    const cold = timed(() => buildProfile(sessions, { characterNames: names })).elapsed;
    // Subsequent runs should not blow up — no hidden accumulation anywhere.
    let maxWarm = 0;
    for (let i = 0; i < 4; i += 1) {
      const w = timed(() => buildProfile(sessions, { characterNames: names })).elapsed;
      if (w > maxWarm) maxWarm = w;
    }
    // [C] guard against division by zero on sub-ms runs; clamp to 1ms floor.
    const coldFloor = Math.max(1, cold);
    expect(maxWarm).toBeLessThan(coldFloor * 5 + 200);
  });
});

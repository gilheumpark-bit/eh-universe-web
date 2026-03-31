/**
 * geminiService unit tests
 * — fetchStructuredGemini: success, cache, retry, errors
 * — generateCharacters / generateWorldDesign / generateItems / generateWorldSim / generateSceneDirection
 * — generateStoryStream: streaming, errors, AbortError
 * — getStructuredModel logic (indirect)
 *
 * NOTE: structuredCache is a module-level Map that persists across tests.
 *       Cacheable tasks (worldDesign, worldSim) use unique genre/params per
 *       test to avoid cross-test cache collisions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PlatformType } from '@/engine/types';

// ── Mocks ──────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ai-providers
const mockGetApiKey = jest.fn().mockReturnValue('test-key');
const mockGetPreferredModel = jest.fn().mockReturnValue('gemini-2.5-flash');
const mockGetActiveModel = jest.fn().mockReturnValue('gemini-2.5-flash');
const mockStreamChat = jest.fn();

jest.mock('@/lib/ai-providers', () => ({
  getApiKey: (...args: unknown[]) => mockGetApiKey(...args),
  getPreferredModel: (...args: unknown[]) => mockGetPreferredModel(...args),
  getActiveModel: (...args: unknown[]) => mockGetActiveModel(...args),
  streamChat: (...args: unknown[]) => mockStreamChat(...args),
}));

// engine/pipeline
const mockBuildSystemInstruction = jest.fn().mockReturnValue('system-instruction');
const mockBuildUserPrompt = jest.fn().mockReturnValue('user-prompt');
const mockPostProcessResponse = jest.fn().mockReturnValue({
  content: 'processed',
  report: { version: '1', grade: 'A', eosScore: 0.5, tensionTarget: 0.6 },
});

jest.mock('@/engine/pipeline', () => ({
  buildSystemInstruction: (...args: unknown[]) => mockBuildSystemInstruction(...args),
  buildUserPrompt: (...args: unknown[]) => mockBuildUserPrompt(...args),
  postProcessResponse: (...args: unknown[]) => mockPostProcessResponse(...args),
}));

// token-utils
jest.mock('@/lib/token-utils', () => ({
  HISTORY_LIMITS: { STORAGE: 20 },
  truncateMessages: (_sys: string, msgs: any[]) => ({ messages: [...msgs] }),
}));

// localStorage mock
const localStorageMock: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageMock[key] ?? null,
    setItem: (key: string, val: string) => { localStorageMock[key] = val; },
    removeItem: (key: string) => { delete localStorageMock[key]; },
  },
  writable: true,
});

// ── Imports (after mocks) ──────────────────────────────────

import {
  generateCharacters,
  generateWorldDesign,
  generateItems,
  generateWorldSim,
  generateSceneDirection,
  generateStoryStream,
} from '../geminiService';

// ── Helpers ────────────────────────────────────────────────

function okJson(data: unknown) {
  return { ok: true, status: 200, json: async () => data };
}

function errResponse(status: number, body?: { error: string }) {
  return {
    ok: false,
    status,
    json: async () => body ?? null,
  };
}

/** Counter to generate unique genre strings so cacheable tasks don't collide */
let uniqueId = 0;
function uniqueGenre(prefix = 'genre') {
  return `${prefix}-${++uniqueId}-${Date.now()}`;
}

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset();
  mockGetApiKey.mockReturnValue('test-key');
  mockGetPreferredModel.mockReturnValue('gemini-2.5-flash');
  mockGetActiveModel.mockReturnValue('gemini-2.5-flash');
  mockStreamChat.mockReset();
  jest.restoreAllMocks();
});

// ============================================================
// PART 1 — fetchStructuredGemini (via generateWorldDesign)
// ============================================================

describe('fetchStructuredGemini', () => {
  it('sends correct payload to /api/gemini-structured', async () => {
    const genre = uniqueGenre('payload');
    mockFetch.mockResolvedValueOnce(okJson({ title: 'T', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' }));

    await generateWorldDesign(genre, 'KO');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/gemini-structured');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(opts.body);
    expect(body.task).toBe('worldDesign');
    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('gemini-2.5-flash');
    expect(body.apiKey).toBe('test-key');
    expect(body.genre).toBe(genre);
  });

  it('returns data on success', async () => {
    const genre = uniqueGenre('success');
    const expected = { title: 'Hello', povCharacter: 'A', setting: 'B', primaryEmotion: 'C', synopsis: 'D' };
    mockFetch.mockResolvedValueOnce(okJson(expected));

    const result = await generateWorldDesign(genre);
    expect(result).toEqual(expected);
  });

  it('throws immediately on 4xx errors (non-retryable)', async () => {
    const genre = uniqueGenre('4xx');
    mockFetch.mockResolvedValueOnce(errResponse(401, { error: 'Unauthorized' }));

    await expect(generateWorldDesign(genre)).rejects.toThrow('Unauthorized');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors up to MAX_RETRIES then throws', async () => {
    const genre = uniqueGenre('5xx');
    mockFetch
      .mockResolvedValueOnce(errResponse(502))
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(errResponse(500, { error: 'Server down' }));

    await expect(generateWorldDesign(genre)).rejects.toThrow('Server down');
    // initial + 2 retries = 3 calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('recovers on retry when second attempt succeeds', async () => {
    const genre = uniqueGenre('recover');
    const data = { title: 'T', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' };
    mockFetch
      .mockResolvedValueOnce(errResponse(500))
      .mockResolvedValueOnce(okJson(data));

    const result = await generateWorldDesign(genre);
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('uses generic error message when response body parse fails', async () => {
    const genre = uniqueGenre('parsefail');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => { throw new Error('parse fail'); },
    });

    await expect(generateWorldDesign(genre)).rejects.toThrow('Structured Gemini error 400');
  });

  it('omits apiKey from payload when none is set', async () => {
    const genre = uniqueGenre('nokey');
    mockGetApiKey.mockReturnValue('');
    mockFetch.mockResolvedValueOnce(okJson({ title: 'T', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' }));

    await generateWorldDesign(genre, 'KO');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.apiKey).toBeUndefined();
  });
});

// ============================================================
// PART 2 — Model selection logic
// ============================================================

describe('getStructuredModel (indirect)', () => {
  it('uses flash even when user preferred model is pro', async () => {
    const genre = uniqueGenre('model-pro');
    mockGetPreferredModel.mockReturnValue('gemini-2.5-pro');
    mockFetch.mockResolvedValueOnce(okJson({ title: 'T', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' }));

    await generateWorldDesign(genre);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gemini-2.5-flash');
  });

  it('keeps non-pro model as-is', async () => {
    const genre = uniqueGenre('model-flash');
    mockGetPreferredModel.mockReturnValue('gemini-2.5-flash');
    mockFetch.mockResolvedValueOnce(okJson({ title: 'T', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' }));

    await generateWorldDesign(genre);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('gemini-2.5-flash');
  });
});

// ============================================================
// PART 3 — Cache behavior
// ============================================================

describe('structuredCache', () => {
  it('caches worldDesign responses (same payload hits cache)', async () => {
    const genre = uniqueGenre('cache-hit');
    const data = { title: 'Cached', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'Syn' };
    mockFetch.mockResolvedValueOnce(okJson(data));

    const r1 = await generateWorldDesign(genre, 'KO');
    const r2 = await generateWorldDesign(genre, 'KO');

    expect(r1).toEqual(data);
    expect(r2).toEqual(data);
    // second call should hit cache — only 1 fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT cache character generation (non-cacheable task)', async () => {
    mockFetch
      .mockResolvedValueOnce(okJson([{ name: 'A', role: 'hero' }]))
      .mockResolvedValueOnce(okJson([{ name: 'B', role: 'ally' }]));

    const config = { genre: 'fantasy', synopsis: 'test' } as any;
    await generateCharacters(config, 'KO', 1);
    await generateCharacters(config, 'KO', 1);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('different params produce different cache keys (no collision)', async () => {
    const genre1 = uniqueGenre('cache-a');
    const genre2 = uniqueGenre('cache-b');
    const data1 = { title: 'A', povCharacter: 'P', setting: 'S', primaryEmotion: 'E', synopsis: 'S1' };
    const data2 = { title: 'B', povCharacter: 'Q', setting: 'T', primaryEmotion: 'F', synopsis: 'S2' };

    mockFetch
      .mockResolvedValueOnce(okJson(data1))
      .mockResolvedValueOnce(okJson(data2));

    const r1 = await generateWorldDesign(genre1, 'KO');
    const r2 = await generateWorldDesign(genre2, 'KO');

    expect(r1).toEqual(data1);
    expect(r2).toEqual(data2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// PART 4 — generateCharacters
// ============================================================

describe('generateCharacters', () => {
  const config = { genre: 'fantasy', synopsis: 'A hero story', characters: [{ name: 'Existing' }] } as any;

  it('returns mapped characters with valid roles and ids', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Hero', role: 'hero', appearance: 'tall' },
      { name: 'Villain', role: 'villain', appearance: 'dark' },
    ]));

    const result = await generateCharacters(config, 'KO', 2);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Hero');
    expect(result[0].role).toBe('hero');
    expect(result[0].id).toMatch(/^c-/);
    expect(result[1].role).toBe('villain');
  });

  it('normalizes unknown roles to extra', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Mystery', role: 'unknown_role' },
    ]));

    const result = await generateCharacters(config, 'KO', 1);
    expect(result[0].role).toBe('extra');
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ error: 'something' }));

    const result = await generateCharacters(config);
    expect(result).toEqual([]);
  });

  it('filters out malformed entries (null, missing name, numeric name)', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Valid', role: 'hero' },
      null,
      { noName: true },
      { name: 123 },
    ]));

    const result = await generateCharacters(config, 'KO', 4);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Valid');
  });

  it('passes existingNames to API body', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]));

    await generateCharacters(config, 'KO', 1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.existingNames).toEqual(['Existing']);
  });

  it('defaults role to extra when role is missing', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'NoRole' },
    ]));

    const result = await generateCharacters(config, 'KO', 1);
    expect(result[0].role).toBe('extra');
  });
});

// ============================================================
// PART 5 — generateItems
// ============================================================

describe('generateItems', () => {
  const config = { genre: 'fantasy', synopsis: 'test', items: [{ name: 'OldSword' }] } as any;

  it('returns items with normalized category and rarity', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Sword', category: 'weapon', rarity: 'rare', description: 'sharp' },
    ]));

    const result = await generateItems(config, 'KO', 1);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('weapon');
    expect(result[0].rarity).toBe('rare');
    expect(result[0].id).toMatch(/^item-ai-/);
  });

  it('normalizes artifact category to accessory via alias', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Ring', category: 'artifact', rarity: 'epic' },
    ]));

    const result = await generateItems(config, 'KO', 1);
    expect(result[0].category).toBe('accessory');
  });

  it('normalizes key_item category to quest via alias', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Scroll', category: 'key_item', rarity: 'uncommon' },
    ]));

    const result = await generateItems(config, 'KO', 1);
    expect(result[0].category).toBe('quest');
  });

  it('falls back to misc/common for unrecognized values', async () => {
    mockFetch.mockResolvedValueOnce(okJson([
      { name: 'Thing', category: 'unknown_cat', rarity: 'unknown_rar' },
    ]));

    const result = await generateItems(config, 'KO', 1);
    expect(result[0].category).toBe('misc');
    expect(result[0].rarity).toBe('common');
  });

  it('returns empty array when API returns non-array', async () => {
    mockFetch.mockResolvedValueOnce(okJson('not an array'));
    const result = await generateItems(config);
    expect(result).toEqual([]);
  });

  it('passes existingNames from config.items', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]));

    await generateItems(config, 'KO', 1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.existingNames).toEqual(['OldSword']);
  });
});

// ============================================================
// PART 6 — generateWorldSim / generateSceneDirection
// ============================================================

describe('generateWorldSim', () => {
  it('returns structured sim data', async () => {
    const genre = uniqueGenre('sim');
    const simData = {
      civilizations: [{ name: 'Empire', era: 'medieval', traits: ['warlike'] }],
      relations: [{ from: 'Empire', to: 'Rebels', type: 'hostile' }],
    };
    mockFetch.mockResolvedValueOnce(okJson(simData));

    const result = await generateWorldSim('A story', genre, 'KO');
    expect(result.civilizations).toHaveLength(1);
    expect(result.civilizations[0].name).toBe('Empire');
    expect(result.relations[0].type).toBe('hostile');
  });

  it('passes worldContext to API', async () => {
    const genre = uniqueGenre('sim-ctx');
    mockFetch.mockResolvedValueOnce(okJson({ civilizations: [], relations: [] }));

    const ctx = { corePremise: 'test premise', currentConflict: 'war' };
    await generateWorldSim('synopsis', genre, 'KO', ctx);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.worldContext).toEqual(ctx);
  });
});

describe('generateSceneDirection', () => {
  it('returns structured direction data', async () => {
    const dirData = {
      hooks: [{ position: 'opening', hookType: 'question', desc: 'Why?' }],
      goguma: [{ type: 'frustration', intensity: 'high', desc: 'blocked' }],
      cliffhanger: { cliffType: 'reveal', desc: 'identity exposed' },
      emotionTargets: [{ emotion: 'tension', intensity: 8 }],
      dialogueTones: [{ character: 'Hero', tone: 'defiant' }],
    };
    mockFetch.mockResolvedValueOnce(okJson(dirData));

    const result = await generateSceneDirection('synopsis', ['Hero'], 'KO');
    expect(result.hooks).toHaveLength(1);
    expect(result.cliffhanger.cliffType).toBe('reveal');
    expect(result.dialogueTones[0].character).toBe('Hero');
  });
});

// ============================================================
// PART 7 — generateStoryStream
// ============================================================

describe('generateStoryStream', () => {
  const baseConfig = {
    genre: 'fantasy',
    synopsis: 'A test story',
    platform: PlatformType.MOBILE,
    characters: [],
  } as any;

  it('streams content and returns processed result', async () => {
    mockStreamChat.mockImplementation(async ({ onChunk }: any) => {
      onChunk('Hello ');
      onChunk('World');
      return 'Hello World';
    });

    const chunks: string[] = [];
    const result = await generateStoryStream(baseConfig, 'draft', (t) => chunks.push(t));

    expect(chunks).toEqual(['Hello ', 'World']);
    expect(result.content).toBe('processed');
    expect(mockBuildSystemInstruction).toHaveBeenCalled();
    expect(mockBuildUserPrompt).toHaveBeenCalled();
    expect(mockPostProcessResponse).toHaveBeenCalledWith('Hello World', baseConfig, 'KO', PlatformType.MOBILE);
  });

  it('passes temperature from options', async () => {
    mockStreamChat.mockResolvedValue('content');

    await generateStoryStream(baseConfig, 'draft', jest.fn(), { temperature: 0.5 });

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.5 }),
    );
  });

  it('falls back to localStorage temperature', async () => {
    localStorageMock['noa_temperature'] = '0.7';
    mockStreamChat.mockResolvedValue('content');

    await generateStoryStream(baseConfig, 'draft', jest.fn());

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7 }),
    );
    delete localStorageMock['noa_temperature'];
  });

  it('uses default 0.9 temperature when nothing set', async () => {
    mockStreamChat.mockResolvedValue('content');

    await generateStoryStream(baseConfig, 'draft', jest.fn());

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.9 }),
    );
  });

  it('re-throws AbortError without wrapping', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    mockStreamChat.mockRejectedValue(abortError);

    await expect(
      generateStoryStream(baseConfig, 'draft', jest.fn()),
    ).rejects.toThrow(abortError);
  });

  it('re-throws generic errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('network failure');
    mockStreamChat.mockRejectedValue(error);

    await expect(
      generateStoryStream(baseConfig, 'draft', jest.fn()),
    ).rejects.toThrow('network failure');

    expect(consoleSpy).toHaveBeenCalledWith('[geminiService]', 'Story Generation Error:', error);
    consoleSpy.mockRestore();
  });

  it('builds chat messages from history when present', async () => {
    mockStreamChat.mockResolvedValue('content');

    const history = [
      { id: 'h1', role: 'user' as const, content: 'Hello', timestamp: Date.now() },
      { id: 'h2', role: 'assistant' as const, content: 'Hi there', timestamp: Date.now() },
    ];

    await generateStoryStream(baseConfig, 'draft', jest.fn(), { history });

    const callArgs = mockStreamChat.mock.calls[0][0];
    const msgs = callArgs.messages;
    // History (2) + user prompt (1)
    expect(msgs[msgs.length - 1].content).toBe('user-prompt');
    expect(msgs.length).toBeGreaterThanOrEqual(3);
  });

  it('skips empty assistant messages in history', async () => {
    mockStreamChat.mockResolvedValue('content');

    const history = [
      { id: 'h1', role: 'user' as const, content: 'Hello', timestamp: Date.now() },
      { id: 'h2', role: 'assistant' as const, content: '', timestamp: Date.now() },
      { id: 'h3', role: 'assistant' as const, content: 'Real reply', timestamp: Date.now() },
    ];

    await generateStoryStream(baseConfig, 'draft', jest.fn(), { history });

    const msgs = mockStreamChat.mock.calls[0][0].messages;
    const assistantMsgs = msgs.filter((m: any) => m.role === 'assistant');
    expect(assistantMsgs.every((m: any) => m.content.length > 0)).toBe(true);
  });

  it('uses simple message array when history is empty', async () => {
    mockStreamChat.mockResolvedValue('content');

    await generateStoryStream(baseConfig, 'draft', jest.fn(), { history: [] });

    const msgs = mockStreamChat.mock.calls[0][0].messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('user-prompt');
  });

  it('passes AbortSignal from options', async () => {
    mockStreamChat.mockResolvedValue('content');
    const controller = new AbortController();

    await generateStoryStream(baseConfig, 'draft', jest.fn(), { signal: controller.signal });

    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

// ============================================================
// PART 8 — Network / timeout / malformed response errors
// ============================================================

describe('error scenarios', () => {
  it('handles network failure (fetch throws)', async () => {
    const genre = uniqueGenre('netfail');
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(generateWorldDesign(genre)).rejects.toThrow('Failed to fetch');
  });

  it('handles timeout (AbortSignal.timeout)', async () => {
    const genre = uniqueGenre('timeout');
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    mockFetch.mockRejectedValueOnce(timeoutError);

    await expect(generateWorldDesign(genre)).rejects.toThrow('signal timed out');
  });

  it('handles response.json() returning null on non-ok response', async () => {
    const genre = uniqueGenre('nulljson');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => null,
    });

    await expect(generateWorldDesign(genre)).rejects.toThrow('Structured Gemini error 422');
  });

  it('provides generic message when error field is not a string', async () => {
    const genre = uniqueGenre('badfield');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 12345 }),
    });

    await expect(generateWorldDesign(genre)).rejects.toThrow('Structured Gemini error 400');
  });
});

/**
 * Unit tests for all exported helpers in src/lib/network/helpers.ts
 *
 * Covers: stripHtml, sanitizeTitle, sanitizeContent, sanitizeComment,
 *         normalizeText, normalizeOptionalText, normalizeStringArray,
 *         clampNullable, buildDefaultUserRecord, nowIso, summarizeContent,
 *         sanitizePlanetStatus, COLLECTIONS, requireDb
 */

// Mock firebase dependencies so the module can load without firebase config
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  increment: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
  where: jest.fn(),
}));
jest.mock('firebase/auth', () => ({}));
jest.mock('@/lib/firebase', () => ({ getDb: jest.fn() }));

import {
  stripHtml,
  sanitizeTitle,
  sanitizeContent,
  sanitizeComment,
  normalizeText,
  normalizeOptionalText,
  normalizeStringArray,
  clampNullable,
  buildDefaultUserRecord,
  nowIso,
  summarizeContent,
  sanitizePlanetStatus,
  COLLECTIONS,
  requireDb,
} from '@/lib/network/helpers';

import { getDb } from '@/lib/firebase';

// ============================================================
// PART 1 — stripHtml
// ============================================================

describe('stripHtml', () => {
  it('removes simple HTML tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold');
  });

  it('removes self-closing tags', () => {
    expect(stripHtml('line<br/>break')).toBe('linebreak');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<div><p><span>deep</span></p></div>')).toBe('deep');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('strips tags with attributes (XSS vectors)', () => {
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
    expect(stripHtml('<a href="javascript:void(0)">click</a>')).toBe('click');
  });

  it('strips script tags (content remains since regex only removes tags)', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('handles multiple tags in a row', () => {
    expect(stripHtml('<b>a</b><i>b</i><u>c</u>')).toBe('abc');
  });
});

// ============================================================
// PART 2 — sanitizeTitle / sanitizeContent / sanitizeComment
// ============================================================

describe('sanitizeTitle', () => {
  it('trims whitespace', () => {
    expect(sanitizeTitle('  Hello  ')).toBe('Hello');
  });

  it('truncates to 200 characters', () => {
    expect(sanitizeTitle('A'.repeat(300))).toHaveLength(200);
  });

  it('strips HTML', () => {
    expect(sanitizeTitle('<h1>Title</h1>')).toBe('Title');
  });

  it('returns empty string for null', () => {
    expect(sanitizeTitle(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeTitle(undefined)).toBe('');
  });

  it('strips XSS and enforces length together', () => {
    const xss = '<script>alert(1)</script>' + 'x'.repeat(300);
    const result = sanitizeTitle(xss);
    expect(result).not.toContain('<');
    expect(result.length).toBeLessThanOrEqual(200);
  });
});

describe('sanitizeContent', () => {
  it('trims whitespace', () => {
    expect(sanitizeContent('  body  ')).toBe('body');
  });

  it('truncates to 50000 by default', () => {
    expect(sanitizeContent('X'.repeat(60_000))).toHaveLength(50_000);
  });

  it('accepts custom maxLength', () => {
    expect(sanitizeContent('X'.repeat(200), 100)).toHaveLength(100);
  });

  it('strips HTML', () => {
    expect(sanitizeContent('<p>text</p>')).toBe('text');
  });

  it('returns empty for null/undefined', () => {
    expect(sanitizeContent(null)).toBe('');
    expect(sanitizeContent(undefined)).toBe('');
  });
});

describe('sanitizeComment', () => {
  it('trims whitespace', () => {
    expect(sanitizeComment('  note  ')).toBe('note');
  });

  it('truncates to 5000 characters', () => {
    expect(sanitizeComment('C'.repeat(6_000))).toHaveLength(5_000);
  });

  it('strips HTML', () => {
    expect(sanitizeComment('<em>italic</em>')).toBe('italic');
  });

  it('returns empty for null/undefined', () => {
    expect(sanitizeComment(null)).toBe('');
    expect(sanitizeComment(undefined)).toBe('');
  });
});

// ============================================================
// PART 3 — normalizeText / normalizeOptionalText
// ============================================================

describe('normalizeText', () => {
  it('trims whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('returns empty string for null', () => {
    expect(normalizeText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeText(undefined)).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeText('   ')).toBe('');
  });

  it('preserves inner whitespace', () => {
    expect(normalizeText('  a  b  ')).toBe('a  b');
  });
});

describe('normalizeOptionalText', () => {
  it('returns trimmed string when non-empty', () => {
    expect(normalizeOptionalText('  value  ')).toBe('value');
  });

  it('returns undefined for null', () => {
    expect(normalizeOptionalText(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(normalizeOptionalText(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeOptionalText('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(normalizeOptionalText('   ')).toBeUndefined();
  });
});

// ============================================================
// PART 4 — normalizeStringArray
// ============================================================

describe('normalizeStringArray', () => {
  it('returns trimmed, non-empty values', () => {
    expect(normalizeStringArray(['  a  ', 'b', '  c  '], 10)).toEqual(['a', 'b', 'c']);
  });

  it('removes duplicates', () => {
    expect(normalizeStringArray(['x', 'x', 'y'], 10)).toEqual(['x', 'y']);
  });

  it('filters out empty strings after trimming', () => {
    expect(normalizeStringArray(['  ', '', 'ok'], 10)).toEqual(['ok']);
  });

  it('enforces maxLength', () => {
    expect(normalizeStringArray(['a', 'b', 'c', 'd'], 2)).toEqual(['a', 'b']);
  });

  it('returns empty array for null', () => {
    expect(normalizeStringArray(null, 5)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeStringArray(undefined, 5)).toEqual([]);
  });

  it('deduplicates after trimming', () => {
    expect(normalizeStringArray(['  a ', 'a', ' a'], 10)).toEqual(['a']);
  });
});

// ============================================================
// PART 5 — clampNullable
// ============================================================

describe('clampNullable', () => {
  it('clamps value below min to min', () => {
    expect(clampNullable(-5, 0, 100)).toBe(0);
  });

  it('clamps value above max to max', () => {
    expect(clampNullable(200, 0, 100)).toBe(100);
  });

  it('returns value when within range', () => {
    expect(clampNullable(50, 0, 100)).toBe(50);
  });

  it('returns value at exact min boundary', () => {
    expect(clampNullable(0, 0, 100)).toBe(0);
  });

  it('returns value at exact max boundary', () => {
    expect(clampNullable(100, 0, 100)).toBe(100);
  });

  it('returns null for null input', () => {
    expect(clampNullable(null, 0, 100)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(clampNullable(undefined, 0, 100)).toBeNull();
  });

  it('returns null for NaN input', () => {
    expect(clampNullable(NaN, 0, 100)).toBeNull();
  });
});

// ============================================================
// PART 6 — buildDefaultUserRecord
// ============================================================

describe('buildDefaultUserRecord', () => {
  it('returns correct shape with all required fields', () => {
    const record = buildDefaultUserRecord('user123', 'Alice');
    expect(record).toEqual(
      expect.objectContaining({
        id: 'user123',
        nickname: 'Alice',
        role: 'member',
        badges: [],
        planetCount: 0,
      }),
    );
    expect(record.createdAt).toBeDefined();
    expect(record.updatedAt).toBeDefined();
  });

  it('generates fallback nickname when nickname is null', () => {
    const record = buildDefaultUserRecord('abcdef1234');
    expect(record.nickname).toBe('Explorer-abcdef');
  });

  it('generates fallback nickname when nickname is empty string', () => {
    const record = buildDefaultUserRecord('xyz789abc', '');
    expect(record.nickname).toBe('Explorer-xyz789');
  });

  it('generates fallback nickname when nickname is whitespace-only', () => {
    const record = buildDefaultUserRecord('uid00001', '   ');
    expect(record.nickname).toBe('Explorer-uid000');
  });

  it('trims nickname whitespace', () => {
    const record = buildDefaultUserRecord('id1', '  Bob  ');
    expect(record.nickname).toBe('Bob');
  });

  it('sets createdAt and updatedAt to same ISO timestamp', () => {
    const record = buildDefaultUserRecord('id1', 'Test');
    expect(record.createdAt).toBe(record.updatedAt);
  });

  it('badges is an empty array', () => {
    const record = buildDefaultUserRecord('id1');
    expect(Array.isArray(record.badges)).toBe(true);
    expect(record.badges).toHaveLength(0);
  });

  it('planetCount defaults to 0', () => {
    const record = buildDefaultUserRecord('id1');
    expect(record.planetCount).toBe(0);
  });
});

// ============================================================
// PART 7 — nowIso
// ============================================================

describe('nowIso', () => {
  it('returns a valid ISO 8601 string', () => {
    const iso = nowIso();
    // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('can be parsed back to a valid Date', () => {
    const iso = nowIso();
    const date = new Date(iso);
    expect(date.getTime()).not.toBeNaN();
  });

  it('returns a timestamp close to now', () => {
    const before = Date.now();
    const iso = nowIso();
    const after = Date.now();
    const parsed = new Date(iso).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

// ============================================================
// PART 8 — summarizeContent
// ============================================================

describe('summarizeContent', () => {
  it('returns short content unchanged', () => {
    expect(summarizeContent('short text')).toBe('short text');
  });

  it('collapses whitespace', () => {
    expect(summarizeContent('a   b\n\nc')).toBe('a b c');
  });

  it('returns content <= 180 chars as-is after collapsing', () => {
    const text = 'x'.repeat(180);
    expect(summarizeContent(text)).toBe(text);
  });

  it('truncates to 177 chars + ellipsis for long content', () => {
    const text = 'y'.repeat(300);
    const result = summarizeContent(text);
    expect(result).toHaveLength(180);
    expect(result.endsWith('...')).toBe(true);
  });
});

// ============================================================
// PART 9 — sanitizePlanetStatus / COLLECTIONS / requireDb
// ============================================================

describe('sanitizePlanetStatus', () => {
  it('returns the status when provided', () => {
    expect(sanitizePlanetStatus('active', 'archived')).toBe('active');
  });

  it('returns fallback when null', () => {
    expect(sanitizePlanetStatus(null, 'archived')).toBe('archived');
  });

  it('returns fallback when undefined', () => {
    expect(sanitizePlanetStatus(undefined, 'active')).toBe('active');
  });
});

describe('COLLECTIONS', () => {
  it('contains expected collection names', () => {
    expect(COLLECTIONS.users).toBe('users');
    expect(COLLECTIONS.planets).toBe('planets');
    expect(COLLECTIONS.posts).toBe('posts');
    expect(COLLECTIONS.settlements).toBe('settlements');
    expect(COLLECTIONS.comments).toBe('comments');
    expect(COLLECTIONS.reactions).toBe('reactions');
    expect(COLLECTIONS.reports).toBe('reports');
  });
});

describe('requireDb', () => {
  it('throws when getDb returns falsy', () => {
    (getDb as jest.Mock).mockReturnValue(null);
    expect(() => requireDb()).toThrow('Firestore is not available');
  });

  it('returns firestore instance when available', () => {
    const mockDb = { type: 'firestore' };
    (getDb as jest.Mock).mockReturnValue(mockDb);
    expect(requireDb()).toBe(mockDb);
  });
});

/**
 * Unit tests for sanitization helpers in src/lib/network/helpers.ts
 * Covers: stripHtml, sanitizeTitle, sanitizeContent, sanitizeComment
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
} from '@/lib/network/helpers';

// ============================================================
// PART 1 — stripHtml
// ============================================================

describe('stripHtml', () => {
  it('removes simple HTML tags', () => {
    expect(stripHtml('<b>bold</b>')).toBe('bold');
  });

  it('removes self-closing tags', () => {
    expect(stripHtml('before<br/>after')).toBe('beforeafter');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
  });

  it('removes script tags and content markers', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('handles string with no HTML', () => {
    expect(stripHtml('plain text')).toBe('plain text');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('strips attributes', () => {
    expect(stripHtml('<a href="http://evil.com" onclick="steal()">link</a>')).toBe('link');
  });

  it('handles XSS attempt with angle brackets', () => {
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
  });
});

// ============================================================
// PART 2 — sanitizeTitle
// ============================================================

describe('sanitizeTitle', () => {
  it('returns trimmed title', () => {
    expect(sanitizeTitle('  Hello World  ')).toBe('Hello World');
  });

  it('truncates at 200 characters', () => {
    const long = 'A'.repeat(300);
    expect(sanitizeTitle(long).length).toBe(200);
  });

  it('strips HTML from title', () => {
    expect(sanitizeTitle('<b>Title</b>')).toBe('Title');
  });

  it('handles null', () => {
    expect(sanitizeTitle(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(sanitizeTitle(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeTitle('')).toBe('');
  });
});

// ============================================================
// PART 3 — sanitizeContent
// ============================================================

describe('sanitizeContent', () => {
  it('returns trimmed content', () => {
    expect(sanitizeContent('  body text  ')).toBe('body text');
  });

  it('truncates at 50000 by default', () => {
    const long = 'X'.repeat(60_000);
    expect(sanitizeContent(long).length).toBe(50_000);
  });

  it('accepts custom maxLength', () => {
    const long = 'X'.repeat(200);
    expect(sanitizeContent(long, 100).length).toBe(100);
  });

  it('strips HTML from content', () => {
    expect(sanitizeContent('<p>paragraph</p>')).toBe('paragraph');
  });

  it('handles null', () => {
    expect(sanitizeContent(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(sanitizeContent(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeContent('')).toBe('');
  });

  it('strips XSS script injection', () => {
    expect(sanitizeContent('<script>document.cookie</script>safe')).toBe(
      'document.cookiesafe',
    );
  });
});

// ============================================================
// PART 4 — sanitizeComment
// ============================================================

describe('sanitizeComment', () => {
  it('returns trimmed comment', () => {
    expect(sanitizeComment('  comment  ')).toBe('comment');
  });

  it('truncates at 5000 characters', () => {
    const long = 'C'.repeat(6_000);
    expect(sanitizeComment(long).length).toBe(5_000);
  });

  it('strips HTML from comment', () => {
    expect(sanitizeComment('<em>italic</em>')).toBe('italic');
  });

  it('handles null', () => {
    expect(sanitizeComment(null)).toBe('');
  });

  it('handles undefined', () => {
    expect(sanitizeComment(undefined)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeComment('')).toBe('');
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for toManuscriptEntry pure function from useTranslation.
 * This is a pure data transformer — no React hooks involved.
 */

import { toManuscriptEntry } from '@/hooks/useTranslation';
import type { TranslatedEpisode } from '@/engine/translation';

// Mock dependencies that useTranslation imports
jest.mock('@/lib/ai-providers', () => ({
  streamChat: jest.fn(),
  getApiKey: jest.fn(),
  getActiveProvider: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('toManuscriptEntry', () => {
  const baseResult: TranslatedEpisode = {
    episode: 5,
    sourceLang: 'KO',
    targetLang: 'EN',
    mode: 'fidelity',
    band: 'premium',
    sourceText: '원문 텍스트입니다.',
    translatedText: 'This is the original text.',
    chunks: [
      { index: 0, sourceText: '원문', translatedText: 'Original', score: 0.85, attempt: 1, passed: true },
      { index: 1, sourceText: '텍스트', translatedText: 'Text', score: 0.9, attempt: 1, passed: true },
    ],
    avgScore: 0.875,
    glossarySnapshot: [
      { source: '마법', target: 'magic', locked: true },
      { source: '영웅', target: 'hero', locked: false },
    ],
    timestamp: 1700000000000,
  };

  it('converts TranslatedEpisode to TranslatedManuscriptEntry', () => {
    const entry = toManuscriptEntry(baseResult, 'Chapter 5');

    expect(entry.episode).toBe(5);
    expect(entry.sourceLang).toBe('KO');
    expect(entry.targetLang).toBe('EN');
    expect(entry.mode).toBe('fidelity');
    expect(entry.translatedTitle).toBe('Chapter 5');
    expect(entry.translatedContent).toBe('This is the original text.');
    expect(entry.charCount).toBe('This is the original text.'.length);
    expect(entry.avgScore).toBe(0.875);
    expect(entry.band).toBe('premium');
    expect(entry.lastUpdate).toBe(1700000000000);
  });

  it('preserves glossary snapshot with source, target, locked fields', () => {
    const entry = toManuscriptEntry(baseResult);
    expect(entry.glossarySnapshot).toHaveLength(2);
    expect(entry.glossarySnapshot[0]).toEqual({ source: '마법', target: 'magic', locked: true });
    expect(entry.glossarySnapshot[1]).toEqual({ source: '영웅', target: 'hero', locked: false });
  });

  it('defaults translatedTitle to empty string', () => {
    const entry = toManuscriptEntry(baseResult);
    expect(entry.translatedTitle).toBe('');
  });

  it('handles empty chunks and glossary', () => {
    const minimal: TranslatedEpisode = {
      ...baseResult,
      chunks: [],
      glossarySnapshot: [],
      translatedText: '',
    };
    const entry = toManuscriptEntry(minimal, 'Empty');

    expect(entry.charCount).toBe(0);
    expect(entry.glossarySnapshot).toEqual([]);
    expect(entry.translatedTitle).toBe('Empty');
  });

  it('computes charCount from translatedText length', () => {
    const result: TranslatedEpisode = {
      ...baseResult,
      translatedText: 'abc',
    };
    expect(toManuscriptEntry(result).charCount).toBe(3);
  });

  it('strips extra glossary fields (only source/target/locked)', () => {
    const result: TranslatedEpisode = {
      ...baseResult,
      glossarySnapshot: [
        { source: 'a', target: 'b', locked: false, context: 'extra' } as any,
      ],
    };
    const entry = toManuscriptEntry(result);
    expect(Object.keys(entry.glossarySnapshot[0])).toEqual(['source', 'target', 'locked']);
  });
});

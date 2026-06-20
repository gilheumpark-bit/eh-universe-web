/**
 * conflict-parser.test — pure parser for Git merge conflict markers.
 */

import {
  parseConflicts,
  resolveConflict,
  hasUnresolved,
  stringifyBlocks,
  countConflicts,
  conflictIndices,
  CONFLICT_MARKERS,
  type ConflictBlock,
  type DocumentBlock,
} from '@/lib/conflict-parser';

// Stub logger — avoid console noise in test output.
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('conflict-parser', () => {
  // ============================================================
  // parseConflicts — basic cases
  // ============================================================

  it('returns [] for empty string', () => {
    expect(parseConflicts('')).toEqual([]);
  });

  it('returns single context block when no conflict markers present', () => {
    const src = 'hello\nworld';
    const blocks = parseConflicts(src);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('context');
    expect((blocks[0] as { content: string }).content).toBe('hello\nworld');
  });

  it('parses a simple 2-way conflict', () => {
    const src = [
      'before',
      '<<<<<<< HEAD',
      'ours-line-1',
      'ours-line-2',
      '=======',
      'theirs-line-1',
      '>>>>>>> feature',
      'after',
    ].join('\n');

    const blocks = parseConflicts(src);
    expect(blocks).toHaveLength(3);

    expect(blocks[0].type).toBe('context');
    expect((blocks[0] as { content: string }).content).toBe('before');

    const conflict = blocks[1] as ConflictBlock;
    expect(conflict.type).toBe('conflict');
    expect(conflict.ours).toBe('ours-line-1\nours-line-2');
    expect(conflict.theirs).toBe('theirs-line-1');
    expect(conflict.oursLabel).toBe('HEAD');
    expect(conflict.theirsLabel).toBe('feature');
    expect(conflict.ancestor).toBeUndefined();
    expect(conflict.startLine).toBe(2);
    expect(conflict.endLine).toBe(7);

    expect(blocks[2].type).toBe('context');
    expect((blocks[2] as { content: string }).content).toBe('after');
  });

  it('parses a diff3-style 3-way conflict with ancestor', () => {
    const src = [
      '<<<<<<< HEAD',
      'ours',
      '||||||| merged common ancestors',
      'base',
      '=======',
      'theirs',
      '>>>>>>> branch',
    ].join('\n');

    const blocks = parseConflicts(src);
    const conflict = blocks.find(b => b.type === 'conflict') as ConflictBlock;
    expect(conflict.ours).toBe('ours');
    expect(conflict.ancestor).toBe('base');
    expect(conflict.theirs).toBe('theirs');
  });

  it('parses multiple conflicts in a single file', () => {
    const src = [
      'A',
      '<<<<<<< HEAD',
      'one',
      '=======',
      '1',
      '>>>>>>> x',
      'B',
      '<<<<<<< HEAD',
      'two',
      '=======',
      '2',
      '>>>>>>> y',
      'C',
    ].join('\n');

    const blocks = parseConflicts(src);
    expect(countConflicts(blocks)).toBe(2);
    expect(conflictIndices(blocks)).toEqual([1, 3]);
  });

  it('handles CRLF input', () => {
    const src = ['a', '<<<<<<< HEAD', 'ours', '=======', 'theirs', '>>>>>>> b', 'c'].join('\r\n');
    const blocks = parseConflicts(src);
    expect(countConflicts(blocks)).toBe(1);
    const conflict = blocks.find(b => b.type === 'conflict') as ConflictBlock;
    expect(conflict.ours).toBe('ours');
    expect(conflict.theirs).toBe('theirs');
  });

  it('salvages an unclosed conflict region without throwing', () => {
    const src = [
      'before',
      '<<<<<<< HEAD',
      'dangling',
    ].join('\n');
    const blocks = parseConflicts(src);
    // Should not crash, should return a single context block with original content
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(countConflicts(blocks)).toBe(0);
  });

  // ============================================================
  // hasUnresolved
  // ============================================================

  it('hasUnresolved returns true when conflict blocks remain', () => {
    const src = '<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> b';
    const blocks = parseConflicts(src);
    expect(hasUnresolved(blocks)).toBe(true);
  });

  it('hasUnresolved returns false when all conflicts resolved', () => {
    const src = '<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const resolved = resolveConflict(blocks, 0, 'ours');
    expect(hasUnresolved(resolved)).toBe(false);
  });

  it('hasUnresolved handles non-array input defensively', () => {
    expect(hasUnresolved(null as unknown as DocumentBlock[])).toBe(false);
    expect(hasUnresolved(undefined as unknown as DocumentBlock[])).toBe(false);
  });

  // ============================================================
  // resolveConflict — all four choices
  // ============================================================

  it('resolveConflict ours: keeps HEAD side', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const next = resolveConflict(blocks, 0, 'ours');
    expect(next[0].type).toBe('context');
    expect((next[0] as { content: string }).content).toBe('ours');
  });

  it('resolveConflict theirs: keeps incoming side', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const next = resolveConflict(blocks, 0, 'theirs');
    expect((next[0] as { content: string }).content).toBe('theirs');
  });

  it('resolveConflict both: concatenates ours then theirs', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const next = resolveConflict(blocks, 0, 'both');
    expect((next[0] as { content: string }).content).toBe('ours\ntheirs');
  });

  it('resolveConflict none: produces empty context', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const next = resolveConflict(blocks, 0, 'none');
    expect((next[0] as { content: string }).content).toBe('');
  });

  it('resolveConflict is non-destructive (input unchanged)', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const snapshot = JSON.stringify(blocks);
    resolveConflict(blocks, 0, 'ours');
    expect(JSON.stringify(blocks)).toBe(snapshot);
  });

  it('resolveConflict no-ops on invalid index', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const out = resolveConflict(blocks, 99, 'ours');
    expect(out).toEqual(blocks);
  });

  it('resolveConflict no-ops on a context-block index', () => {
    const src = ['a', '<<<<<<< HEAD', 'o', '=======', 't', '>>>>>>> b', 'c'].join('\n');
    const blocks = parseConflicts(src);
    // index 0 is a context block
    const out = resolveConflict(blocks, 0, 'ours');
    expect(out).toEqual(blocks);
  });

  // ============================================================
  // stringifyBlocks — round-trip
  // ============================================================

  it('stringifyBlocks round-trips a parse of a 2-way conflict', () => {
    const src = [
      'before',
      '<<<<<<< HEAD',
      'ours',
      '=======',
      'theirs',
      '>>>>>>> branch',
      'after',
    ].join('\n');
    const blocks = parseConflicts(src);
    expect(stringifyBlocks(blocks)).toBe(src);
  });

  it('stringifyBlocks emits ancestor marker when present', () => {
    const src = [
      '<<<<<<< HEAD',
      'ours',
      '||||||| base',
      'anc',
      '=======',
      'theirs',
      '>>>>>>> b',
    ].join('\n');
    const blocks = parseConflicts(src);
    const out = stringifyBlocks(blocks);
    expect(out).toContain(CONFLICT_MARKERS.ANCESTOR);
    expect(out).toContain('anc');
  });

  it('stringifyBlocks after resolving: emits clean context only', () => {
    const src = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> b';
    const blocks = parseConflicts(src);
    const resolved = resolveConflict(blocks, 0, 'ours');
    const out = stringifyBlocks(resolved);
    expect(out).toBe('ours');
    expect(out.includes(CONFLICT_MARKERS.OURS)).toBe(false);
    expect(out.includes(CONFLICT_MARKERS.SEPARATOR)).toBe(false);
  });

  it('stringifyBlocks handles empty input', () => {
    expect(stringifyBlocks([])).toBe('');
  });
});

import { runDiffGuard } from '../diff-guard';

describe('pipeline/diff-guard', () => {
  it('fails when edits happen with no SCOPE blocks', () => {
    const r = runDiffGuard({
      fileName: 'x.ts',
      original: 'const a = 1;\n',
      modified: 'const a = 2;\n',
    });
    expect(r.status).toBe('fail');
    expect(r.findings.some((f) => f.rule === 'SCOPE_OUT_OF_BOUNDS')).toBe(true);
  });

  it('passes when edits are inside SCOPE only', () => {
    const original = [
      'const header = 1;',
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');
    const modified = [
      'const header = 1;',
      '[SCOPE_START: PART-01]',
      'const inside = 2;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');

    const r = runDiffGuard({ fileName: 'x.ts', original, modified });
    expect(r.status).toBe('pass');
  });

  it('fails when edits happen outside SCOPE', () => {
    const original = [
      'const header = 1;',
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');
    const modified = [
      'const header = 9;', // outside change
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');

    const r = runDiffGuard({ fileName: 'x.ts', original, modified });
    expect(r.status).toBe('fail');
    expect(r.findings.some((f) => f.rule === 'SCOPE_OUT_OF_BOUNDS')).toBe(true);
  });

  it('fails when modified introduces extra scope blocks not in original', () => {
    const original = [
      'const header = 1;',
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');
    const modified = [
      'const header = 1;',
      '[SCOPE_START: PART-01]',
      'const inside = 2;',
      '[SCOPE_END]',
      '[SCOPE_START: PART-01]',
      'const inside2 = 3;',
      '[SCOPE_END]',
      'const tail = 1;',
    ].join('\n');

    const r = runDiffGuard({ fileName: 'x.ts', original, modified });
    expect(r.status).toBe('fail');
    expect(r.findings.some((f) => f.rule === 'SCOPE_MARKER_MISMATCH')).toBe(true);
  });

  it('fails when @block meta line is modified', () => {
    const original = [
      '// @block { "id": 1, "type": "logic" }',
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
    ].join('\n');
    const modified = [
      '// @block { "id": 1, "type": "logic", "x": 1 }', // tamper
      '[SCOPE_START: PART-01]',
      'const inside = 1;',
      '[SCOPE_END]',
    ].join('\n');

    const r = runDiffGuard({ fileName: 'x.ts', original, modified });
    expect(r.status).toBe('fail');
    expect(r.findings.some((f) => f.rule === 'BLOCK_META_TAMPER')).toBe(true);
  });

  it('fails when CONTRACT public export surface changes (ts)', () => {
    const original = [
      '[SCOPE_START: PART-01]',
      '[CONTRACT: PART-01]',
      'export function foo(a: number): string { return String(a); }',
      '[SCOPE_END]',
      'export function outside(x: number): number { return x; }',
    ].join('\n');
    const modified = [
      '[SCOPE_START: PART-01]',
      '[CONTRACT: PART-01]',
      'export function foo(a: number, b: number): string { return String(a + b); }',
      '[SCOPE_END]',
      'export function outside(x: number): number { return x + 1; }',
    ].join('\n');

    const r = runDiffGuard({ fileName: 'x.ts', original, modified, language: 'typescript' });
    expect(r.status).toBe('fail');
    expect(r.findings.some((f) => f.rule === 'CONTRACT_PUBLIC_SURFACE_CHANGED')).toBe(true);
  });
});


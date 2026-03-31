/**
 * Unit tests for replace-engine — previewReplace, executeReplace
 */
import { previewReplace, executeReplace } from '../replace-engine';
import type { FileNode } from '../../core/types';

function makeFile(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file', content } as FileNode;
}

describe('previewReplace', () => {
  it('finds matches in simple text', () => {
    const files = [makeFile('1', 'a.ts', 'const foo = 1;\nconst foo = 2;')];
    const preview = previewReplace(files, 'foo', 'bar');
    expect(preview.totalMatches).toBe(2);
    expect(preview.totalFiles).toBe(1);
  });

  it('returns zero matches when no match', () => {
    const files = [makeFile('1', 'a.ts', 'hello world')];
    const preview = previewReplace(files, 'xyz', 'abc');
    expect(preview.totalMatches).toBe(0);
  });

  it('respects caseSensitive option', () => {
    const files = [makeFile('1', 'a.ts', 'Foo foo FOO')];
    const insensitive = previewReplace(files, 'foo', 'bar');
    const sensitive = previewReplace(files, 'foo', 'bar', { caseSensitive: true });
    expect(insensitive.totalMatches).toBe(3);
    expect(sensitive.totalMatches).toBe(1);
  });

  it('supports regex mode', () => {
    const files = [makeFile('1', 'a.ts', 'let x = 123;\nlet y = 456;')];
    const preview = previewReplace(files, '\\d+', '0', { regex: true });
    expect(preview.totalMatches).toBe(2);
  });

  it('applies file filter', () => {
    const files = [
      makeFile('1', 'a.ts', 'hello'),
      makeFile('2', 'b.js', 'hello'),
    ];
    const preview = previewReplace(files, 'hello', 'hi', { fileFilter: '.ts' });
    expect(preview.totalFiles).toBe(1);
  });
});

describe('executeReplace', () => {
  it('applies replacements', () => {
    const files = [makeFile('1', 'a.ts', 'const foo = 1;')];
    const preview = previewReplace(files, 'foo', 'bar');
    const updates: Record<string, string> = {};
    const result = executeReplace(files, preview, (id, content) => { updates[id] = content; });
    expect(result.applied).toBe(1);
    expect(updates['1']).toContain('bar');
  });

  it('reports error for missing file', () => {
    const preview = {
      operations: [{ fileId: 'missing', filePath: 'x.ts', matches: [{ line: 1, column: 1, length: 3, oldText: 'foo', newText: 'bar' }] }],
      totalMatches: 1,
      totalFiles: 1,
    };
    const result = executeReplace([], preview, jest.fn());
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.skipped).toBe(1);
  });
});

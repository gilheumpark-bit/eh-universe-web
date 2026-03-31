/**
 * Unit tests for file-sort — sortFileNodes, sortPaths
 */
import { sortFileNodes, sortPaths } from '../file-sort';
import type { FileNode } from '../../core/types';

function makeNode(name: string, type: 'file' | 'folder', content?: string): FileNode {
  return { id: name, name, type, content } as FileNode;
}

describe('sortFileNodes', () => {
  it('puts folders before files', () => {
    const nodes = [makeNode('b.ts', 'file'), makeNode('src', 'folder')];
    const sorted = sortFileNodes(nodes, 'name');
    expect(sorted[0].name).toBe('src');
    expect(sorted[1].name).toBe('b.ts');
  });

  it('sorts by name alphabetically', () => {
    const nodes = [makeNode('c.ts', 'file'), makeNode('a.ts', 'file'), makeNode('b.ts', 'file')];
    const sorted = sortFileNodes(nodes, 'name');
    expect(sorted.map(n => n.name)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('sorts by type (extension)', () => {
    const nodes = [makeNode('app.tsx', 'file'), makeNode('util.ts', 'file'), makeNode('style.css', 'file')];
    const sorted = sortFileNodes(nodes, 'type');
    expect(sorted[0].name).toBe('style.css');
  });

  it('sorts by size (larger first)', () => {
    const nodes = [
      makeNode('small.ts', 'file', 'a'),
      makeNode('large.ts', 'file', 'a'.repeat(100)),
    ];
    const sorted = sortFileNodes(nodes, 'size');
    expect(sorted[0].name).toBe('large.ts');
  });

  it('recursively sorts children', () => {
    const parent = { ...makeNode('src', 'folder'), children: [makeNode('b.ts', 'file'), makeNode('a.ts', 'file')] };
    const sorted = sortFileNodes([parent], 'name');
    expect(sorted[0].children![0].name).toBe('a.ts');
  });
});

describe('sortPaths', () => {
  it('sorts directories before files at same level', () => {
    const paths = ['src/b.ts', 'src/lib/a.ts'];
    const sorted = sortPaths(paths);
    expect(sorted[0]).toBe('src/lib/a.ts');
  });

  it('sorts alphabetically', () => {
    const paths = ['c.ts', 'a.ts', 'b.ts'];
    expect(sortPaths(paths)).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });
});

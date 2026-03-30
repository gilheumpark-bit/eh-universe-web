/**
 * Unit tests for dead-code — scanDeadCode
 */
import { scanDeadCode } from '../dead-code';
import type { FileNode } from '../../../code-studio-types';

function makeFile(id: string, name: string, content: string): FileNode {
  return { id, name, type: 'file' as const, content };
}

describe('scanDeadCode', () => {
  it('detects unreachable code after return', () => {
    const file = makeFile('1', 'a.ts', [
      'function foo() {',
      '  return 1;',
      '  const x = 2;',
      '}',
    ].join('\n'));
    const findings = scanDeadCode([file]);
    const unreachable = findings.filter(f => f.kind === 'unreachable');
    expect(unreachable.length).toBeGreaterThanOrEqual(1);
  });

  it('detects unused variables', () => {
    const file = makeFile('1', 'b.ts', [
      'const unused = 42;',
      'const used = 10;',
      'console.log(used);',
    ].join('\n'));
    const findings = scanDeadCode([file]);
    const unusedVars = findings.filter(f => f.kind === 'unused-variable' && f.symbol === 'unused');
    expect(unusedVars.length).toBeGreaterThanOrEqual(1);
  });

  it('ignores underscore-prefixed variables', () => {
    const file = makeFile('1', 'c.ts', 'const _ignored = 42;');
    const findings = scanDeadCode([file]);
    const unusedVars = findings.filter(f => f.kind === 'unused-variable' && f.symbol === '_ignored');
    expect(unusedVars).toHaveLength(0);
  });

  it('detects unused imports', () => {
    const file = makeFile('1', 'd.ts', [
      "import { unused } from './lib';",
      'const x = 1;',
    ].join('\n'));
    const findings = scanDeadCode([file]);
    const unusedImports = findings.filter(f => f.kind === 'unused-import');
    expect(unusedImports.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for clean code', () => {
    const file = makeFile('1', 'e.ts', [
      'export function add(a: number, b: number) {',
      '  return a + b;',
      '}',
    ].join('\n'));
    const findings = scanDeadCode([file]);
    // May have unused-export but no other issues
    const nonExportFindings = findings.filter(f => f.kind !== 'unused-export');
    expect(nonExportFindings).toHaveLength(0);
  });
});

/**
 * Unit tests for error-parser — parseErrors, parseErrorsWithSource, groupErrorsByFile, errorSummary
 */
import { parseErrors, parseErrorsWithSource, groupErrorsByFile, errorSummary } from '../error-parser';

describe('parseErrors — TypeScript', () => {
  it('parses TS error format', () => {
    const output = 'src/app.ts(10,5): error TS2304: Cannot find name "foo"';
    const errors = parseErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('typescript');
    expect(errors[0].file).toBe('src/app.ts');
    expect(errors[0].line).toBe(10);
    expect(errors[0].code).toBe('TS2304');
  });

  it('parses TS warning format', () => {
    const output = 'src/app.ts(5,1): warning TS6133: unused var';
    const errors = parseErrors(output);
    expect(errors[0].severity).toBe('warning');
  });
});

describe('parseErrors — ESLint', () => {
  it('parses ESLint error format', () => {
    const output = '/src/app.ts\n  10:5  error  No unused vars  no-unused-vars';
    const errors = parseErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('eslint');
    expect(errors[0].line).toBe(10);
  });
});

describe('parseErrors — Runtime', () => {
  it('parses runtime error with stack trace', () => {
    const output = 'TypeError: Cannot read property\n    at Object.<anonymous> (/src/index.ts:5:10)';
    const errors = parseErrors(output);
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toBe('runtime');
    expect(errors[0].code).toBe('TypeError');
  });
});

describe('parseErrors — empty', () => {
  it('returns empty array for clean output', () => {
    expect(parseErrors('All clear!')).toHaveLength(0);
  });
});

describe('parseErrorsWithSource', () => {
  it('uses explicit source hint', () => {
    const output = 'src/x.ts(1,1): error TS1234: msg';
    const errors = parseErrorsWithSource(output, 'typescript');
    expect(errors[0].source).toBe('typescript');
  });
});

describe('groupErrorsByFile', () => {
  it('groups errors by file path', () => {
    const errors = [
      { source: 'typescript' as const, severity: 'error' as const, file: 'a.ts', line: 1, column: 1, code: 'TS1', message: 'm1', raw: '' },
      { source: 'typescript' as const, severity: 'error' as const, file: 'a.ts', line: 2, column: 1, code: 'TS2', message: 'm2', raw: '' },
      { source: 'typescript' as const, severity: 'error' as const, file: 'b.ts', line: 1, column: 1, code: 'TS3', message: 'm3', raw: '' },
    ];
    const grouped = groupErrorsByFile(errors);
    expect(grouped.get('a.ts')).toHaveLength(2);
    expect(grouped.get('b.ts')).toHaveLength(1);
  });
});

describe('errorSummary', () => {
  it('counts errors and warnings', () => {
    const errors = [
      { source: 'typescript' as const, severity: 'error' as const, file: '', line: 0, column: 0, code: '', message: '', raw: '' },
      { source: 'typescript' as const, severity: 'warning' as const, file: '', line: 0, column: 0, code: '', message: '', raw: '' },
      { source: 'typescript' as const, severity: 'info' as const, file: '', line: 0, column: 0, code: '', message: '', raw: '' },
    ];
    const summary = errorSummary(errors);
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.info).toBe(1);
  });
});

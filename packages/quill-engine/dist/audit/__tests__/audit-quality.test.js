/**
 * Unit tests for audit-quality — auditTesting, auditErrorHandling
 */
import { auditTesting, auditErrorHandling, auditFeatureCompleteness, auditDocumentation } from '../audit-quality';
function makeCtx(files) {
    return {
        files: files.map((f, i) => ({
            path: f.path ?? `file${i}.ts`,
            content: f.content ?? '',
            language: f.language ?? 'typescript',
            lines: (f.content ?? '').split('\n').length,
        })),
    };
}
describe('auditTesting', () => {
    it('passes when test files exist', () => {
        const ctx = makeCtx([{ path: 'src/__tests__/foo.test.ts', content: 'test' }]);
        const result = auditTesting(ctx);
        expect(result.area).toBe('testing');
        expect(result.checks).toBeGreaterThan(0);
    });
    it('fails when no test files', () => {
        const ctx = makeCtx([{ path: 'src/app.ts', content: 'const x = 1;' }]);
        const result = auditTesting(ctx);
        expect(result.findings.some(f => f.rule === 'NO_TESTS')).toBe(true);
    });
    it('calculates test-to-source ratio', () => {
        const ctx = makeCtx([
            { path: 'src/a.ts', content: 'code' },
            { path: 'src/b.ts', content: 'code' },
            { path: 'src/__tests__/a.test.ts', content: 'test' },
        ]);
        const result = auditTesting(ctx);
        expect(result.metrics?.ratio).toBeDefined();
    });
});
describe('auditErrorHandling', () => {
    it('detects empty catch blocks', () => {
        const ctx = makeCtx([{ path: 'src/a.ts', content: 'try { x() } catch (e) {}' }]);
        const result = auditErrorHandling(ctx);
        expect(result.findings.some(f => f.rule === 'EMPTY_CATCH')).toBe(true);
    });
    it('passes for proper error handling', () => {
        const ctx = makeCtx([{
                path: 'src/a.ts',
                content: 'try { await fetch() } catch (e) { console.error(e); }',
            }]);
        const result = auditErrorHandling(ctx);
        const emptyCatch = result.findings.filter(f => f.rule === 'EMPTY_CATCH');
        expect(emptyCatch).toHaveLength(0);
    });
});
describe('auditFeatureCompleteness', () => {
    it('returns area feature-completeness', () => {
        const ctx = makeCtx([{ path: 'src/a.ts', content: 'export function foo() { return 1; }' }]);
        const result = auditFeatureCompleteness(ctx);
        expect(result.area).toBe('feature-completeness');
    });
});
describe('auditDocumentation', () => {
    it('checks for README', () => {
        const ctx = makeCtx([{ path: 'README.md', content: '# Project' }]);
        const result = auditDocumentation(ctx);
        expect(result.findings.some(f => f.rule === 'NO_README')).toBe(false);
    });
});

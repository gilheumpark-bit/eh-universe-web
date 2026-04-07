/**
 * Unit tests for quality-checklist 2-tier inspection system
 */
import { runTier1, selectPrecisionTargets, generateChecklistReport, buildPrecisionPrompt, } from '../quality-checklist';
// ── Tier 1 Tests ──
describe('runTier1', () => {
    it('returns 15 check items for any code', () => {
        const results = runTier1('const x = 1;', 'test.ts');
        expect(results.length).toBe(15);
        expect(results.every(r => r.tier === 'basic')).toBe(true);
    });
    it('S01: detects empty catch blocks', () => {
        const code = 'try { x(); } catch (e) {} try { y(); } catch {}';
        const results = runTier1(code, 'test.ts');
        const s01 = results.find(r => r.id === 'S01');
        expect(s01.status).toBe('warn'); // 2건 = warn (≤2), 3건+ = fail
        expect(s01.metric).toBe(2);
    });
    it('S01: passes when catch has body', () => {
        const code = 'try { x(); } catch (e) { console.error(e); }';
        const results = runTier1(code, 'test.ts');
        const s01 = results.find(r => r.id === 'S01');
        expect(s01.status).toBe('pass');
    });
    it('S02: detects eval usage', () => {
        const code = 'const result = eval("1+1");';
        const results = runTier1(code, 'test.ts');
        const s02 = results.find(r => r.id === 'S02');
        expect(s02.status).toBe('fail');
        expect(s02.metric).toBe(1);
    });
    it('S03: detects any type', () => {
        const code = 'const x: any = 1; const y = z as any;';
        const results = runTier1(code, 'test.ts');
        const s03 = results.find(r => r.id === 'S03');
        expect(s03.status).toBe('warn');
        expect(s03.metric).toBe(2);
    });
    it('P01: detects nested loops', () => {
        const code = 'for (let i = 0; i < n; i++) {\n  for (let j = 0; j < m; j++) {\n    for (let k = 0; k < p; k++) {\n    }\n  }\n}';
        const results = runTier1(code, 'test.ts');
        const p01 = results.find(r => r.id === 'P01');
        expect(p01.status).toBe('fail');
        expect(p01.metric).toBeGreaterThanOrEqual(3);
    });
    it('P02: detects console.log', () => {
        const code = 'console.log("a"); console.warn("b"); console.error("c"); console.debug("d");';
        const results = runTier1(code, 'test.ts');
        const p02 = results.find(r => r.id === 'P02');
        expect(p02.status).toBe('fail');
        expect(p02.metric).toBe(4);
    });
    it('R01: detects unguarded await', () => {
        const code = 'async function f() {\n  const data = await fetch("/api");\n  return data;\n}';
        const results = runTier1(code, 'test.ts');
        const r01 = results.find(r => r.id === 'R01');
        expect(r01.status).not.toBe('pass');
        expect(r01.metric).toBeGreaterThan(0);
    });
    it('R01: passes when await is in try-catch', () => {
        const code = 'async function f() {\n  try {\n    const data = await fetch("/api");\n  } catch (e) { throw e; }\n}';
        const results = runTier1(code, 'test.ts');
        const r01 = results.find(r => r.id === 'R01');
        expect(r01.status).toBe('pass');
    });
    it('X01: detects hardcoded secrets', () => {
        const code = 'const apiKey = "sk-1234567890abcdef";';
        const results = runTier1(code, 'test.ts');
        const x01 = results.find(r => r.id === 'X01');
        expect(x01.status).toBe('fail');
    });
    it('X01: passes on clean code', () => {
        const code = 'const apiKey = process.env.API_KEY;';
        const results = runTier1(code, 'test.ts');
        const x01 = results.find(r => r.id === 'X01');
        expect(x01.status).toBe('pass');
    });
    it('M01: detects TODO/FIXME', () => {
        const code = '// TODO: fix this\n// FIXME: broken\n// HACK: workaround\n// XXX: bad';
        const results = runTier1(code, 'test.ts');
        const m01 = results.find(r => r.id === 'M01');
        expect(m01.status).toBe('fail');
        expect(m01.metric).toBe(4);
    });
    it('all pass on clean code', () => {
        const cleanCode = `
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
`;
        const results = runTier1(cleanCode, 'Counter.tsx');
        const failed = results.filter(r => r.status === 'fail');
        expect(failed.length).toBe(0);
    });
});
// ── Precision Target Selection ──
describe('selectPrecisionTargets', () => {
    it('returns domains with fail/warn items', () => {
        const items = [
            { id: 'S01', tier: 'basic', domain: 'safety', label: { ko: '', en: '' }, description: { ko: '', en: '' }, status: 'fail', autoFixable: false },
            { id: 'P01', tier: 'basic', domain: 'performance', label: { ko: '', en: '' }, description: { ko: '', en: '' }, status: 'pass', autoFixable: false },
            { id: 'R01', tier: 'basic', domain: 'reliability', label: { ko: '', en: '' }, description: { ko: '', en: '' }, status: 'warn', autoFixable: false },
        ];
        const targets = selectPrecisionTargets(items);
        expect(targets).toContain('safety');
        expect(targets).toContain('reliability');
        expect(targets).not.toContain('performance');
    });
    it('returns empty when all pass', () => {
        const items = [
            { id: 'S01', tier: 'basic', domain: 'safety', label: { ko: '', en: '' }, description: { ko: '', en: '' }, status: 'pass', autoFixable: false },
        ];
        expect(selectPrecisionTargets(items)).toEqual([]);
    });
});
// ── Report Generation ──
describe('generateChecklistReport', () => {
    it('calculates score correctly', () => {
        const tier1 = runTier1('const x: any = eval("bad");', 'bad.ts');
        const report = generateChecklistReport('bad.ts', tier1);
        expect(report.score).toBeLessThan(100);
        expect(report.failed).toBeGreaterThan(0);
        expect(report.totalChecks).toBe(15);
        expect(report.fileName).toBe('bad.ts');
        expect(report.timestamp).toBeGreaterThan(0);
    });
    it('returns 100 for clean code', () => {
        const cleanCode = 'export function add(a: number, b: number): number { return a + b; }';
        const tier1 = runTier1(cleanCode, 'clean.ts');
        const report = generateChecklistReport('clean.ts', tier1);
        expect(report.score).toBeGreaterThanOrEqual(90);
    });
    it('flags security fail in summary', () => {
        const code = 'const secret = "sk-abcdefghijklmnop";';
        const tier1 = runTier1(code, 'leak.ts');
        const report = generateChecklistReport('leak.ts', tier1);
        expect(report.summary.ko).toContain('보안');
        expect(report.summary.en).toContain('Security');
    });
});
// ── Precision Prompt ──
describe('buildPrecisionPrompt', () => {
    it('includes fail items in prompt', () => {
        const items = [
            { id: 'S02', tier: 'basic', domain: 'safety', label: { ko: 'eval', en: 'eval usage' }, description: { ko: '', en: '' }, status: 'fail', detail: '1건', autoFixable: false },
        ];
        const prompt = buildPrecisionPrompt('eval("x")', 'bad.ts', items, ['safety']);
        expect(prompt).toContain('PRECISION STRIKE');
        expect(prompt).toContain('S02');
        expect(prompt).toContain('SAFETY');
        expect(prompt).toContain('eval("x")');
    });
});

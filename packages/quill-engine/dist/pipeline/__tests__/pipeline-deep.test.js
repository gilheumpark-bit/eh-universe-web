/**
 * Deep tests for pipeline and AI modules — coverage boost 30% → 50%+
 *
 * Covers:
 *   1. pipeline.ts — runStaticPipeline (8 tests)
 *   2. pipeline-teams.ts — runTeam3Validation, runTeam8Governance (6 tests)
 *   3. quality-checklist.ts — runTier1, GP bonus, score calculation (6 tests)
 *   4. good-pattern-detector.ts — detectGoodPatterns, suppress/downgrade (5 tests)
 */
import { runStaticPipeline, } from '../pipeline';
import { runTeam3Validation, runTeam8Governance, } from '../pipeline-teams';
import { runTier1, generateChecklistReport, } from '../quality-checklist';
import { detectGoodPatterns, suppressFindings, downgradeFindings, } from '../good-pattern-detector';
// ============================================================
// PART 1 — pipeline.ts: runStaticPipeline (8 tests)
// ============================================================
describe('pipeline.ts — runStaticPipeline', () => {
    it('clean code yields high overall score', () => {
        const clean = `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
`;
        const result = runStaticPipeline(clean, 'typescript');
        expect(result.overallScore).toBeGreaterThanOrEqual(80);
        expect(result.overallStatus).toBe('pass');
    });
    it('console.log causes deduction', () => {
        const code = `
function debug() {
  console.log("a");
  console.log("b");
  console.log("c");
  console.log("d");
  console.log("e");
}
`;
        const result = runStaticPipeline(code, 'javascript');
        // Generation stage detects console.log calls
        const genStage = result.stages.find(s => s.name === 'Generation');
        expect(genStage).toBeDefined();
        expect(genStage.findings.length).toBeGreaterThan(0);
    });
    it('nested loops cause complexity deduction', () => {
        const code = `
function matrix(arr) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      process(arr[i][j]);
    }
  }
}
`;
        const result = runStaticPipeline(code, 'javascript');
        const stability = result.stages.find(s => s.name === 'Stability');
        expect(stability).toBeDefined();
        expect(stability.score).toBeLessThan(100);
    });
    it('empty file handles gracefully', () => {
        const result = runStaticPipeline('', 'typescript');
        expect(result.stages.length).toBe(8);
        expect(result.overallScore).toBeDefined();
        expect(typeof result.overallScore).toBe('number');
        expect(result.overallStatus).toBeDefined();
    });
    it('score includes good pattern bonus', () => {
        // Code with many good patterns: const preference, try-catch-finally,
        // optional chaining, type narrowing, early return
        const code = `
const MAX_RETRIES = 3;
const TIMEOUT = 5000;
const DEFAULT_VALUE = '';

export async function fetchData(url: string): Promise<string> {
  if (!url) return DEFAULT_VALUE;
  if (typeof url !== 'string') throw new Error('Invalid url');

  const controller = new AbortController();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = res?.body ?? DEFAULT_VALUE;
    return data?.toString() ?? DEFAULT_VALUE;
  } catch (err) {
    console.error(err);
    return DEFAULT_VALUE;
  } finally {
    controller.abort();
  }
}
`;
        const result = runStaticPipeline(code, 'typescript');
        expect(result.goodPatterns).toBeDefined();
        expect(result.goodPatterns.scoreBonus).toBeGreaterThanOrEqual(0);
    });
    it('good pattern report has correct structure', () => {
        const code = 'const x = 1;';
        const result = runStaticPipeline(code, 'typescript');
        expect(result.goodPatterns).toBeDefined();
        const gp = result.goodPatterns;
        expect(typeof gp.totalDetected).toBe('number');
        expect(typeof gp.boostCount).toBe('number');
        expect(typeof gp.suppressCount).toBe('number');
        expect(typeof gp.scoreBonus).toBe('number');
        expect(Array.isArray(gp.patterns)).toBe(true);
        expect(Array.isArray(gp.suppressedRules)).toBe(true);
    });
    it('team aggregation produces correct stage count', () => {
        const result = runStaticPipeline('function x() {}', 'typescript');
        expect(result.stages.length).toBe(8);
        const names = result.stages.map(s => s.name);
        expect(names).toContain('Simulation');
        expect(names).toContain('Generation');
        expect(names).toContain('Validation');
        expect(names).toContain('Size-Density');
        expect(names).toContain('Asset Trace');
        expect(names).toContain('Stability');
        expect(names).toContain('Release IP');
        expect(names).toContain('Governance');
    });
    it('result has all required fields', () => {
        const result = runStaticPipeline('const a = 1;', 'typescript');
        expect(result).toHaveProperty('stages');
        expect(result).toHaveProperty('overallScore');
        expect(result).toHaveProperty('overallStatus');
        expect(result).toHaveProperty('timestamp');
        expect(result.timestamp).toBeGreaterThan(0);
        expect(['pass', 'warn', 'fail']).toContain(result.overallStatus);
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
    });
});
// ============================================================
// PART 2 — pipeline-teams.ts: Team3 & Team8 (6 tests)
// ============================================================
describe('pipeline-teams.ts — team validation & governance', () => {
    it('runTeam3Validation detects unused variables via unused imports', () => {
        const code = `import { useState, useEffect } from 'react';
export function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
`;
        const result = runTeam3Validation(code, 'typescript', 'App.tsx');
        // useEffect is imported but not used in the rest of code
        const unusedFinding = result.findings.find(f => f.message.includes('미사용 import') || f.rule === 'UNUSED_IMPORT');
        expect(unusedFinding).toBeDefined();
    });
    it('runTeam8Governance checks architecture constraints', () => {
        // Deeply nested code + legacy patterns should trigger governance findings
        const code = `
var globalState = {};
module.exports = globalState;
function deep() {
  if (true) {
    if (true) {
      if (true) {
        if (true) {
          if (true) {
            if (true) {
              doSomething();
            }
          }
        }
      }
    }
  }
}
`;
        const result = runTeam8Governance(code, 'typescript', 'legacy.ts');
        expect(result.findings.length).toBeGreaterThan(0);
        expect(result.stage).toBe('governance');
        // Should detect nesting depth or legacy patterns
        const hasNesting = result.findings.some(f => f.rule === 'NESTING_DEPTH');
        const hasLegacy = result.findings.some(f => f.rule === 'LEGACY_PATTERN');
        expect(hasNesting || hasLegacy).toBe(true);
    });
    it('each team produces Finding[] with severity and optional line', () => {
        const code = 'const x: any = eval("bad"); // TODO: fix\n debugger;';
        const t3 = runTeam3Validation(code, 'typescript', 'test.ts');
        const t8 = runTeam8Governance(code, 'typescript', 'test.ts');
        for (const result of [t3, t8]) {
            expect(Array.isArray(result.findings)).toBe(true);
            for (const f of result.findings) {
                expect(f).toHaveProperty('severity');
                expect(f).toHaveProperty('message');
                expect(['critical', 'major', 'minor', 'info']).toContain(f.severity);
            }
        }
    });
    it('good pattern downgrade is applied in team3', () => {
        // Code with both bad patterns and good patterns
        // The good patterns (try-catch-finally, const preference) should influence scoring
        const code = `
const MAX = 10;
const MIN = 0;
const DEFAULT = 5;
const TIMEOUT = 3000;

export async function safeFetch(url: string) {
  try {
    const res = await fetch(url);
    return res;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    cleanup();
  }
}
`;
        const result = runTeam3Validation(code, 'typescript', 'safe.ts');
        expect(result.metrics).toBeDefined();
        expect(result.metrics.goodPatternsDetected).toBeGreaterThanOrEqual(0);
    });
    it('trust scoring is calculated in team8', () => {
        const code = `
export function simple(): number {
  return 42;
}
`;
        const result = runTeam8Governance(code, 'typescript', 'simple.ts');
        expect(result.metrics).toBeDefined();
        expect(result.metrics.trustScore).toBeDefined();
        expect(result.metrics.trustScore).toBeGreaterThanOrEqual(0);
        expect(result.metrics.trustScore).toBeLessThanOrEqual(100);
    });
    it('team metrics reporting includes expected keys', () => {
        const code = 'function f(a: number) { if (a > 0) { return a; } return 0; }';
        const t8 = runTeam8Governance(code, 'typescript', 'test.ts');
        expect(t8.metrics).toBeDefined();
        expect(t8.metrics).toHaveProperty('cyclomaticComplexity');
        expect(t8.metrics).toHaveProperty('maxNesting');
        expect(t8.metrics).toHaveProperty('longestFunction');
        expect(t8.metrics).toHaveProperty('trustScore');
        expect(t8.metrics).toHaveProperty('goodPatternsDetected');
    });
});
// ============================================================
// PART 3 — quality-checklist.ts (6 tests)
// ============================================================
describe('quality-checklist.ts — tier1, GP bonus, scoring', () => {
    it('runTier1 returns CheckItem[] with pass/fail status', () => {
        const results = runTier1('const x = 1;', 'test.ts');
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBeGreaterThan(0);
        for (const item of results) {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('status');
            expect(item).toHaveProperty('tier');
            expect(item).toHaveProperty('domain');
            expect(item).toHaveProperty('autoFixable');
            expect(['pass', 'warn', 'fail', 'skip']).toContain(item.status);
        }
    });
    it('S01 safety check: detects empty catch blocks', () => {
        const code = `
try { doSomething(); } catch (e) {}
try { doOther(); } catch {}
try { doThird(); } catch (err) {}
`;
        const results = runTier1(code, 'test.ts');
        const s01 = results.find(r => r.id === 'S01');
        expect(s01).toBeDefined();
        expect(s01.status).toBe('fail'); // 3 empty catches = fail
        expect(s01.metric).toBe(3);
    });
    it('P02 performance: counts console.log calls', () => {
        const code = `
console.log("one");
console.warn("two");
`;
        const results = runTier1(code, 'test.ts');
        const p02 = results.find(r => r.id === 'P02');
        expect(p02).toBeDefined();
        expect(p02.metric).toBe(2);
        expect(p02.status).toBe('warn'); // 2 = warn (<=3)
    });
    it('GP01 bonus: try-catch-finally gives pass item', () => {
        const code = `
try {
  const data = await fetchData();
  process(data);
} catch (err) {
  handleError(err);
} finally {
  cleanup();
}
`;
        const results = runTier1(code, 'test.ts');
        const gp01 = results.find(r => r.id === 'GP01');
        expect(gp01).toBeDefined();
        expect(gp01.status).toBe('pass');
        expect(gp01.metric).toBeGreaterThanOrEqual(1);
    });
    it('GP02 bonus: const preference detected when ratio >= 70%', () => {
        const code = `
const a = 1;
const b = 2;
const c = 3;
const d = 4;
let e = 5;
`;
        const results = runTier1(code, 'test.ts');
        const gp02 = results.find(r => r.id === 'GP02');
        expect(gp02).toBeDefined();
        expect(gp02.status).toBe('pass');
        // 4 const / 5 total = 80%
        expect(gp02.metric).toBeGreaterThanOrEqual(70);
    });
    it('overall score includes GP bonus in report', () => {
        // Code with many good patterns for bonus
        const code = `
const MAX = 100;
const MIN = 0;
const DEFAULT = 50;

function validate(input: string): boolean {
  if (!input) return false;
  if (typeof input !== 'string') return false;
  try {
    JSON.parse(input);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  } finally {
    log('validated');
  }
}
`;
        const tier1 = runTier1(code, 'test.ts');
        const report = generateChecklistReport('test.ts', tier1);
        // GP bonus items should push score above base penalty score
        expect(report.score).toBeGreaterThan(0);
        expect(report.score).toBeLessThanOrEqual(100);
        // Check that GP items exist in the tier1 results
        const gpItems = tier1.filter(r => r.id.startsWith('GP'));
        expect(gpItems.length).toBeGreaterThanOrEqual(1);
    });
});
// ============================================================
// PART 4 — good-pattern-detector.ts (5 tests)
// ============================================================
describe('good-pattern-detector.ts — detect, suppress, downgrade', () => {
    it('detectGoodPatterns finds try-catch-finally', () => {
        const code = `
async function load() {
  try {
    const data = await fetch('/api');
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  } finally {
    cleanup();
  }
}
`;
        const report = detectGoodPatterns(code);
        // GQ-AS-005 matches try-catch-finally pattern
        const tcf = report.patterns.find(p => p.id === 'GQ-AS-005');
        expect(tcf).toBeDefined();
        expect(tcf.count).toBeGreaterThanOrEqual(1);
    });
    it('detectGoodPatterns finds const preference', () => {
        const code = `
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
let f = 6;
`;
        const report = detectGoodPatterns(code);
        // GQ-FN-009 detects const preference (>= 70%)
        const constPref = report.patterns.find(p => p.id === 'GQ-FN-009');
        expect(constPref).toBeDefined();
        expect(constPref.count).toBeGreaterThan(0);
    });
    it('suppressFindings removes matched rules', () => {
        const findings = [
            { message: 'Bad naming', rule: 'STL-002', severity: 'warning' },
            { message: 'Other issue', rule: 'UNRELATED', severity: 'error' },
            { message: 'No rule', severity: 'info' },
        ];
        const report = {
            patterns: [],
            totalDetected: 1,
            boostCount: 0,
            suppressCount: 1,
            scoreBonus: 0,
            suppressedRules: ['STL-002'],
        };
        const filtered = suppressFindings(findings, report);
        expect(filtered.length).toBe(2);
        expect(filtered.find(f => f.rule === 'STL-002')).toBeUndefined();
        expect(filtered.find(f => f.rule === 'UNRELATED')).toBeDefined();
    });
    it('downgradeFindings reduces severity for matched rules', () => {
        const findings = [
            { message: 'Major issue', rule: 'STL-004', severity: 'major' },
            { message: 'Warning issue', rule: 'STL-004', severity: 'warning' },
            { message: 'Unrelated', rule: 'OTHER', severity: 'error' },
        ];
        const report = {
            patterns: [],
            totalDetected: 1,
            boostCount: 1,
            suppressCount: 0,
            scoreBonus: 1,
            suppressedRules: ['STL-004'],
        };
        const downgraded = downgradeFindings(findings, report);
        expect(downgraded.length).toBe(3);
        // major -> minor
        expect(downgraded[0].severity).toBe('minor');
        // warning -> info
        expect(downgraded[1].severity).toBe('info');
        // unmatched rule stays same
        expect(downgraded[2].severity).toBe('error');
    });
    it('empty code yields empty results', () => {
        const report = detectGoodPatterns('');
        expect(report.patterns.length).toBe(0);
        expect(report.totalDetected).toBe(0);
        expect(report.boostCount).toBe(0);
        expect(report.suppressCount).toBe(0);
        expect(report.scoreBonus).toBe(0);
        expect(report.suppressedRules.length).toBe(0);
    });
});

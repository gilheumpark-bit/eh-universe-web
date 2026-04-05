// ============================================================
// CS Quill 🦔 — Auto-Heal Engine (자동 치유)
// ============================================================
// AI 생성 코드를 샌드박스에서 퍼징 → 에러 수집 → AI 수정 → 재검증 루프.
// 사용자 개입 없이 최대 6회 자가 수정.

import { createLoopGuard } from './loop-guard';

// ============================================================
// PART 1 — Types
// ============================================================

export interface HealResult {
  originalCode: string;
  finalCode: string;
  rounds: number;
  healed: boolean;
  fixes: Array<{
    round: number;
    error: string;
    fix: string;
    success: boolean;
  }>;
  fuzzResults: Array<{
    input: string;
    crashed: boolean;
    error?: string;
  }>;
  finalScore: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=HealResult

// ============================================================
// PART 2 — Fuzz → Error → Fix → Verify Loop
// ============================================================

const FUZZ_INPUTS = [
  { label: 'null', code: 'null' },
  { label: 'undefined', code: 'undefined' },
  { label: 'empty string', code: '""' },
  { label: 'zero', code: '0' },
  { label: 'negative', code: '-1' },
  { label: 'NaN', code: 'NaN' },
  { label: 'Infinity', code: 'Infinity' },
  { label: 'empty array', code: '[]' },
  { label: 'empty object', code: '{}' },
  { label: 'huge string', code: '"a".repeat(100000)' },
  { label: 'special chars', code: '"<script>alert(1)</script>"' },
  { label: 'unicode', code: '"🦔💀\\u0000"' },
  { label: 'boolean', code: 'true' },
  { label: 'nested null', code: '{ a: { b: null } }' },
  { label: 'array of nulls', code: '[null, null, null]' },
];

export async function runAutoHeal(
  code: string,
  functionName: string,
  onProgress?: (round: number, status: string) => void,
): Promise<HealResult> {
  const guard = createLoopGuard({ maxRounds: 6, passThreshold: 80 });
  let currentCode = code;
  const fixes: HealResult['fixes'] = [];
  let fuzzResults: HealResult['fuzzResults'] = [];

  for (let round = 1; round <= 6; round++) {
    onProgress?.(round, 'fuzzing');

    // Step 1: Fuzz test
    const { runInSandbox } = await import('../adapters/sandbox');
    const errors: Array<{ input: string; error: string }> = [];
    fuzzResults = [];

    for (const fuzz of FUZZ_INPUTS) {
      const testCode = `
${currentCode}

try {
  const __result = ${functionName}(${fuzz.code});
  console.log(JSON.stringify({ ok: true, type: typeof __result }));
} catch(e) {
  console.log(JSON.stringify({ ok: false, error: e.message, stack: e.stack?.split('\\n')[1] }));
}
`;
      const result = runInSandbox(testCode, { timeout: 3000 });
      const crashed = !result.success || result.stdout.includes('"ok":false');
      fuzzResults.push({ input: fuzz.label, crashed, error: crashed ? result.stderr || result.stdout : undefined });

      if (crashed) {
        let errorMsg = result.stderr || '';
        try {
          const parsed = JSON.parse(result.stdout);
          if (parsed.error) errorMsg = `${parsed.error} (input: ${fuzz.label})`;
        } catch { /* use stderr */ }
        if (errorMsg) errors.push({ input: fuzz.label, error: errorMsg.slice(0, 200) });
      }
    }

    // Score: crash-free rate
    const crashFreeRate = fuzzResults.filter(r => !r.crashed).length / fuzzResults.length;
    const score = Math.round(crashFreeRate * 100);

    // Check guard
    const stopReason = guard.check(score, errors.length > 0 ? 1 : 0, 0.01);
    if (stopReason === 'passed') {
      return { originalCode: code, finalCode: currentCode, rounds: round, healed: true, fixes, fuzzResults, finalScore: score };
    }
    if (stopReason && stopReason !== 'passed') {
      return { originalCode: code, finalCode: currentCode, rounds: round, healed: false, fixes, fuzzResults, finalScore: score };
    }

    if (errors.length === 0) continue; // No errors to fix

    // Step 2: AI fix
    onProgress?.(round, 'fixing');

    try {
      const { streamChat } = await import('./ai-bridge');
      const { getTemperature } = await import('./ai-config');

      const errorSummary = errors.slice(0, 5).map(e => `- Input: ${e.input} → ${e.error}`).join('\n');

      let fixedCode = '';
      await streamChat({
        systemInstruction: `You are a bug fixer. Fix the code to handle these edge-case inputs without crashing. Output ONLY the fixed function code. No explanation.`,
        messages: [{
          role: 'user',
          content: `Function: ${functionName}\n\nErrors:\n${errorSummary}\n\nCode:\n\`\`\`\n${currentCode}\n\`\`\`\n\nFix the code:`,
        }],
        onChunk: (t: string) => { fixedCode += t; },
        temperature: getTemperature('conflict'),
      });

      fixedCode = fixedCode.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

      if (fixedCode.length > 20) {
        fixes.push({ round, error: errors[0].error, fix: `Fixed ${errors.length} crashes`, success: true });
        currentCode = fixedCode;
      } else {
        fixes.push({ round, error: errors[0].error, fix: 'AI returned empty', success: false });
      }
    } catch {
      fixes.push({ round, error: errors[0]?.error ?? 'unknown', fix: 'AI unavailable', success: false });
      if (!guard.recordError()) break;
    }
  }

  const finalCrashFree = fuzzResults.filter(r => !r.crashed).length / Math.max(1, fuzzResults.length);
  return {
    originalCode: code, finalCode: currentCode,
    rounds: 6, healed: finalCrashFree >= 0.8,
    fixes, fuzzResults, finalScore: Math.round(finalCrashFree * 100),
  };
}

// IDENTITY_SEAL: PART-2 | role=heal-loop | inputs=code,functionName | outputs=HealResult

// ============================================================
// PART 3 — Multi-Function Heal (파일 전체)
// ============================================================

export async function healFile(
  code: string,
  fileName: string,
  onProgress?: (func: string, round: number, status: string) => void,
): Promise<{
  functions: Array<{ name: string; result: HealResult }>;
  overallScore: number;
  totalFixes: number;
}> {
  // Extract function names
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
  const functions: string[] = [];
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    functions.push(match[1] ?? match[2]);
  }

  const results: Array<{ name: string; result: HealResult }> = [];
  let totalFixes = 0;
  let currentCode = code;

  for (const func of functions) {
    onProgress?.(func, 0, 'starting');
    const result = await runAutoHeal(currentCode, func, (round, status) => {
      onProgress?.(func, round, status);
    });
    results.push({ name: func, result });
    totalFixes += result.fixes.filter(f => f.success).length;
    if (result.healed) currentCode = result.finalCode;
  }

  const scores = results.map(r => r.result.finalScore);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

  return { functions: results, overallScore, totalFixes };
}

// IDENTITY_SEAL: PART-3 | role=file-heal | inputs=code,fileName | outputs=results

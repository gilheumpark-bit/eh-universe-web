// ============================================================
// CS Quill 🦔 — Test Engine Adapter
// ============================================================
// 3 packages: vitest, fast-check, stryker (뮤테이션)

// ============================================================
// PART 1 — Vitest Runner
// ============================================================

export async function runVitest(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('npx vitest run --reporter=json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 120000,
    });
    const data = JSON.parse(output);
    return {
      total: data.numTotalTests ?? 0,
      passed: data.numPassedTests ?? 0,
      failed: data.numFailedTests ?? 0,
      skipped: data.numPendingTests ?? 0,
      duration: data.testResults?.[0]?.perfStats?.runtime ?? 0,
    };
  } catch {
    // Fallback: try jest
    try {
      const output = execSync('npx jest --json 2>/dev/null', {
        cwd: rootPath, encoding: 'utf-8', timeout: 120000,
      });
      const data = JSON.parse(output);
      return {
        total: data.numTotalTests ?? 0,
        passed: data.numPassedTests ?? 0,
        failed: data.numFailedTests ?? 0,
        skipped: data.numPendingTests ?? 0,
        duration: 0,
      };
    } catch {
      return { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 };
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=vitest | inputs=rootPath | outputs=testResults

// ============================================================
// PART 2 — fast-check (Property-Based / Fuzz)
// ============================================================

export async function runFastCheck(testFn: () => void) {
  const fc = await import('fast-check');
  const findings: string[] = [];

  try {
    // Example: test with arbitrary strings
    fc.assert(
      fc.property(fc.string(), fc.integer(), (str, num) => {
        try {
          testFn();
          return true;
        } catch (e) {
          findings.push(`Crash with input: str="${str.slice(0, 20)}", num=${num}: ${(e as Error).message}`);
          return false;
        }
      }),
      { numRuns: 100 },
    );
  } catch (e) {
    findings.push(`Property failed: ${(e as Error).message}`);
  }

  return { findings, crashCount: findings.length };
}

// IDENTITY_SEAL: PART-2 | role=fast-check | inputs=testFn | outputs=findings

// ============================================================
// PART 3 — Stryker (뮤테이션 테스트)
// ============================================================

export async function runStryker(rootPath: string) {
  const { execSync } = await import('child_process');
  try {
    const output = execSync('npx stryker run --reporters json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 300000,
    });

    // Parse stryker output
    const scoreMatch = output.match(/Mutation score:\s*([\d.]+)%/);
    const killedMatch = output.match(/Killed:\s*(\d+)/);
    const survivedMatch = output.match(/Survived:\s*(\d+)/);

    return {
      mutationScore: scoreMatch ? parseFloat(scoreMatch[1]) : 0,
      killed: killedMatch ? parseInt(killedMatch[1], 10) : 0,
      survived: survivedMatch ? parseInt(survivedMatch[1], 10) : 0,
    };
  } catch {
    return { mutationScore: 0, killed: 0, survived: 0 };
  }
}

// IDENTITY_SEAL: PART-3 | role=stryker | inputs=rootPath | outputs=mutationResults

// ============================================================
// PART 4 — Unified Test Runner
// ============================================================

export async function runFullTestAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // Vitest/Jest
  const testResult = await runVitest(rootPath);
  const testScore = testResult.total > 0 ? Math.round((testResult.passed / testResult.total) * 100) : 0;
  results.push({ engine: 'vitest/jest', score: testScore, detail: `${testResult.passed}/${testResult.total} passed` });

  // Stryker (only if tests exist)
  if (testResult.total > 0) {
    try {
      const mutation = await runStryker(rootPath);
      results.push({ engine: 'stryker', score: Math.round(mutation.mutationScore), detail: `${mutation.killed} killed, ${mutation.survived} survived` });
    } catch {
      results.push({ engine: 'stryker', score: 0, detail: 'not configured' });
    }
  }

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-4 | role=unified-test | inputs=rootPath | outputs=results

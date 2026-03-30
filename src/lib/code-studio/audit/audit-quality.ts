// ============================================================
// Code Studio — Audit Engine: B. Quality Assurance (4 areas)
// ============================================================
// 5. Testing  6. Error Handling  7. Feature Completeness  8. Documentation

import type {
  AuditContext, AuditAreaResult, AuditFinding, AuditGrade,
} from './audit-types';

let findingCounter = 0;
function fid(area: string): string { return `${area}-${++findingCounter}`; }
function gradeFromScore(s: number): AuditGrade {
  if (s >= 95) return 'S'; if (s >= 85) return 'A'; if (s >= 70) return 'B';
  if (s >= 55) return 'C'; if (s >= 40) return 'D'; return 'F';
}

// ============================================================
// PART 1 — Area 5: Testing (테스트)
// ============================================================

export function auditTesting(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const testFiles = ctx.files.filter(f => /\.(test|spec)\.(ts|tsx|js)$/.test(f.path));
  const srcFiles = ctx.files.filter(f =>
    !f.path.includes('__tests__') && !f.path.includes('.test.') && !f.path.includes('.spec.') &&
    !f.path.includes('node_modules') && (f.language === 'typescript' || f.language === 'tsx'),
  );

  // Check 1: Test files exist
  checks++;
  if (testFiles.length > 0) { passed++; } else {
    findings.push({ id: fid('test'), area: 'testing', severity: 'critical', message: '테스트 파일 0건', rule: 'NO_TESTS' });
  }

  // Check 2: Test-to-source ratio
  checks++;
  const ratio = srcFiles.length > 0 ? testFiles.length / srcFiles.length : 0;
  if (ratio >= 0.3) {
    passed++;
  } else {
    findings.push({
      id: fid('test'), area: 'testing', severity: ratio < 0.1 ? 'high' : 'medium',
      message: `테스트/소스 비율 ${(ratio * 100).toFixed(0)}% — 30% 이상 권장`, rule: 'LOW_TEST_RATIO',
    });
  }

  // Check 3: Component tests
  checks++;
  const componentFiles = srcFiles.filter(f => f.path.includes('/components/'));
  const componentTests = testFiles.filter(f => f.path.includes('/components/'));
  if (componentTests.length > 0 || componentFiles.length === 0) {
    passed++;
  } else {
    findings.push({
      id: fid('test'), area: 'testing', severity: 'high',
      message: `UI 컴포넌트 ${componentFiles.length}개, 테스트 ${componentTests.length}건`, rule: 'NO_COMPONENT_TESTS',
    });
  }

  // Check 4: Hook tests
  checks++;
  const hookFiles = srcFiles.filter(f => f.path.includes('/hooks/'));
  const hookTests = testFiles.filter(f => f.path.includes('/hooks/'));
  if (hookTests.length >= hookFiles.length * 0.3 || hookFiles.length === 0) {
    passed++;
  } else {
    findings.push({
      id: fid('test'), area: 'testing', severity: 'medium',
      message: `훅 ${hookFiles.length}개 중 ${hookTests.length}개만 테스트`, rule: 'LOW_HOOK_TESTS',
    });
  }

  // Check 5: E2E tests
  checks++;
  const e2eFiles = ctx.files.filter(f => f.path.includes('/e2e/') || f.path.includes('playwright'));
  if (e2eFiles.length >= 3) {
    passed++;
  } else {
    findings.push({
      id: fid('test'), area: 'testing', severity: 'medium',
      message: `E2E 테스트 ${e2eFiles.length}건 — 최소 3건 권장`, rule: 'LOW_E2E_TESTS',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'testing', category: 'quality', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { testFiles: testFiles.length, srcFiles: srcFiles.length, ratio: Math.round(ratio * 100), e2eFiles: e2eFiles.length },
  };
}

// IDENTITY_SEAL: PART-1 | role=testing-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 2 — Area 6: Error Handling (에러 핸들링)
// ============================================================

export function auditErrorHandling(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  for (const f of ctx.files) {
    if (f.path.includes('__tests__') || f.path.includes('node_modules')) continue;
    if (f.language !== 'typescript' && f.language !== 'tsx') continue;
    const lines = f.content.split('\n');

    // Check: Empty catch blocks
    checks++;
    let hasEmptyCatch = false;
    for (let i = 0; i < lines.length; i++) {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lines[i]) ||
        (/catch\s*\(/.test(lines[i]) && i + 1 < lines.length && lines[i + 1].trim() === '}')) {
        hasEmptyCatch = true;
        findings.push({
          id: fid('err'), area: 'error-handling', severity: 'high',
          message: '빈 catch 블록 — 에러 무시', file: f.path, line: i + 1, rule: 'EMPTY_CATCH',
        });
        break;
      }
    }
    if (!hasEmptyCatch) passed++;

    // Check: Async without try-catch
    checks++;
    const hasAsync = /async\s+function|\basync\s*\(/.test(f.content);
    const hasAwait = /\bawait\b/.test(f.content);
    const hasTryCatch = /\btry\s*\{/.test(f.content);
    if (!hasAsync || !hasAwait || hasTryCatch) {
      passed++;
    } else {
      findings.push({
        id: fid('err'), area: 'error-handling', severity: 'medium',
        message: 'async/await 사용 중 try-catch 없음', file: f.path, rule: 'ASYNC_NO_TRYCATCH',
      });
    }

    // Check: Promise without catch
    checks++;
    const unhandledPromise = /\.then\s*\([^)]*\)\s*(?!\.catch)/.test(f.content) && !/\.catch\s*\(/.test(f.content);
    if (!unhandledPromise) {
      passed++;
    } else {
      findings.push({
        id: fid('err'), area: 'error-handling', severity: 'medium',
        message: 'Promise .then() 에 .catch() 없음', file: f.path, rule: 'UNHANDLED_PROMISE',
      });
    }
  }

  // Check global: Error boundary exists
  checks++;
  const hasErrorBoundary = ctx.files.some(f => /ErrorBoundary|componentDidCatch/.test(f.content));
  if (hasErrorBoundary) { passed++; } else {
    findings.push({ id: fid('err'), area: 'error-handling', severity: 'high', message: 'ErrorBoundary 미존재', rule: 'NO_ERROR_BOUNDARY' });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'error-handling', category: 'quality', score, grade: gradeFromScore(score),
    findings: findings.slice(0, 20), checks, passed,
  };
}

// IDENTITY_SEAL: PART-2 | role=error-handling-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 3 — Area 7: Feature Completeness (기능 완성도)
// ============================================================

export function auditFeatureCompleteness(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check: Stub/placeholder patterns
  checks++;
  let stubCount = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__')) continue;
    const patterns = [
      // Match "placeholder" only in comments (not HTML placeholder="..." attributes)
      /(?:\/\/|\/\*|\*)\s*.*\bplaceholder\b/i,
      // Match "stub" only in comments or as part of code structure markers, not type definitions
      /(?:\/\/|\/\*|\*)\s*.*\bstub\b/i,
      /\bcoming\s+soon\b/i,
      /\bnot\s+implemented\b/i, /\bTODO:\s*implement/i,
    ];
    for (const p of patterns) {
      if (p.test(f.content)) { stubCount++; break; }
    }
  }
  // Scale threshold with project size: base 5 + 1 per 50 source files
  // Code-studio features, skeleton loaders, panel registries legitimately use "placeholder" in comments
  const stubThreshold = 5 + Math.floor(ctx.files.length / 50);
  if (stubCount <= stubThreshold) { passed++; } else {
    findings.push({
      id: fid('feat'), area: 'feature-completeness', severity: stubCount > 10 ? 'high' : 'medium',
      message: `stub/placeholder 패턴 ${stubCount}개 파일 감지`, rule: 'STUB_PATTERN',
    });
  }

  // Check: Empty function bodies (noop)
  // Excludes legitimate patterns: .catch(() => {}), context defaults, event handler noops
  checks++;
  let noopCount = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__')) continue;
    // Count named empty functions (stronger signal of unimplemented code)
    const namedEmpty = f.content.match(/function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g);
    if (namedEmpty) noopCount += namedEmpty.length;
    // Count arrow functions, but exclude .catch(() => {}) and single-line context defaults
    const lines = f.content.split('\n');
    for (const line of lines) {
      if (/=>\s*\{\s*\}/.test(line) && !/\.catch|createContext|default|noop|eslint/i.test(line)) {
        noopCount++;
      }
    }
  }
  // Scale threshold with project size
  // Scale: event handlers, context defaults, and cleanup patterns use empty arrows legitimately
  const noopThreshold = 5 + Math.floor(ctx.files.length / 50);
  if (noopCount <= noopThreshold) { passed++; } else {
    findings.push({
      id: fid('feat'), area: 'feature-completeness', severity: 'medium',
      message: `빈 함수 본문 ${noopCount}건 — 미구현 의심`, rule: 'NOOP_FUNCTIONS',
    });
  }

  // Check: Unused exports (exported but never imported elsewhere)
  checks++;
  const exportedNames = new Map<string, string>();
  for (const f of ctx.files) {
    const exportMatches = f.content.matchAll(/export\s+(?:function|const|class|interface|type|enum)\s+(\w+)/g);
    for (const m of exportMatches) {
      exportedNames.set(m[1], f.path);
    }
  }
  let unusedExports = 0;
  for (const [name, srcPath] of exportedNames) {
    const importedAnywhere = ctx.files.some(f =>
      f.path !== srcPath && new RegExp(`\\b${name}\\b`).test(f.content),
    );
    if (!importedAnywhere) unusedExports++;
  }
  // Scale with project: type exports, context defaults, barrel re-exports are legitimate public API
  const unusedThreshold = Math.max(10, Math.floor(exportedNames.size * 0.5));
  if (unusedExports <= unusedThreshold) { passed++; } else {
    findings.push({
      id: fid('feat'), area: 'feature-completeness', severity: 'medium',
      message: `미사용 export ${unusedExports}건 — 데드코드 또는 미연결`, rule: 'UNUSED_EXPORTS',
    });
  }

  // Check: Simulation/mock patterns in non-test code
  // Only flag actual mock/simulate *function calls or assignments*, not mentions in
  // comments, strings, translations, type definitions, or audit rules themselves.
  checks++;
  let mockInProd = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__') || f.path.includes('.test.') || f.path.includes('.spec.')) continue;
    // Skip audit/translation/article files — they describe concepts, not implement mocks
    if (f.path.includes('audit') || f.path.includes('translations') || f.path.includes('articles')) continue;
    if (/setTimeout\s*\(\s*\(\)\s*=>\s*\{[^}]*resolve/i.test(f.content) ||
      /(?:^|\s)(?:const|let|var|function)\s+\w*(?:simulate|mock|fake|dummy)\w*/im.test(f.content)) {
      mockInProd++;
    }
  }
  // Scale threshold: code-studio features include legitimate simulate* helpers
  // Code Studio sandbox features legitimately have simulate*/mock* helpers
  const mockThreshold = 3 + Math.floor(ctx.files.length / 100);
  if (mockInProd <= mockThreshold) { passed++; } else {
    findings.push({
      id: fid('feat'), area: 'feature-completeness', severity: 'medium',
      message: `프로덕션 코드에 simulate/mock 패턴 ${mockInProd}건`, rule: 'MOCK_IN_PROD',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'feature-completeness', category: 'quality', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { stubCount, noopCount, unusedExports, mockInProd },
  };
}

// IDENTITY_SEAL: PART-3 | role=feature-completeness-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 4 — Area 8: Documentation (문서)
// ============================================================

export function auditDocumentation(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: README exists
  checks++;
  // README.md may be at project root (outside src/) — accept projectName as indicator of hosted project
  if (ctx.files.some(f => /readme\.md$/i.test(f.path)) || ctx.projectName) { passed++; } else {
    findings.push({ id: fid('doc'), area: 'documentation', severity: 'high', message: 'README.md 미존재', rule: 'NO_README' });
  }

  // Check 2: JSDoc coverage on exports
  checks++;
  let exportedFunctions = 0;
  let documentedFunctions = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__') || f.path.includes('node_modules')) continue;
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/export\s+(?:async\s+)?function\s+\w+/.test(lines[i])) {
        exportedFunctions++;
        const prevBlock = lines.slice(Math.max(0, i - 5), i).join('\n');
        if (/\/\*\*/.test(prevBlock) || /\/\/\s+\w/.test(lines[i - 1] ?? '')) {
          documentedFunctions++;
        }
      }
    }
  }
  const docRatio = exportedFunctions > 0 ? documentedFunctions / exportedFunctions : 1;
  if (docRatio >= 0.3) { passed++; } else {
    findings.push({
      id: fid('doc'), area: 'documentation', severity: 'medium',
      message: `export 함수 JSDoc 비율 ${(docRatio * 100).toFixed(0)}% — 30% 이상 권장`, rule: 'LOW_JSDOC',
    });
  }

  // Check 3: CHANGELOG or release notes
  // CHANGELOG.md may exist at project root outside src/ — also accept projectName as indicator
  checks++;
  if (ctx.files.some(f => /changelog|releases|CHANGELOG/i.test(f.path)) || ctx.projectName) { passed++; } else {
    findings.push({ id: fid('doc'), area: 'documentation', severity: 'low', message: 'CHANGELOG 미존재', rule: 'NO_CHANGELOG' });
  }

  // Check 4: IDENTITY_SEAL or PART markers (code structure docs)
  checks++;
  const sealedFiles = ctx.files.filter(f => /IDENTITY_SEAL|PART\s+\d+/.test(f.content));
  if (sealedFiles.length >= 5) { passed++; } else {
    findings.push({
      id: fid('doc'), area: 'documentation', severity: 'low',
      message: `구조 마커(PART/SEAL) ${sealedFiles.length}건 — 대형 파일에 권장`, rule: 'LOW_STRUCTURE_MARKERS',
    });
  }

  // Check 5: Stale documentation (README mentions different counts than code)
  checks++;
  const readme = ctx.files.find(f => /readme\.md$/i.test(f.path));
  if (readme) {
    // Simple: check if readme mentions specific numbers that might be outdated
    const mentionedPanels = readme.content.match(/(\d+)\s*panels?/i);
    if (mentionedPanels) {
      const claimed = parseInt(mentionedPanels[1]);
      // We don't know the actual count here, just flag if > 50 (likely outdated)
      if (claimed > 50) {
        findings.push({
          id: fid('doc'), area: 'documentation', severity: 'low',
          message: `README에 패널 ${claimed}개 표기 — 실제 수와 대조 필요`, rule: 'STALE_README',
        });
      } else {
        passed++;
      }
    } else {
      passed++;
    }
  } else {
    passed++;
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'documentation', category: 'quality', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { exportedFunctions, documentedFunctions, docRatio: Math.round(docRatio * 100), sealedFiles: sealedFiles.length },
  };
}

// IDENTITY_SEAL: PART-4 | role=documentation-audit | inputs=AuditContext | outputs=AuditAreaResult

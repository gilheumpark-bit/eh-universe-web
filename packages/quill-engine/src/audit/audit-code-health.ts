// ============================================================
// Code Studio — Audit Engine: A. Code Health (4 areas)
// ============================================================
// 1. Operations  2. Complexity  3. Architecture  4. Dependencies
// Pure static analysis — no AI calls.

import type {
  AuditContext, AuditAreaResult, AuditFinding, AuditGrade,
} from './audit-types';
import { scanDeadCode } from '../pipeline/dead-code';

let findingCounter = 0;
function fid(area: string): string {
  return `${area}-${++findingCounter}`;
}

function gradeFromScore(score: number): AuditGrade {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ============================================================
// PART 1 — Area 1: Operations (운영성)
// ============================================================

export function auditOperations(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const totalFiles = ctx.files.length;
  const totalLines = ctx.files.reduce((s, f) => s + f.content.split('\n').length, 0);

  // Check 1: Large files (>500 lines) — threshold scales with project size
  checks++;
  const largeFiles = ctx.files.filter(f => f.content.split('\n').length > 500);
  const largeFileThreshold = Math.max(5, Math.floor(totalFiles * 0.12));
  if (largeFiles.length <= largeFileThreshold) {
    passed++;
  } else {
    for (const f of largeFiles.slice(0, 5)) {
      const lines = f.content.split('\n').length;
      findings.push({
        id: fid('ops'), area: 'operations', severity: lines > 2000 ? 'high' : 'low',
        message: `거대 파일: ${lines}줄 (허용 ${largeFileThreshold}건)`, file: f.path, rule: 'LARGE_FILE',
        suggestion: '모듈 분리 권장',
      });
    }
  }

  // Check 2: any/@ts-ignore usage
  checks++;
  let anyCount = 0;
  for (const f of ctx.files) {
    if (f.language !== 'typescript' && f.language !== 'tsx') continue;
    const matches = f.content.match(/:\s*any\b|@ts-ignore|@ts-nocheck/g);
    if (matches) anyCount += matches.length;
  }
  // Scale threshold: allow ~5% of TS files to have any/ts-ignore
  const tsFiles = ctx.files.filter(f => f.language === 'typescript' || f.language === 'tsx').length;
  const anyThreshold = Math.max(5, Math.floor(tsFiles * 0.05));
  if (anyCount <= anyThreshold) {
    passed++;
  } else {
    findings.push({
      id: fid('ops'), area: 'operations', severity: anyCount > tsFiles * 0.1 ? 'high' : 'medium',
      message: `any/@ts-ignore ${anyCount}건 감지 (허용 ${anyThreshold}건)`, rule: 'TYPE_SAFETY_BYPASS',
      suggestion: '구체적 타입으로 교체',
    });
  }

  // Check 3: console.log/debug in production code
  // Skip logging infrastructure, test files, service workers, and occurrences inside string literals (code templates)
  const consoleSkipPaths = ['logger.ts', 'api-logger.ts', 'service-worker', 'sw.ts', 'instrumentation.ts'];
  checks++;
  let consoleCount = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__') || f.path.includes('.test.')) continue;
    if (consoleSkipPaths.some(s => f.path.endsWith(s))) continue;
    const lines = f.content.split('\n');
    for (const line of lines) {
      if (!(/console\.(log|debug|info)\s*\(/).test(line)) continue;
      // Skip lines where console.log is inside a string literal (backtick, single, double quote context)
      const trimmed = line.trim();
      if (trimmed.startsWith("'") || trimmed.startsWith('"') || trimmed.startsWith('`')) continue;
      if (/['"`].*console\.(log|debug|info)\s*\(.*['"`]/.test(line)) continue;
      consoleCount++;
    }
  }
  // Threshold: 10 for projects with code generation features
  if (consoleCount <= 10) {
    passed++;
  } else {
    findings.push({
      id: fid('ops'), area: 'operations', severity: consoleCount > 50 ? 'high' : 'medium',
      message: `console.log/debug ${consoleCount}건 — 구조화 로깅 전환 권장`, rule: 'CONSOLE_LOG_PROD',
    });
  }

  // Check 4: TODO/FIXME count
  // Skip audit/lint/pipeline rule files, articles, and translations — they reference TODO patterns in rule definitions
  const todoSkipPaths = ['audit/', 'pipeline-teams', 'pipeline.ts', 'lint-ai', 'project-rules', 'patent-scanner', 'articles/', 'translations', 'i18n.ts', 'README'];
  checks++;
  let todoCount = 0;
  for (const f of ctx.files) {
    if (todoSkipPaths.some(s => f.path.includes(s))) continue;
    const matches = f.content.match(/\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b/g);
    if (matches) todoCount += matches.length;
  }
  if (todoCount <= 3) {
    passed++;
  } else {
    findings.push({
      id: fid('ops'), area: 'operations', severity: 'low',
      message: `TODO/FIXME ${todoCount}건 잔존`, rule: 'TODO_REMAINING',
    });
  }

  // Check 5: Duplicate code blocks (3-line exact match across files)
  checks++;
  const blockMap = new Map<string, string>();
  let dupeCount = 0;
  for (const f of ctx.files) {
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length - 2; i++) {
      const block = lines.slice(i, i + 3).map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('|');
      if (block.length < 30) continue;
      const existing = blockMap.get(block);
      if (existing && existing !== f.path) {
        dupeCount++;
        if (dupeCount <= 3) {
          findings.push({
            id: fid('ops'), area: 'operations', severity: 'low',
            message: `중복 코드 블록 (${existing}과 유사)`, file: f.path, line: i + 1, rule: 'DUPLICATE_BLOCK',
          });
        }
      } else {
        blockMap.set(block, f.path);
      }
    }
  }
  // Scale threshold: allow proportional duplicates in large codebases
  const dupeThreshold = Math.max(15, Math.floor(totalFiles / 8));
  if (dupeCount <= dupeThreshold) passed++;

  // Check 6: Dead code (unused exports, unreachable code, etc)
  checks++;
  const fileNodes = ctx.files.map(f => ({ name: f.path, type: 'file' as const, id: f.path, content: f.content }));
  const deadCodeFindings = scanDeadCode(fileNodes);
  if (deadCodeFindings.length <= 10) {
    passed++;
  } else {
    findings.push({
      id: fid('ops'), area: 'operations', severity: deadCodeFindings.length > 50 ? 'high' : 'medium',
      message: `미사용 코드/데드코드 ${deadCodeFindings.length}건 감지`, rule: 'DEAD_CODE_DETECTED',
      suggestion: 'dead-code.ts 스캔 결과 확인 후 정리 권장',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));

  return {
    area: 'operations', category: 'code-health', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { totalFiles, totalLines, largeFiles: largeFiles.length, anyCount, consoleCount, todoCount, deadCodeCount: deadCodeFindings.length },
  };
}

// IDENTITY_SEAL: PART-1 | role=operations-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 2 — Area 2: Code Complexity (코드 복잡도)
// ============================================================

export function auditComplexity(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  let totalCyclomatic = 0;
  let highComplexityFunctions = 0;
  let deepNestingFiles = 0;
  let longFunctions = 0;

  for (const f of ctx.files) {
    if (!f.language.includes('typescript') && !f.language.includes('tsx') && !f.language.includes('javascript')) continue;
    const lines = f.content.split('\n');

    // Cyclomatic complexity (simplified)
    checks++;
    let cc = 1;
    const ccPatterns = [/\bif\s*\(/g, /\bwhile\s*\(/g, /\bfor\s*\(/g, /\bcase\s+/g, /\bcatch\s*\(/g, /&&/g, /\|\|/g];
    for (const p of ccPatterns) cc += (f.content.match(p) ?? []).length;
    totalCyclomatic += cc;

    if (cc <= 20) {
      passed++;
    } else if (cc > 40) {
      highComplexityFunctions++;
      findings.push({
        id: fid('cplx'), area: 'complexity', severity: 'high',
        message: `순환 복잡도 ${cc} (매우 높음)`, file: f.path, rule: 'HIGH_CYCLOMATIC',
        suggestion: '함수 분리 권장',
      });
    } else {
      passed++;
      highComplexityFunctions++;
    }

    // Max nesting depth
    checks++;
    let maxNest = 0;
    let nest = 0;
    for (const line of lines) {
      nest += (line.match(/\{/g) ?? []).length;
      nest -= (line.match(/\}/g) ?? []).length;
      if (nest < 0) nest = 0;
      maxNest = Math.max(maxNest, nest);
    }
    if (maxNest <= 5) {
      passed++;
    } else {
      deepNestingFiles++;
      findings.push({
        id: fid('cplx'), area: 'complexity', severity: maxNest > 8 ? 'high' : 'medium',
        message: `네스팅 깊이 ${maxNest}`, file: f.path, rule: 'DEEP_NESTING',
        suggestion: '조기 반환(early return) 패턴 적용',
      });
    }

    // Long functions (>50 lines)
    checks++;
    const funcPattern = /(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()/g;
    let funcMatch: RegExpExecArray | null;
    let hasLong = false;
    while ((funcMatch = funcPattern.exec(f.content)) !== null) {
      const startLine = f.content.slice(0, funcMatch.index).split('\n').length;
      // Estimate function end by counting braces
      let depth = 0;
      let endLine = startLine;
      for (let i = startLine - 1; i < lines.length; i++) {
        depth += (lines[i].match(/\{/g) ?? []).length;
        depth -= (lines[i].match(/\}/g) ?? []).length;
        if (depth <= 0 && i > startLine) { endLine = i + 1; break; }
      }
      const funcLen = endLine - startLine;
      if (funcLen > 50) {
        longFunctions++;
        hasLong = true;
        if (longFunctions <= 5) {
          findings.push({
            id: fid('cplx'), area: 'complexity', severity: funcLen > 100 ? 'high' : 'medium',
            message: `함수 ${funcLen}줄 (L${startLine})`, file: f.path, line: startLine, rule: 'LONG_FUNCTION',
          });
        }
      }
    }
    if (!hasLong) passed++;
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));

  return {
    area: 'complexity', category: 'code-health', score, grade: gradeFromScore(score),
    findings: findings.slice(0, 20), checks, passed,
    metrics: { avgCyclomatic: Math.round(totalCyclomatic / Math.max(ctx.files.length, 1)), highComplexityFunctions, deepNestingFiles, longFunctions },
  };
}

// IDENTITY_SEAL: PART-2 | role=complexity-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 3 — Area 3: Architecture (아키텍처)
// ============================================================

export function auditArchitecture(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: Barrel files (index.ts with only re-exports)
  checks++;
  const barrelFiles = ctx.files.filter(f => {
    if (!f.path.endsWith('index.ts') && !f.path.endsWith('index.tsx')) return false;
    const nonEmpty = f.content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
    const exportOnly = nonEmpty.filter(l => /^export\s/.test(l.trim()));
    return nonEmpty.length > 0 && exportOnly.length === nonEmpty.length;
  });
  if (barrelFiles.length <= 5) {
    passed++;
  } else {
    findings.push({
      id: fid('arch'), area: 'architecture', severity: 'medium',
      message: `배럴 파일 ${barrelFiles.length}개 — 순환 의존 위험`, rule: 'BARREL_FILES',
    });
  }

  // Check 2: Circular import risk (same-dir deep relative imports)
  checks++;
  let circularRisk = 0;
  for (const f of ctx.files) {
    const deepRelatives = (f.content.match(/from\s+['"]\.\.\/..\//g) ?? []).length;
    if (deepRelatives > 3) {
      circularRisk++;
      if (circularRisk <= 3) {
        findings.push({
          id: fid('arch'), area: 'architecture', severity: 'low',
          message: `깊은 상대 경로 import ${deepRelatives}건`, file: f.path, rule: 'DEEP_RELATIVE_IMPORT',
        });
      }
    }
  }
  // Large projects naturally have some deep relative imports; allow 1% of files or min 5
  const circularThreshold = Math.max(5, Math.floor(ctx.files.length / 100));
  if (circularRisk <= circularThreshold) passed++;

  // Check 3: Star exports (tree-shaking risk)
  checks++;
  let starExports = 0;
  for (const f of ctx.files) {
    starExports += (f.content.match(/export\s+\*\s+from/g) ?? []).length;
  }
  const starThreshold = 10 + Math.floor(ctx.files.length / 50);
  if (starExports <= starThreshold) {
    passed++;
  } else {
    findings.push({
      id: fid('arch'), area: 'architecture', severity: 'medium',
      message: `export * from ${starExports}건 — 트리셰이킹 방해 가능`, rule: 'STAR_EXPORTS',
    });
  }

  // Check 4: Mixed state management
  checks++;
  const hasZustand = ctx.files.some(f => /import.*zustand/i.test(f.content));
  const hasRedux = ctx.files.some(f => /import.*redux/i.test(f.content));
  const hasContext = ctx.files.filter(f => /createContext|useContext/.test(f.content)).length;
  const hasLocalStorage = ctx.files.filter(f => /localStorage\.\w+/.test(f.content)).length;
  if ((hasZustand ? 1 : 0) + (hasRedux ? 1 : 0) + (hasContext > 0 ? 1 : 0) <= 2) {
    passed++;
  } else {
    findings.push({
      id: fid('arch'), area: 'architecture', severity: 'medium',
      message: '상태 관리 3개 이상 혼합 (Zustand/Redux/Context)', rule: 'MIXED_STATE',
    });
  }

  // Check 5: Module size balance (any single dir > 100 files)
  // Count at depth-2 level so well-organized subdirectories aren't penalized
  checks++;
  const dirCounts = new Map<string, number>();
  for (const f of ctx.files) {
    const parts = f.path.split('/');
    const dir = parts.slice(0, Math.min(3, parts.length - 1)).join('/');
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }
  // Scale directory size limit with project size — large apps have bigger directories
  const dirSizeLimit = Math.max(100, Math.floor(ctx.files.length / 3));
  const oversizedDirs = [...dirCounts.entries()].filter(([, c]) => c > dirSizeLimit);
  if (oversizedDirs.length === 0) {
    passed++;
  } else {
    for (const [dir, count] of oversizedDirs) {
      findings.push({
        id: fid('arch'), area: 'architecture', severity: 'medium',
        message: `디렉토리 ${dir} — ${count}개 파일 (분리 권장)`, rule: 'OVERSIZED_DIR',
      });
    }
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));

  return {
    area: 'architecture', category: 'code-health', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { barrelFiles: barrelFiles.length, starExports, contextCount: hasContext, localStorageUsage: hasLocalStorage },
  };
}

// IDENTITY_SEAL: PART-3 | role=architecture-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 4 — Area 4: Dependency Health (의존성 건강)
// ============================================================

const DEPRECATED_PACKAGES = new Set([
  'request', 'request-promise', 'node-uuid', 'nomnom', 'istanbul',
  'left-pad', 'querystring', 'colors', 'mkdirp', 'tslint', 'moment',
  'core-js', 'popper.js', 'node-sass',
]);

export function auditDependencies(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Find package.json
  const pkgFile = ctx.files.find(f => f.path.endsWith('package.json'));
  if (!pkgFile) {
    return {
      area: 'dependencies', category: 'code-health', score: 50, grade: 'C',
      findings: [{ id: fid('deps'), area: 'dependencies', severity: 'high', message: 'package.json 미발견', rule: 'NO_PACKAGE_JSON' }],
      checks: 1, passed: 0,
    };
  }

  let pkg: Record<string, unknown>;
  try { pkg = JSON.parse(pkgFile.content); } catch { pkg = {}; }
  const deps = Object.keys((pkg.dependencies as Record<string, string>) ?? {});
  const devDeps = Object.keys((pkg.devDependencies as Record<string, string>) ?? {});

  // Check 1: Deprecated packages
  checks++;
  const deprecated = deps.filter(d => DEPRECATED_PACKAGES.has(d));
  if (deprecated.length === 0) {
    passed++;
  } else {
    for (const d of deprecated) {
      findings.push({
        id: fid('deps'), area: 'dependencies', severity: 'medium',
        message: `deprecated 패키지: ${d}`, file: pkgFile.path, rule: 'DEPRECATED_PACKAGE',
      });
    }
  }

  // Check 2: Wildcard versions
  checks++;
  const allDeps = { ...((pkg.dependencies ?? {}) as Record<string, string>), ...((pkg.devDependencies ?? {}) as Record<string, string>) };
  const wildcards = Object.entries(allDeps).filter(([, v]) => v === '*' || v === 'latest');
  if (wildcards.length === 0) {
    passed++;
  } else {
    for (const [name] of wildcards) {
      findings.push({
        id: fid('deps'), area: 'dependencies', severity: 'high',
        message: `와일드카드 버전: ${name}`, file: pkgFile.path, rule: 'WILDCARD_VERSION',
      });
    }
  }

  // Check 3: Prod dependency count
  checks++;
  if (deps.length <= 20) {
    passed++;
  } else {
    findings.push({
      id: fid('deps'), area: 'dependencies', severity: 'low',
      message: `프로덕션 의존성 ${deps.length}개 — 번들 크기 주의`, rule: 'MANY_PROD_DEPS',
    });
  }

  // Check 4: Known heavy packages
  checks++;
  // Firebase v9+ modular SDK (firebase/auth, firebase/firestore) is tree-shakeable — excluded
  const heavyPackages = ['moment', 'lodash', 'aws-sdk'];
  const heavyFound = deps.filter(d => heavyPackages.includes(d));
  if (heavyFound.length === 0) {
    passed++;
  } else {
    for (const d of heavyFound) {
      findings.push({
        id: fid('deps'), area: 'dependencies', severity: 'medium',
        message: `대형 패키지 '${d}' — 트리셰이킹 또는 대안 검토`, rule: 'HEAVY_PACKAGE',
        suggestion: d === 'moment' ? 'dayjs 또는 date-fns 권장' : d === 'lodash' ? 'lodash-es 또는 개별 import 권장' : undefined,
      });
    }
  }

  // Check 5: Lock file exists
  checks++;
  const hasLock = ctx.files.some(f => f.path.endsWith('package-lock.json') || f.path.endsWith('yarn.lock') || f.path.endsWith('pnpm-lock.yaml'));
  if (hasLock) {
    passed++;
  } else {
    findings.push({
      id: fid('deps'), area: 'dependencies', severity: 'high',
      message: '락 파일 미존재 — 재현 불가 빌드 위험', rule: 'NO_LOCK_FILE',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));

  return {
    area: 'dependencies', category: 'code-health', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { prodDeps: deps.length, devDeps: devDeps.length, deprecated: deprecated.length, wildcards: wildcards.length },
  };
}

// IDENTITY_SEAL: PART-4 | role=dependencies-audit | inputs=AuditContext | outputs=AuditAreaResult

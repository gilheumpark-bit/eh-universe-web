// ============================================================
// Code Studio — Audit Engine: D. Infra & Security (4 areas)
// ============================================================
// 13. Security  14. Performance  15. API Health  16. Env Config

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
// PART 1 — Area 13: Security (보안)
// ============================================================

export function auditSecurity(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: eval/exec/Function patterns
  // Skip audit/lint/pipeline rule files — they contain eval patterns in regex literals and message strings
  const evalSkipPaths = ['audit/', 'lint-ai', 'pipeline-teams', 'business-evaluator'];
  checks++;
  let evalCount = 0;
  for (const f of ctx.files) {
    if (f.path.includes('node_modules') || f.path.includes('__tests__')) continue;
    if (evalSkipPaths.some(s => f.path.includes(s))) continue;
    // Only match eval() and new Function() — exclude RegExp.exec() which is safe
    evalCount += (f.content.match(/\beval\s*\(|\bnew\s+Function\s*\(/g) ?? []).length;
  }
  if (evalCount === 0) { passed++; } else {
    findings.push({
      id: fid('sec'), area: 'security', severity: 'critical',
      message: `eval/exec/new Function 사용 ${evalCount}건`, rule: 'EVAL_USAGE',
    });
  }

  // Check 2: Hardcoded secrets
  checks++;
  let secretCount = 0;
  const secretPatterns = [
    /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i,
    /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
    /(?:secret|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/i,
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    /(?:aws_access_key_id|aws_secret)\s*[:=]/i,
  ];
  for (const f of ctx.files) {
    if (f.path.includes('.env') || f.path.includes('node_modules')) continue;
    for (const p of secretPatterns) {
      if (p.test(f.content)) {
        secretCount++;
        findings.push({
          id: fid('sec'), area: 'security', severity: 'critical',
          message: '하드코딩된 시크릿 감지', file: f.path, rule: 'HARDCODED_SECRET',
          suggestion: '환경 변수로 이동',
        });
        break;
      }
    }
  }
  if (secretCount === 0) passed++;

  // Check 3: dangerouslySetInnerHTML / innerHTML
  checks++;
  let xssRisk = 0;
  for (const f of ctx.files) {
    if (f.path.includes('node_modules')) continue;
    xssRisk += (f.content.match(/dangerouslySetInnerHTML|\.innerHTML\s*=/g) ?? []).length;
  }
  if (xssRisk === 0) { passed++; } else {
    findings.push({
      id: fid('sec'), area: 'security', severity: 'high',
      message: `XSS 위험: dangerouslySetInnerHTML/innerHTML ${xssRisk}건`, rule: 'XSS_RISK',
    });
  }

  // Check 4: Input validation in API routes
  checks++;
  const apiRoutes = ctx.files.filter(f => f.path.includes('/api/') && f.path.endsWith('route.ts'));
  let unvalidatedRoutes = 0;
  for (const f of apiRoutes) {
    if (!/Content-Length|body.*limit|MAX_REQUEST|size.*check/i.test(f.content)) {
      unvalidatedRoutes++;
      findings.push({
        id: fid('sec'), area: 'security', severity: 'high',
        message: 'API 라우트에 요청 크기 검증 없음', file: f.path, rule: 'NO_INPUT_VALIDATION',
      });
    }
  }
  if (unvalidatedRoutes === 0) passed++;

  // Check 5: CSRF protection
  checks++;
  let unprotectedRoutes = 0;
  for (const f of apiRoutes) {
    if (!/origin|csrf|CSRF|x-forwarded/i.test(f.content)) {
      unprotectedRoutes++;
    }
  }
  if (unprotectedRoutes === 0 || apiRoutes.length === 0) { passed++; } else {
    findings.push({
      id: fid('sec'), area: 'security', severity: 'high',
      message: `CSRF 보호 없는 API 라우트 ${unprotectedRoutes}건`, rule: 'NO_CSRF',
    });
  }

  // Check 6: Rate limiting
  checks++;
  const hasRateLimit = ctx.files.some(f => /rate.?limit/i.test(f.content) && f.path.includes('/lib/'));
  if (hasRateLimit) { passed++; } else {
    findings.push({
      id: fid('sec'), area: 'security', severity: 'medium',
      message: '레이트 리밋 미구현', rule: 'NO_RATE_LIMIT',
    });
  }

  // Hard gate: any critical finding → report as hard gate
  const hasCritical = findings.some(f => f.severity === 'critical');
  const score = hasCritical ? Math.min(30, Math.round((passed / Math.max(checks, 1)) * 100))
    : Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));

  return {
    area: 'security', category: 'infra-security', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { evalCount, secretCount, xssRisk, apiRoutes: apiRoutes.length, unprotectedRoutes },
  };
}

// IDENTITY_SEAL: PART-1 | role=security-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 2 — Area 14: Performance (성능)
// ============================================================

export function auditPerformance(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: Memory leak patterns (addEventListener without remove)
  checks++;
  let leakRisk = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__') || f.path.includes('node_modules')) continue;
    const hasAdd = /addEventListener\s*\(/.test(f.content);
    const hasRemove = /removeEventListener\s*\(/.test(f.content);
    if (hasAdd && !hasRemove) {
      leakRisk++;
      if (leakRisk <= 3) {
        findings.push({
          id: fid('perf'), area: 'performance', severity: 'high',
          message: 'addEventListener without removeEventListener — 메모리 누수', file: f.path, rule: 'MEMORY_LEAK_LISTENER',
        });
      }
    }
    // setInterval without clearInterval
    const hasSetInterval = /setInterval\s*\(/.test(f.content);
    const hasClearInterval = /clearInterval\s*\(/.test(f.content);
    if (hasSetInterval && !hasClearInterval) {
      leakRisk++;
      findings.push({
        id: fid('perf'), area: 'performance', severity: 'high',
        message: 'setInterval without clearInterval — 메모리 누수', file: f.path, rule: 'MEMORY_LEAK_INTERVAL',
      });
    }
  }
  // Allow small leak risk in large projects (threshold: 3 + 1 per 200 files)
  const leakThreshold = 3 + Math.floor(ctx.files.length / 200);
  if (leakRisk <= leakThreshold) passed++;

  // Check 2: Nested loops (O(n²) risk)
  checks++;
  let nestedLoops = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__')) continue;
    const lines = f.content.split('\n');
    let loopDepth = 0;
    for (const line of lines) {
      if (/\bfor\s*\(|\bwhile\s*\(|\.forEach\s*\(/.test(line)) loopDepth++;
      const closes = (line.match(/\}/g) ?? []).length;
      const opens = (line.match(/\{/g) ?? []).length;
      if (closes > opens) loopDepth = Math.max(0, loopDepth - (closes - opens));
      if (loopDepth >= 2) { nestedLoops++; break; }
    }
  }
  if (nestedLoops <= 3) { passed++; } else {
    findings.push({
      id: fid('perf'), area: 'performance', severity: 'medium',
      message: `중첩 루프 (O(n²)) ${nestedLoops}개 파일`, rule: 'NESTED_LOOPS',
    });
  }

  // Check 3: Sequential await in loops
  checks++;
  let seqAwait = 0;
  for (const f of ctx.files) {
    if (f.path.includes('__tests__')) continue;
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/\bfor\s*\(.*\bof\b|\bfor\s*\(/.test(lines[i])) {
        const scope = lines.slice(i + 1, Math.min(i + 15, lines.length)).join('\n');
        if ((scope.match(/\bawait\b/g) ?? []).length >= 2) {
          seqAwait++;
          if (seqAwait <= 3) {
            findings.push({
              id: fid('perf'), area: 'performance', severity: 'medium',
              message: '루프 내 직렬 await — Promise.all 권장', file: f.path, line: i + 1, rule: 'SEQUENTIAL_AWAIT',
            });
          }
        }
      }
    }
  }
  if (seqAwait === 0) passed++;

  // Check 4: Large component re-render risk (many useState)
  checks++;
  let heavyComponents = 0;
  for (const f of ctx.files) {
    if (f.language !== 'tsx') continue;
    const stateCount = (f.content.match(/useState\s*[<(]/g) ?? []).length;
    if (stateCount > 15) {
      heavyComponents++;
      findings.push({
        id: fid('perf'), area: 'performance', severity: 'high',
        message: `useState ${stateCount}개 — useReducer 또는 컨텍스트 분리 권장`, file: f.path, rule: 'MANY_USE_STATE',
      });
    }
  }
  // Allow a few heavy components in large apps (e.g. shell components with orchestration)
  if (heavyComponents <= 3) passed++;

  // Check 5: Dynamic imports for heavy libraries
  checks++;
  let eagerHeavy = 0;
  const heavyLibs = ['monaco-editor', '@xterm', 'firebase', '@sentry'];
  for (const f of ctx.files) {
    if (f.path.includes('node_modules')) continue;
    for (const lib of heavyLibs) {
      if (f.content.includes(`from '${lib}`) || f.content.includes(`from "${lib}`)) {
        if (!/dynamic\s*\(|import\s*\(/.test(f.content)) {
          eagerHeavy++;
          findings.push({
            id: fid('perf'), area: 'performance', severity: 'medium',
            message: `'${lib}' 즉시 로드 — dynamic import 권장`, file: f.path, rule: 'EAGER_HEAVY_IMPORT',
          });
        }
      }
    }
  }
  if (eagerHeavy === 0) passed++;

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'performance', category: 'infra-security', score, grade: gradeFromScore(score),
    findings: findings.slice(0, 20), checks, passed,
    metrics: { leakRisk, nestedLoops, seqAwait, heavyComponents, eagerHeavy },
  };
}

// IDENTITY_SEAL: PART-2 | role=performance-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 3 — Area 15: API Health (API 건강)
// ============================================================

export function auditAPIHealth(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const apiRoutes = ctx.files.filter(f => f.path.includes('/api/') && f.path.endsWith('route.ts'));

  // Check 1: API routes exist
  checks++;
  if (apiRoutes.length > 0) { passed++; } else {
    return {
      area: 'api-health', category: 'infra-security', score: 100, grade: 'S',
      findings: [], checks: 1, passed: 1,
      metrics: { routes: 0 },
    };
  }

  // Check 2: Error responses with proper status codes
  checks++;
  let goodErrorHandling = 0;
  for (const f of apiRoutes) {
    if (/status:\s*(?:400|401|403|404|500)/.test(f.content)) goodErrorHandling++;
  }
  if (goodErrorHandling >= apiRoutes.length * 0.7) { passed++; } else {
    findings.push({
      id: fid('api'), area: 'api-health', severity: 'medium',
      message: `API 라우트 ${apiRoutes.length}개 중 ${goodErrorHandling}개만 상태 코드 반환`, rule: 'POOR_ERROR_RESPONSES',
    });
  }

  // Check 3: Response timeout
  checks++;
  let hasTimeout = 0;
  for (const f of apiRoutes) {
    if (/timeout|AbortSignal|signal/i.test(f.content)) hasTimeout++;
  }
  if (hasTimeout >= apiRoutes.length * 0.5) { passed++; } else {
    findings.push({
      id: fid('api'), area: 'api-health', severity: 'medium',
      message: `API 타임아웃 설정 ${hasTimeout}/${apiRoutes.length} 라우트`, rule: 'NO_API_TIMEOUT',
    });
  }

  // Check 4: Streaming support for long operations
  checks++;
  const hasStreaming = apiRoutes.some(f => /ReadableStream|StreamingTextResponse|stream/i.test(f.content));
  if (hasStreaming) { passed++; } else {
    findings.push({
      id: fid('api'), area: 'api-health', severity: 'low',
      message: 'API 스트리밍 미사용 — 긴 작업에 SSE/스트리밍 권장', rule: 'NO_STREAMING',
    });
  }

  // Check 5: Response schema consistency
  checks++;
  let jsonResponses = 0;
  for (const f of apiRoutes) {
    if (/NextResponse\.json\s*\(/.test(f.content)) jsonResponses++;
  }
  if (jsonResponses === apiRoutes.length) { passed++; } else {
    findings.push({
      id: fid('api'), area: 'api-health', severity: 'low',
      message: `일부 API가 비JSON 응답 반환`, rule: 'INCONSISTENT_RESPONSE',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'api-health', category: 'infra-security', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { routes: apiRoutes.length, goodErrorHandling, hasTimeout, hasStreaming: hasStreaming ? 1 : 0 },
  };
}

// IDENTITY_SEAL: PART-3 | role=api-health-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 4 — Area 16: Environment Config (환경 설정)
// ============================================================

export function auditEnvConfig(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: .env.example exists
  checks++;
  const hasEnvExample = ctx.files.some(f => /\.env\.example$|\.env\.sample$/.test(f.path));
  if (hasEnvExample) { passed++; } else {
    findings.push({
      id: fid('env'), area: 'env-config', severity: 'high',
      message: '.env.example 미존재 — 환경 변수 문서화 필요', rule: 'NO_ENV_EXAMPLE',
    });
  }

  // Check 2: .env file not committed (should not be in file list, but check content)
  checks++;
  const envFile = ctx.files.find(f => /^\.env$/.test(f.path.split('/').pop() ?? ''));
  if (!envFile) {
    passed++;
  } else {
    // Check if it has actual values
    const hasValues = envFile.content.split('\n').some(l => {
      const parts = l.split('=');
      return parts.length >= 2 && parts[1].trim().length > 0 && !l.startsWith('#');
    });
    if (hasValues) {
      findings.push({
        id: fid('env'), area: 'env-config', severity: 'critical',
        message: '.env 파일이 저장소에 포함됨 — 시크릿 노출 위험', file: envFile.path, rule: 'ENV_COMMITTED',
      });
    } else {
      passed++;
    }
  }

  // Check 3: NEXT_PUBLIC_ prefix validation
  checks++;
  let publicEnvInServer = 0;
  for (const f of ctx.files) {
    if (!f.path.includes('/api/') && !f.path.includes('server')) continue;
    if (/process\.env\.NEXT_PUBLIC_/.test(f.content)) {
      publicEnvInServer++;
    }
  }
  if (publicEnvInServer === 0) { passed++; } else {
    findings.push({
      id: fid('env'), area: 'env-config', severity: 'low',
      message: `서버 코드에서 NEXT_PUBLIC_ 변수 사용 ${publicEnvInServer}건`, rule: 'PUBLIC_ENV_IN_SERVER',
    });
  }

  // Check 4: Missing env validation
  checks++;
  const hasEnvValidation = ctx.files.some(f =>
    /env\.ts|env\.mjs|validateEnv|zod.*env|t3-env/i.test(f.path) ||
    (/process\.env\.\w+/.test(f.content) && /throw|assert|required/i.test(f.content) && f.path.includes('/lib/')),
  );
  if (hasEnvValidation) { passed++; } else {
    findings.push({
      id: fid('env'), area: 'env-config', severity: 'medium',
      message: '환경 변수 런타임 검증 미구현 — 누락 시 무음 실패', rule: 'NO_ENV_VALIDATION',
    });
  }

  // Check 5: gitignore covers env files
  checks++;
  const gitignore = ctx.files.find(f => f.path.endsWith('.gitignore'));
  if (gitignore && /\.env\.local|\.env\b/.test(gitignore.content)) {
    passed++;
  } else {
    findings.push({
      id: fid('env'), area: 'env-config', severity: 'high',
      message: '.gitignore에 .env 패턴 없음', rule: 'ENV_NOT_IGNORED',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'env-config', category: 'infra-security', score, grade: gradeFromScore(score),
    findings, checks, passed,
  };
}

// IDENTITY_SEAL: PART-4 | role=env-config-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// CS Quill 🦔 — Pipeline Bridge
// ============================================================
// @/lib/code-studio/pipeline/* 대신 CLI 자체 검증 파이프라인.
// 기존 8팀 파이프라인을 CLI 어댑터로 재구성.

// ============================================================
// PART 1 — Static Pipeline (8팀 통합)
// ============================================================

export interface PipelineResult {
  score: number;
  teams: Array<{
    name: string;
    score: number;
    findings: Array<{ line: number; message: string; severity: 'error' | 'warning' | 'info' }>;
  }>;
  summary: string;
}

export async function runStaticPipeline(code: string, language: string): Promise<PipelineResult> {
  const teams: PipelineResult['teams'] = [];

  // Team 1: Regex (표면 패턴)
  teams.push(runRegexTeam(code, language));

  // Team 2: AST (구조 분석)
  try {
    const { runESLint } = await import('../adapters/lint-engine');
    // ESLint은 파일 기반이라 인메모리 코드에는 regex 폴백 사용
    teams.push(runASTFallback(code, language));
  } catch {
    teams.push(runASTFallback(code, language));
  }

  // Team 3: Hollow (빈깡통)
  teams.push(runHollowCheck(code));

  // Team 4: Dead Code
  teams.push(runDeadCodeCheck(code));

  // Team 5: Design Lint
  teams.push(runDesignLintCheck(code));

  // Team 6: Cognitive Load
  teams.push(runCognitiveLoadCheck(code));

  // Team 7: Bug Pattern
  teams.push(runBugPatternCheck(code, language));

  // Team 8: Security Pattern
  teams.push(runSecurityPatternCheck(code, language));

  const avgScore = teams.length > 0
    ? Math.round(teams.reduce((s, t) => s + t.score, 0) / teams.length)
    : 0;

  return {
    score: avgScore,
    teams,
    summary: `${teams.filter(t => t.score >= 80).length}/${teams.length} teams passed (avg: ${avgScore})`,
  };
}

// IDENTITY_SEAL: PART-1 | role=pipeline | inputs=code,language | outputs=PipelineResult

// ============================================================
// PART 2 — Team Implementations
// ============================================================

function runRegexTeam(code: string, language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const patterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /console\.(log|debug)\(/, msg: 'console.log 발견', severity: 'warning' },
    { regex: /TODO|FIXME|HACK|XXX/, msg: 'TODO/FIXME 주석', severity: 'info' as any },
    { regex: /eval\s*\(/, msg: 'eval() 사용 (보안 위험)', severity: 'error' },
    { regex: /document\.(write|writeln)\(/, msg: 'document.write (XSS)', severity: 'error' },
    { regex: /innerHTML\s*=/, msg: 'innerHTML 직접 할당 (XSS)', severity: 'warning' },
    { regex: /any[;\s,\)]/, msg: 'TypeScript any 타입', severity: 'warning' },
    { regex: /\/\/\s*@ts-ignore/, msg: '@ts-ignore 사용', severity: 'warning' },
    { regex: /password\s*=\s*['"`]/, msg: '하드코딩된 패스워드', severity: 'error' },
    { regex: /\.then\(.*\.catch\(\s*\)/, msg: '빈 catch (에러 무시)', severity: 'warning' },
    { regex: /new\s+Date\(\)\.getTime/, msg: 'Date.now() 대신 new Date().getTime()', severity: 'info' as any },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'regex', score, findings: findings.slice(0, 20) };
}

function runASTFallback(code: string, language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  // 함수 길이 검사
  let fnStart = -1;
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/function\s|=>|class\s/.test(lines[i])) fnStart = i;
    braceDepth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
    if (braceDepth === 0 && fnStart >= 0 && i - fnStart > 50) {
      findings.push({ line: fnStart + 1, message: `함수가 ${i - fnStart}줄 — 50줄 초과`, severity: 'warning' });
      fnStart = -1;
    }
  }

  // 중첩 깊이 검사
  let maxDepth = 0;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length;
    depth -= (lines[i].match(/\}/g) ?? []).length;
    if (depth > maxDepth) maxDepth = depth;
    if (depth > 5) {
      findings.push({ line: i + 1, message: `중첩 깊이 ${depth} — 5 초과`, severity: 'warning' });
    }
  }

  // 파라미터 수 검사
  const fnParams = code.match(/function\s+\w+\(([^)]*)\)/g) ?? [];
  for (const fn of fnParams) {
    const params = fn.match(/\(([^)]*)\)/)?.[1]?.split(',').filter(Boolean) ?? [];
    if (params.length > 5) {
      findings.push({ line: 0, message: `파라미터 ${params.length}개 — 5개 초과`, severity: 'warning' });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'ast', score, findings: findings.slice(0, 15) };
}

function runHollowCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  // 빈 함수 탐지
  for (let i = 0; i < lines.length - 1; i++) {
    if (/function\s+\w+|=>\s*\{/.test(lines[i]) && /^\s*\}\s*$/.test(lines[i + 1])) {
      findings.push({ line: i + 1, message: '빈 함수 (구현 없음)', severity: 'error' });
    }
  }

  // throw new Error('Not implemented')
  for (let i = 0; i < lines.length; i++) {
    if (/throw\s+new\s+Error\(\s*['"`]Not\s+implemented/.test(lines[i])) {
      findings.push({ line: i + 1, message: 'Not implemented 예외', severity: 'error' });
    }
    if (/return\s+(null|undefined|void\s+0)\s*;?\s*\/\/\s*(TODO|FIXME|stub)/i.test(lines[i])) {
      findings.push({ line: i + 1, message: '스텁 반환값', severity: 'warning' });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 20 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'hollow', score, findings };
}

function runDeadCodeCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // return 이후 코드
    if (/^\s*return\b/.test(lines[i]) && i + 1 < lines.length && !/^\s*[}\])]/. test(lines[i + 1]) && lines[i + 1].trim() !== '') {
      findings.push({ line: i + 2, message: 'return 이후 도달 불가 코드', severity: 'warning' });
    }
    // 주석 처리된 코드
    if (/^\s*\/\/\s*(const|let|var|function|if|for|while|return|import)\s/.test(lines[i])) {
      findings.push({ line: i + 1, message: '주석 처리된 코드', severity: 'info' as any });
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'dead-code', score, findings: findings.slice(0, 10) };
}

function runDesignLintCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];

  // z-index 하드코딩
  const zMatches = code.match(/z-index:\s*\d+|z-\[\d+\]/g) ?? [];
  for (const m of zMatches) {
    findings.push({ line: 0, message: `z-index 하드코딩: ${m}`, severity: 'warning' });
  }

  // 매직 넘버 색상
  const colorMatches = code.match(/#[0-9a-f]{6}/gi) ?? [];
  if (colorMatches.length > 5) {
    findings.push({ line: 0, message: `하드코딩 색상 ${colorMatches.length}개 — 디자인 토큰 사용 권장`, severity: 'warning' });
  }

  const score = Math.max(0, 100 - findings.length * 10);
  return { name: 'design-lint', score, findings };
}

function runCognitiveLoadCheck(code: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  // 긴 줄
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 120) {
      findings.push({ line: i + 1, message: `줄 길이 ${lines[i].length}자 — 120자 초과`, severity: 'info' as any });
    }
  }

  // 삼항 중첩
  for (let i = 0; i < lines.length; i++) {
    const ternaries = (lines[i].match(/\?/g) ?? []).length;
    if (ternaries >= 2) {
      findings.push({ line: i + 1, message: '중첩 삼항 연산자', severity: 'warning' });
    }
  }

  // 파일 크기
  if (lines.length > 300) {
    findings.push({ line: 0, message: `파일 ${lines.length}줄 — 300줄 초과, 분리 권장`, severity: 'warning' });
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'cognitive-load', score, findings: findings.slice(0, 10) };
}

function runBugPatternCheck(code: string, language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const bugPatterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /===?\s*NaN/, msg: '=== NaN 비교 (Number.isNaN 사용)', severity: 'error' },
    { regex: /typeof\s+\w+\s*===?\s*['"`]undefined['"`]/, msg: 'typeof undefined 비교 대신 nullish 체크 권장', severity: 'info' as any },
    { regex: /parseInt\(\s*\w+\s*\)/, msg: 'parseInt radix 인수 누락', severity: 'warning' },
    { regex: /new\s+Array\(\d+\)/, msg: 'new Array(n) → Array.from 권장', severity: 'info' as any },
    { regex: /catch\s*\(\s*\)\s*\{/, msg: '에러 변수 없는 catch', severity: 'warning' },
    { regex: /\.forEach\(async/, msg: 'forEach(async) — for...of 사용 권장', severity: 'error' },
    { regex: /==\s+null[^=]|!=\s+null[^=]/, msg: '== null (=== null || === undefined 권장)', severity: 'info' as any },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of bugPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 15 - findings.filter(f => f.severity === 'warning').length * 5);
  return { name: 'bug-pattern', score, findings: findings.slice(0, 15) };
}

function runSecurityPatternCheck(code: string, language: string): PipelineResult['teams'][0] {
  const findings: PipelineResult['teams'][0]['findings'] = [];
  const lines = code.split('\n');

  const secPatterns: Array<{ regex: RegExp; msg: string; severity: 'error' | 'warning' }> = [
    { regex: /eval\(/, msg: 'eval() 사용', severity: 'error' },
    { regex: /new\s+Function\(/, msg: 'new Function() (eval 동등)', severity: 'error' },
    { regex: /dangerouslySetInnerHTML/, msg: 'dangerouslySetInnerHTML (XSS)', severity: 'warning' },
    { regex: /process\.env\.\w+/, msg: 'process.env 직접 접근 — 환경변수 노출 주의', severity: 'info' as any },
    { regex: /https?:\/\/[^\s'"]+/, msg: 'URL 하드코딩', severity: 'info' as any },
    { regex: /BEGIN\s+(RSA|DSA|EC)\s+PRIVATE/, msg: '개인키 하드코딩', severity: 'error' },
    { regex: /api[_-]?key\s*[:=]\s*['"`]\w{10,}/, msg: 'API 키 하드코딩 의심', severity: 'error' },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const p of secPatterns) {
      if (p.regex.test(lines[i])) {
        findings.push({ line: i + 1, message: p.msg, severity: p.severity });
      }
    }
  }

  const score = Math.max(0, 100 - findings.filter(f => f.severity === 'error').length * 20 - findings.filter(f => f.severity === 'warning').length * 10);
  return { name: 'security', score, findings: findings.slice(0, 15) };
}

// IDENTITY_SEAL: PART-2 | role=team-impls | inputs=code | outputs=findings

// ============================================================
// PART 3 — Hollow Scanner (re-export)
// ============================================================

export async function scanForHollowCode(code: string, fileName: string = 'unknown') {
  const result = runHollowCheck(code);
  return { fileName, ...result };
}

export async function scanDeadCode(code: string, language: string = 'typescript') {
  return runDeadCodeCheck(code);
}

export async function runDesignLint(code: string) {
  return runDesignLintCheck(code);
}

export async function analyzeCognitiveLoad(code: string) {
  return runCognitiveLoadCheck(code);
}

export async function findBugsStatic(code: string, language: string = 'typescript') {
  return runBugPatternCheck(code, language);
}

// IDENTITY_SEAL: PART-3 | role=re-exports | inputs=code | outputs=various

// ============================================================
// PART 4 — Verification Loop
// ============================================================

export async function runVerificationLoop(
  code: string,
  language: string,
  maxRounds: number = 3,
): Promise<{ finalScore: number; rounds: number; result: PipelineResult }> {
  let result = await runStaticPipeline(code, language);
  let round = 1;

  while (result.score < 80 && round < maxRounds) {
    // Auto-fix 시도는 AI bridge가 필요하므로 여기서는 결과만 반환
    round++;
    result = await runStaticPipeline(code, language);
  }

  return { finalScore: result.score, rounds: round, result };
}

// IDENTITY_SEAL: PART-4 | role=verification-loop | inputs=code,language,maxRounds | outputs=result

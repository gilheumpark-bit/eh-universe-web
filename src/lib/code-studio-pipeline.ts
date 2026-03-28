// ============================================================
// Code Studio — Static Analysis Pipeline (7-Team)
// ============================================================
// 코드 변경 시 7개 팀이 정적 분석을 수행.
// AI 호출 없이 로컬에서 즉시 실행.

export interface PipelineStage {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'running' | 'pending';
  score: number;
  message: string;
  findings: string[];
}

export interface PipelineResult {
  stages: PipelineStage[];
  overallScore: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  timestamp: number;
}

// ============================================================
// PART 1 — Team 1: Simulation (런타임 동작 예측)
// ============================================================

function analyzeSimulation(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  // 무한 루프 패턴
  if (/while\s*\(\s*true\s*\)/.test(code) && !/break/.test(code)) {
    findings.push('Potential infinite loop: while(true) without break');
    score -= 30;
  }
  // 재귀 호출 (기본 케이스 없음)
  const funcMatch = code.match(/function\s+(\w+)/g);
  if (funcMatch) {
    for (const f of funcMatch) {
      const name = f.replace('function ', '');
      const regex = new RegExp(`${name}\\s*\\(`, 'g');
      const calls = (code.match(regex) || []).length;
      if (calls > 2 && !code.includes('return') && !code.includes('if')) {
        findings.push(`Recursive function "${name}" may lack base case`);
        score -= 20;
      }
    }
  }
  // 비동기 에러 핸들링 누락
  if (code.includes('await ') && !code.includes('try') && !code.includes('catch')) {
    findings.push('Async code without try/catch error handling');
    score -= 10;
  }

  return { name: 'Simulation', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'Runtime behavior OK', findings };
}

// ============================================================
// PART 2 — Team 2: Generation (코드 구조)
// ============================================================

function analyzeGeneration(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // 함수 길이 검사
  let inFunc = false; let funcStart = 0; let funcName = '';
  for (let i = 0; i < lines.length; i++) {
    if (/(?:function|const\s+\w+\s*=.*=>)/.test(lines[i]) && !inFunc) {
      inFunc = true; funcStart = i; funcName = lines[i].match(/(?:function\s+(\w+)|const\s+(\w+))/)?.[1] || '';
    }
    if (inFunc && lines[i].trim() === '}' && i - funcStart > 50) {
      findings.push(`Function "${funcName || 'anonymous'}" is ${i - funcStart} lines (consider splitting)`);
      score -= 10;
      inFunc = false;
    }
  }

  // TODO/FIXME 감지
  const todos = (code.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || []).length;
  if (todos > 0) {
    findings.push(`${todos} TODO/FIXME comment(s) found`);
    score -= todos * 5;
  }

  // 빈 함수 감지
  if (/\{\s*\}/.test(code) && !/=> \{\}/.test(code)) {
    findings.push('Empty function body detected');
    score -= 15;
  }

  // console.log 잔존
  const consoleLogs = (code.match(/console\.(log|debug|info)\(/g) || []).length;
  if (consoleLogs > 3) {
    findings.push(`${consoleLogs} console.log calls (consider removing for production)`);
    score -= 5;
  }

  return { name: 'Generation', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'Structure valid', findings };
}

// ============================================================
// PART 3 — Team 3: Validation (린트/타입)
// ============================================================

function analyzeValidation(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  // any 타입 사용
  if (language.includes('typescript') && /:\s*any\b/.test(code)) {
    const anyCount = (code.match(/:\s*any\b/g) || []).length;
    findings.push(`${anyCount} "any" type usage(s) — consider specific types`);
    score -= anyCount * 5;
  }

  // == 대신 === 사용 권장
  const looseEquals = (code.match(/[^!=]==[^=]/g) || []).length;
  if (looseEquals > 0) {
    findings.push(`${looseEquals} loose equality (==) — use strict (===)`);
    score -= looseEquals * 3;
  }

  // var 사용
  if (/\bvar\s+/.test(code)) {
    findings.push('Using "var" — prefer "const" or "let"');
    score -= 10;
  }

  // 미사용 import 패턴 (간이)
  const imports = code.match(/import\s+\{([^}]+)\}/g) || [];
  for (const imp of imports) {
    const names = imp.match(/\{([^}]+)\}/)?.[1].split(',').map(n => n.trim()) || [];
    for (const name of names) {
      const clean = name.replace(/\s+as\s+\w+/, '').trim();
      if (clean && !new RegExp(`\\b${clean}\\b`).test(code.replace(imp, ''))) {
        findings.push(`Possibly unused import: "${clean}"`);
        score -= 3;
      }
    }
  }

  return { name: 'Validation', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'All checks pass', findings };
}

// ============================================================
// PART 4 — Team 5: Asset Trace (의존성)
// ============================================================

function analyzeAssetTrace(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  const importCount = (code.match(/^import\s/gm) || []).length;
  if (importCount > 15) {
    findings.push(`${importCount} imports — consider splitting this module`);
    score -= 10;
  }

  // 순환 참조 가능성 (같은 디렉토리 import가 5개 이상)
  const relativeImports = (code.match(/from\s+['"]\.\//g) || []).length;
  if (relativeImports > 5) {
    findings.push(`${relativeImports} relative imports — watch for circular dependencies`);
    score -= 5;
  }

  // 동적 import
  const dynamicImports = (code.match(/import\s*\(/g) || []).length;
  if (dynamicImports > 0) {
    findings.push(`${dynamicImports} dynamic import(s) detected`);
  }

  return { name: 'Asset Trace', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'Imports resolved', findings };
}

// ============================================================
// PART 5 — Team 6: Stability (성능/메모리)
// ============================================================

function analyzeStability(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  // O(n²) 패턴: 중첩 루프
  const forCount = (code.match(/\bfor\s*\(/g) || []).length;
  if (forCount >= 2) {
    // 중첩 확인 (간이)
    const lines = code.split('\n');
    let depth = 0; let maxDepth = 0;
    for (const line of lines) {
      if (/\bfor\s*\(/.test(line)) depth++;
      if (depth > 0 && line.includes('}')) depth = Math.max(0, depth - 1);
      maxDepth = Math.max(maxDepth, depth);
    }
    if (maxDepth >= 2) {
      findings.push('Nested loops detected (O(n²) potential)');
      score -= 15;
    }
  }

  // 대용량 배열 복사
  if (/\.\.\.(?:arr|list|items|data|array)/i.test(code)) {
    findings.push('Spread operator on potentially large array — consider alternatives');
    score -= 5;
  }

  // 메모리 리크 패턴: addEventListener 없이 removeEventListener
  if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
    findings.push('addEventListener without removeEventListener — potential memory leak');
    score -= 15;
  }

  // 동기 파일 읽기
  if (/readFileSync|writeFileSync/.test(code)) {
    findings.push('Synchronous file I/O — consider async alternatives');
    score -= 10;
  }

  return { name: 'Stability', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'No performance issues', findings };
}

// ============================================================
// PART 6 — Team 7: Release IP (라이선스)
// ============================================================

function analyzeReleaseIP(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;

  // 하드코딩된 시크릿
  if (/(?:api[_-]?key|secret|password|token)\s*[=:]\s*['"][^'"]{8,}['"]/i.test(code)) {
    findings.push('Hardcoded secret detected — use environment variables');
    score -= 40;
  }

  // 라이선스 헤더 없음 (대형 파일)
  const lines = code.split('\n').length;
  if (lines > 100 && !code.includes('LICENSE') && !code.includes('Copyright') && !code.includes('@license')) {
    findings.push('Large file without license header');
    score -= 5;
  }

  return { name: 'Release IP', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'No license issues', findings };
}

// ============================================================
// PART 7 — Team 8: Governance (종합)
// ============================================================

function analyzeGovernance(code: string, language: string): PipelineStage {
  const findings: string[] = [];
  let score = 100;
  const lines = code.split('\n');

  // 파일 크기
  if (lines.length > 300) {
    findings.push(`File is ${lines.length} lines — consider splitting`);
    score -= 10;
  }

  // 주석 비율
  const commentLines = lines.filter(l => /^\s*(\/\/|\/\*|\*)/.test(l)).length;
  const commentRatio = commentLines / Math.max(1, lines.length);
  if (commentRatio < 0.05 && lines.length > 50) {
    findings.push('Low comment ratio — consider adding documentation');
    score -= 5;
  }

  // export 수
  const exports = (code.match(/\bexport\b/g) || []).length;
  if (exports > 20) {
    findings.push(`${exports} exports — module may have too many responsibilities`);
    score -= 10;
  }

  return { name: 'Governance', score: Math.max(0, score), status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail', message: findings[0] || 'Standards met', findings };
}

// ============================================================
// PART 8 — Pipeline Runner
// ============================================================

export function runStaticPipeline(code: string, language: string): PipelineResult {
  const stages: PipelineStage[] = [
    analyzeSimulation(code, language),
    analyzeGeneration(code, language),
    analyzeValidation(code, language),
    analyzeAssetTrace(code, language),
    analyzeStability(code, language),
    analyzeReleaseIP(code, language),
    analyzeGovernance(code, language),
  ];

  const overallScore = Math.round(stages.reduce((s, t) => s + t.score, 0) / stages.length);
  const overallStatus = overallScore >= 80 ? 'pass' : overallScore >= 60 ? 'warn' : 'fail';

  return { stages, overallScore, overallStatus, timestamp: Date.now() };
}

// IDENTITY_SEAL: PART-1~7 | role=StaticAnalysisTeams | inputs=code,language | outputs=PipelineStage
// IDENTITY_SEAL: PART-8   | role=PipelineRunner | inputs=code,language | outputs=PipelineResult

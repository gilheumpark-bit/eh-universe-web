// ============================================================
// Quality Checklist — 2-Tier Inspection System + Good Pattern Bonus
// ============================================================
// Tier 1 (기본): 모든 코드에 적용. 빠른 정적 체크. 실측 기반.
// Tier 2 (정밀 타격): 문제 탐지 시 해당 영역만 깊이 파고듦. AI 보조.
// Good Pattern Bonus: 양품 패턴 탐지 시 점수 가산 (penalty-only 보정).
//
// 사용자: 체크 결과를 리포트로 받음 (pass/warn/fail + 설명)
// AI: 정밀 타격 시 이 체크리스트를 참조하여 구조적 분석 수행

// ============================================================
// PART 1 — Types
// ============================================================

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
export type CheckTier = 'basic' | 'precision';
export type CheckDomain = 'safety' | 'performance' | 'reliability' | 'maintainability' | 'security';

export interface CheckItem {
  id: string;
  tier: CheckTier;
  domain: CheckDomain;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  status: CheckStatus;
  detail?: string;          // 구체적 발견 사항
  line?: number;            // 문제 위치
  metric?: number;          // 측정값 (있으면)
  threshold?: number;       // 기준값 (있으면)
  autoFixable: boolean;     // 자동 수정 가능 여부
}

export interface ChecklistReport {
  timestamp: number;
  fileName: string;
  totalChecks: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  score: number;            // 0-100
  tier1: CheckItem[];       // 기본 체크 결과
  tier2: CheckItem[];       // 정밀 타격 결과 (tier1 fail 영역만)
  summary: { ko: string; en: string };
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CheckItem,ChecklistReport

// ============================================================
// PART 2 — Tier 1: 기본 체크리스트 (정적 계산, AI 없음)
// ============================================================
// 모든 항목은 regex/카운팅으로 실측. 추측 0%.

function check(
  id: string, domain: CheckDomain,
  label: { ko: string; en: string },
  desc: { ko: string; en: string },
  status: CheckStatus, detail?: string, metric?: number, threshold?: number,
  autoFixable = false,
): CheckItem {
  return { id, tier: 'basic', domain, label, description: desc, status, detail, metric, threshold, autoFixable };
}

export function runTier1(code: string, _fileName: string): CheckItem[] {
  const lines = code.split('\n');
  const _totalLines = lines.length;
  const results: CheckItem[] = [];

  // ── Safety ──

  // S01: 빈 catch 블록
  const emptyCatch = (code.match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g) ?? []).length;
  results.push(check('S01', 'safety',
    { ko: '빈 catch 블록', en: 'Empty catch blocks' },
    { ko: '에러를 삼키면 디버깅 불가', en: 'Swallowed errors prevent debugging' },
    emptyCatch === 0 ? 'pass' : emptyCatch <= 2 ? 'warn' : 'fail',
    emptyCatch > 0 ? `${emptyCatch}건 발견` : undefined, emptyCatch, 0, true,
  ));

  // S02: eval/exec 사용
  const dangerousCalls = (code.match(/\beval\s*\(|\bFunction\s*\(|new\s+Function\b/g) ?? []).length;
  results.push(check('S02', 'safety',
    { ko: 'eval/Function 사용', en: 'eval/Function usage' },
    { ko: '코드 인젝션 위험', en: 'Code injection risk' },
    dangerousCalls === 0 ? 'pass' : 'fail',
    dangerousCalls > 0 ? `${dangerousCalls}건` : undefined, dangerousCalls, 0,
  ));

  // S03: 타입 안전성 (any 사용)
  const anyCount = (code.match(/:\s*any\b|as\s+any\b/g) ?? []).length;
  results.push(check('S03', 'safety',
    { ko: 'any 타입 사용', en: 'any type usage' },
    { ko: '타입 안전성 훼손', en: 'Weakens type safety' },
    anyCount === 0 ? 'pass' : anyCount <= 3 ? 'warn' : 'fail',
    anyCount > 0 ? `${anyCount}건` : undefined, anyCount, 0, true,
  ));

  // S04: Null 가드 비율
  const nullGuards = (code.match(/\?\.|\.?\?\?|\?\s*:/g) ?? []).length;
  const propAccess = (code.match(/\.\w+/g) ?? []).length;
  const guardRatio = propAccess > 0 ? Math.round((nullGuards / propAccess) * 100) : 100;
  results.push(check('S04', 'safety',
    { ko: 'Null 가드 비율', en: 'Null guard ratio' },
    { ko: '속성 접근 대비 ?. ?? 사용률', en: 'Optional chaining usage vs property access' },
    guardRatio >= 15 ? 'pass' : guardRatio >= 5 ? 'warn' : 'fail',
    `${guardRatio}% (${nullGuards}/${propAccess})`, guardRatio, 15,
  ));

  // ── Performance ──

  // P01: 중첩 루프 깊이
  let maxDepth = 0, curDepth = 0;
  for (const line of lines) {
    if (/\b(?:for|while)\s*\(|\.forEach\(|\.map\(/.test(line)) { curDepth++; maxDepth = Math.max(maxDepth, curDepth); }
    if (line.includes('}') && curDepth > 0) curDepth--;
  }
  results.push(check('P01', 'performance',
    { ko: '중첩 루프 깊이', en: 'Nested loop depth' },
    { ko: 'O(n²)+ 알고리즘 탐지', en: 'Detects O(n²)+ algorithms' },
    maxDepth <= 1 ? 'pass' : maxDepth === 2 ? 'warn' : 'fail',
    `최대 ${maxDepth}단계`, maxDepth, 1,
  ));

  // P02: console.log 잔류
  const consoleLogs = (code.match(/console\.\w+\s*\(/g) ?? []).length;
  results.push(check('P02', 'performance',
    { ko: 'console.log 잔류', en: 'Console statements remaining' },
    { ko: '프로덕션 성능 저하 + 정보 노출', en: 'Performance impact + info leakage' },
    consoleLogs === 0 ? 'pass' : consoleLogs <= 3 ? 'warn' : 'fail',
    consoleLogs > 0 ? `${consoleLogs}건` : undefined, consoleLogs, 0, true,
  ));

  // P03: 대형 함수 (50줄+)
  const fnLengths: number[] = [];
  let fnStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/(?:function\s+\w+|=>)\s*\{/.test(lines[i])) fnStart = i;
    if (fnStart >= 0 && lines[i].trim() === '}') {
      fnLengths.push(i - fnStart);
      fnStart = -1;
    }
  }
  const largeFns = fnLengths.filter(l => l > 50).length;
  results.push(check('P03', 'performance',
    { ko: '대형 함수 (50줄+)', en: 'Large functions (50+ lines)' },
    { ko: '가독성·테스트·유지보수 저하', en: 'Readability and maintenance concern' },
    largeFns === 0 ? 'pass' : largeFns <= 2 ? 'warn' : 'fail',
    largeFns > 0 ? `${largeFns}개 함수` : undefined, largeFns, 0,
  ));

  // ── Reliability ──

  // R01: try-catch 없는 await
  let inTry = 0, unguardedAwait = 0;
  for (const line of lines) {
    if (/\btry\s*\{/.test(line)) inTry++;
    if (/\}/.test(line) && inTry > 0) inTry--;
    if (/\bawait\b/.test(line) && inTry === 0) unguardedAwait++;
  }
  results.push(check('R01', 'reliability',
    { ko: 'try-catch 없는 await', en: 'Unguarded await' },
    { ko: '비동기 에러 미처리 → 런타임 크래시', en: 'Async errors crash at runtime' },
    unguardedAwait === 0 ? 'pass' : unguardedAwait <= 2 ? 'warn' : 'fail',
    unguardedAwait > 0 ? `${unguardedAwait}건` : undefined, unguardedAwait, 0, true,
  ));

  // R02: fetch timeout (AbortController)
  const fetchCalls = (code.match(/\bfetch\s*\(/g) ?? []).length;
  const abortUsage = (code.match(/AbortController|AbortSignal|signal\s*:/g) ?? []).length;
  const untimedFetch = Math.max(0, fetchCalls - abortUsage);
  results.push(check('R02', 'reliability',
    { ko: 'fetch timeout 미설정', en: 'Fetch without timeout' },
    { ko: '네트워크 지연 시 무한 대기', en: 'Infinite hang on network delay' },
    untimedFetch === 0 ? 'pass' : 'fail',
    fetchCalls > 0 ? `${untimedFetch}/${fetchCalls} 미보호` : '해당 없음', untimedFetch, 0,
  ));

  // R03: 리소스 정리 (finally/cleanup)
  const cleanupPatterns = (code.match(/\bfinally\b|cleanup|dispose|removeEventListener|clearTimeout|clearInterval|\.unsubscribe/g) ?? []).length;
  const eventListeners = (code.match(/addEventListener/g) ?? []).length;
  results.push(check('R03', 'reliability',
    { ko: '리소스 정리', en: 'Resource cleanup' },
    { ko: 'finally/cleanup/removeEventListener 존재 여부', en: 'Cleanup patterns presence' },
    eventListeners === 0 || cleanupPatterns > 0 ? 'pass' : 'warn',
    `cleanup: ${cleanupPatterns}건, listeners: ${eventListeners}건`,
  ));

  // ── Maintainability ──

  // M01: TODO/FIXME/HACK 잔류
  const todos = (code.match(/\/\/\s*(?:TODO|FIXME|HACK|XXX)\b/gi) ?? []).length;
  results.push(check('M01', 'maintainability',
    { ko: 'TODO/FIXME 잔류', en: 'TODO/FIXME remaining' },
    { ko: '미완료 작업 추적', en: 'Tracks unfinished work' },
    todos === 0 ? 'pass' : todos <= 3 ? 'warn' : 'fail',
    todos > 0 ? `${todos}건` : undefined, todos, 0,
  ));

  // M02: 미사용 import
  const imports = code.match(/import\s+\{([^}]+)\}/g) ?? [];
  let unusedImports = 0;
  for (const imp of imports) {
    const names = imp.replace(/import\s+\{/, '').replace(/\}/, '').split(',').map(n => n.trim().split(' as ').pop()?.trim() ?? '');
    for (const name of names) {
      if (name && code.indexOf(name) === code.lastIndexOf(name)) unusedImports++;
    }
  }
  results.push(check('M02', 'maintainability',
    { ko: '미사용 import', en: 'Unused imports' },
    { ko: '번들 크기 증가', en: 'Bundle size bloat' },
    unusedImports === 0 ? 'pass' : unusedImports <= 2 ? 'warn' : 'fail',
    unusedImports > 0 ? `${unusedImports}건` : undefined, unusedImports, 0, true,
  ));

  // M03: 매직 넘버
  const magicNumbers = (code.match(/(?<![.\w])(?:[2-9]\d{2,}|[1-9]\d{3,})(?!\w)/g) ?? []).length;
  results.push(check('M03', 'maintainability',
    { ko: '매직 넘버', en: 'Magic numbers' },
    { ko: '의미 불명의 하드코딩 숫자', en: 'Unexplained hardcoded numbers' },
    magicNumbers <= 2 ? 'pass' : magicNumbers <= 5 ? 'warn' : 'fail',
    magicNumbers > 0 ? `${magicNumbers}건` : undefined, magicNumbers, 2,
  ));

  // ── Security ──

  // X01: 하드코딩 시크릿
  const secretPatterns = (code.match(/(?:password|secret|token|apikey|api_key)\s*[:=]\s*['"][^'"]{8,}['"]/gi) ?? []).length;
  results.push(check('X01', 'security',
    { ko: '하드코딩 시크릿', en: 'Hardcoded secrets' },
    { ko: 'API키/비밀번호 코드 내 노출', en: 'API keys/passwords exposed in code' },
    secretPatterns === 0 ? 'pass' : 'fail',
    secretPatterns > 0 ? `${secretPatterns}건 — 즉시 제거 필요` : undefined, secretPatterns, 0,
  ));

  // X02: innerHTML 사용
  const innerHtml = (code.match(/innerHTML|dangerouslySetInnerHTML/g) ?? []).length;
  results.push(check('X02', 'security',
    { ko: 'innerHTML/dangerouslySetInnerHTML', en: 'Raw HTML injection' },
    { ko: 'XSS 공격 벡터', en: 'XSS attack vector' },
    innerHtml === 0 ? 'pass' : 'warn',
    innerHtml > 0 ? `${innerHtml}건 — 입력 검증 필요` : undefined, innerHtml, 0,
  ));

  // ── Good Pattern Bonus — 양품 패턴 가산 (penalty-only 보정) ──

  // GP01: try-catch-finally 완전 쌍
  let tryCatchFinally = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/\btry\s*\{/.test(lines[i])) {
      const block = lines.slice(i, Math.min(i + 50, lines.length)).join('\n');
      if (/\bcatch\b/.test(block) && /\bfinally\b/.test(block)) tryCatchFinally++;
    }
  }
  if (tryCatchFinally > 0) {
    results.push(check('GP01', 'reliability',
      { ko: 'try-catch-finally 완전 쌍', en: 'Complete try-catch-finally' },
      { ko: '에러 처리 + 리소스 해제 보장', en: 'Error handling + resource cleanup guaranteed' },
      'pass', `${tryCatchFinally}건 양품 패턴`, tryCatchFinally, 0,
    ));
  }

  // GP02: const 우선 사용 (70%+ 비율)
  const constDecls = (code.match(/\bconst\s+\w/g) ?? []).length;
  const letDecls = (code.match(/\blet\s+\w/g) ?? []).length;
  const varDecls = (code.match(/\bvar\s+\w/g) ?? []).length;
  const totalDecls = constDecls + letDecls + varDecls;
  const constRatio = totalDecls > 0 ? Math.round((constDecls / totalDecls) * 100) : 0;
  if (totalDecls >= 3 && constRatio >= 70) {
    results.push(check('GP02', 'reliability',
      { ko: 'const 우선 사용', en: 'Const preference' },
      { ko: '불변성 선호 — 안정성 향상', en: 'Immutability preference — improved stability' },
      'pass', `${constRatio}% const 비율 (${constDecls}/${totalDecls})`, constRatio, 70,
    ));
  }

  // GP03: 타입 narrowing (typeof/instanceof 가드)
  let typeNarrowing = 0;
  for (const line of lines) {
    if (/typeof\s+\w+\s*(?:===|!==)\s*['"]/.test(line)) typeNarrowing++;
    if (/\w+\s+instanceof\s+\w+/.test(line)) typeNarrowing++;
  }
  if (typeNarrowing > 0) {
    results.push(check('GP03', 'safety',
      { ko: '타입 narrowing 가드', en: 'Type narrowing guards' },
      { ko: 'typeof/instanceof 런타임 타입 검사', en: 'Runtime type checking via typeof/instanceof' },
      'pass', `${typeNarrowing}건 양품 패턴`, typeNarrowing, 0,
    ));
  }

  // GP04: Optional chaining + Nullish coalescing
  const optChain = (code.match(/\?\./g) ?? []).length;
  const nullCoal = (code.match(/\?\?(?!=)/g) ?? []).length;
  if (optChain >= 3 || nullCoal >= 2) {
    results.push(check('GP04', 'safety',
      { ko: '현대적 null 방어', en: 'Modern null defense' },
      { ko: '?. ?? 연산자 적극 사용', en: 'Active use of ?. ?? operators' },
      'pass', `?. ${optChain}건, ?? ${nullCoal}건`, optChain + nullCoal, 3,
    ));
  }

  // GP05: Early return / Guard clause
  let earlyReturns = 0;
  for (const line of lines) {
    if (/^\s*if\s*\(.*\)\s*(?:return|throw)\b/.test(line)) earlyReturns++;
  }
  if (earlyReturns >= 2) {
    results.push(check('GP05', 'maintainability',
      { ko: 'Early return 가드 절', en: 'Early return guard clauses' },
      { ko: '중첩 감소 — 가독성 향상', en: 'Reduced nesting — improved readability' },
      'pass', `${earlyReturns}건 가드 절`, earlyReturns, 2,
    ));
  }

  // GP06: JSDoc 문서화
  const jsdocBlocks = (code.match(/\/\*\*[\s\S]*?\*\//g) ?? []).length;
  if (jsdocBlocks >= 2) {
    results.push(check('GP06', 'maintainability',
      { ko: 'JSDoc 문서화', en: 'JSDoc documentation' },
      { ko: 'public API 문서화 존재', en: 'Public API documentation present' },
      'pass', `${jsdocBlocks}건 JSDoc 블록`, jsdocBlocks, 2,
    ));
  }

  // GP07: AbortController 사용 (fetch timeout 보호)
  const abortControllers = (code.match(/AbortController|AbortSignal/g) ?? []).length;
  if (abortControllers > 0 && fetchCalls > 0) {
    results.push(check('GP07', 'reliability',
      { ko: 'AbortController fetch 보호', en: 'AbortController fetch protection' },
      { ko: 'fetch 호출의 타임아웃·취소 제어', en: 'Timeout/cancel control for fetch calls' },
      'pass', `${abortControllers}건 AbortController 사용`, abortControllers, 0,
    ));
  }

  return results;
}

// IDENTITY_SEAL: PART-2 | role=tier1-basic | inputs=code | outputs=CheckItem[]

// ============================================================
// PART 3 — Tier 2: 정밀 타격 체크리스트 (Tier1 fail 영역 깊이 분석)
// ============================================================
// Tier1에서 fail/warn 뜬 도메인만 골라서 정밀 분석.
// 정적 계산 + AI 보조 가능 영역 표시.

export function selectPrecisionTargets(tier1: CheckItem[]): CheckDomain[] {
  const domains = new Set<CheckDomain>();
  for (const item of tier1) {
    if (item.status === 'fail' || item.status === 'warn') {
      domains.add(item.domain);
    }
  }
  return [...domains];
}

/** 정밀 타격용 AI 프롬프트 생성 — 실패 영역만 집중 분석 요청 */
export function buildPrecisionPrompt(
  code: string,
  fileName: string,
  tier1: CheckItem[],
  targets: CheckDomain[],
): string {
  const failSummary = tier1
    .filter(i => i.status === 'fail' || i.status === 'warn')
    .map(i => `[${i.id}] ${i.label.en}: ${i.detail ?? i.status}`)
    .join('\n');

  const domainInstructions: Record<CheckDomain, string> = {
    safety: 'Focus on: null dereference paths, type coercion bugs, error propagation chains. Trace each any usage and empty catch to its consumer.',
    performance: 'Focus on: algorithm complexity analysis (exact Big-O), render cycle counts, memory allocation patterns, bundle size impact of imports.',
    reliability: 'Focus on: failure cascade paths (what breaks if fetch fails?), retry/timeout coverage map, state corruption during concurrent operations.',
    maintainability: 'Focus on: coupling analysis (how many files change if this function changes?), naming consistency audit, dead code reachability.',
    security: 'Focus on: input validation paths (trace user input to output), auth bypass scenarios, data exposure through error messages.',
  };

  const instructions = targets.map(d => `\n### ${d.toUpperCase()}\n${domainInstructions[d]}`).join('');

  return [
    `[PRECISION STRIKE ANALYSIS]`,
    `File: ${fileName} (${code.split('\n').length} lines)`,
    ``,
    `Tier 1 findings (REAL measurements, not guesses):`,
    failSummary,
    ``,
    `DRILL DOWN into these domains ONLY:${instructions}`,
    ``,
    `For each finding, respond with JSON array:`,
    `[{"id":"P01-deep-1","domain":"performance","label":"...","description":"...","status":"fail","detail":"...","line":42,"autoFixable":false}]`,
    ``,
    `Code:`,
    '```',
    code.slice(0, 5000),
    '```',
  ].join('\n');
}

// IDENTITY_SEAL: PART-3 | role=tier2-precision | inputs=tier1,targets | outputs=prompt

// ============================================================
// PART 4 — Report Generator
// ============================================================

export function generateChecklistReport(
  fileName: string,
  tier1: CheckItem[],
  tier2: CheckItem[] = [],
): ChecklistReport {
  const all = [...tier1, ...tier2];
  const passed = all.filter(i => i.status === 'pass').length;
  const warned = all.filter(i => i.status === 'warn').length;
  const failed = all.filter(i => i.status === 'fail').length;
  const skipped = all.filter(i => i.status === 'skip').length;
  const total = all.length;

  // 점수: pass=100, warn=60, fail=0, skip=무시
  // GP (Good Pattern) 보너스: penalty-only 체계 보정
  const penaltyItems = all.filter(i => i.status !== 'skip' && !i.id.startsWith('GP'));
  const bonusItems = all.filter(i => i.id.startsWith('GP') && i.status === 'pass');
  const penaltyScore = penaltyItems.length > 0
    ? penaltyItems.reduce((sum, i) => sum + (i.status === 'pass' ? 100 : i.status === 'warn' ? 60 : 0), 0) / penaltyItems.length
    : 100;
  // 양품 보너스: GP pass 항목당 +2점, 최대 +12
  const gpBonus = Math.min(12, bonusItems.length * 2);
  const score = Math.min(100, Math.round(penaltyScore + gpBonus));

  const hasSecurityFail = all.some(i => i.domain === 'security' && i.status === 'fail');
  const hasSafetyFail = all.some(i => i.domain === 'safety' && i.status === 'fail');

  let summaryKo: string;
  let summaryEn: string;
  if (hasSecurityFail) {
    summaryKo = `⛔ 보안 취약점 발견 — 즉시 조치 필요 (${failed}건 실패)`;
    summaryEn = `⛔ Security vulnerability — immediate action required (${failed} failed)`;
  } else if (hasSafetyFail) {
    summaryKo = `⚠️ 안전성 문제 ${failed}건 — 수정 권장 (점수: ${score}/100)`;
    summaryEn = `⚠️ Safety issues: ${failed} — fix recommended (score: ${score}/100)`;
  } else if (failed > 0) {
    summaryKo = `${failed}건 실패, ${warned}건 경고 (점수: ${score}/100)`;
    summaryEn = `${failed} failed, ${warned} warnings (score: ${score}/100)`;
  } else if (warned > 0) {
    summaryKo = `✅ 통과 — ${warned}건 경고 확인 권장 (점수: ${score}/100)`;
    summaryEn = `✅ Passed — ${warned} warnings to review (score: ${score}/100)`;
  } else {
    summaryKo = `✅ 전체 통과 (${score}/100)`;
    summaryEn = `✅ All checks passed (${score}/100)`;
  }

  return {
    timestamp: Date.now(),
    fileName,
    totalChecks: total,
    passed, warned, failed, skipped,
    score,
    tier1,
    tier2,
    summary: { ko: summaryKo, en: summaryEn },
  };
}

// IDENTITY_SEAL: PART-4 | role=report-generator | inputs=tier1,tier2 | outputs=ChecklistReport

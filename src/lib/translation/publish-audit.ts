// ============================================================
// Publish Audit — 출판 전 자체 검수 엔진
// 외부 API 의존 없음 (무료). 로컬 정규식 + 휴리스틱.
// AI 프로바이더를 옵션으로 추가 호출 가능하도록 확장점 제공.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================
export type AuditSeverity = 'high' | 'medium' | 'low' | 'info';
export type AuditCategory =
  | 'punctuation'      // 문장부호 (중복/혼용)
  | 'spacing'          // 띄어쓰기
  | 'spelling'         // 맞춤법 (자주 틀리는 표현)
  | 'structure'        // 문단/문장 길이
  | 'consistency'      // 일관성 (단위/숫자 표기)
  | 'completeness';    // 완성도 (말줄임/미완)

export interface PublishAuditFinding {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;         // 짧은 제목
  detail: string;        // 구체 설명
  locations?: { index: number; snippet: string }[];  // 본문 내 위치
  suggestion?: string;   // 고침 제안
  autoFixable?: boolean;
}

export interface PublishAuditReport {
  findings: PublishAuditFinding[];
  stats: {
    totalChars: number;
    totalParagraphs: number;
    avgSentenceLength: number;
    longestSentenceLength: number;
    dialogueRatio: number;     // 0~1
  };
  overallScore: number;        // 0~100
}

// ============================================================
// PART 2 — Rule: 중복 문장부호 (P-1)
// ============================================================
function checkDuplicatePunctuation(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  const patterns: { pattern: RegExp; msg: string; sev: AuditSeverity; suggestion: string }[] = [
    { pattern: /!!{2,}/g, msg: '느낌표 3개 이상 연속', sev: 'medium', suggestion: '!! 또는 !' },
    { pattern: /\?\?{2,}/g, msg: '물음표 3개 이상 연속', sev: 'medium', suggestion: '?? 또는 ?' },
    { pattern: /\.{4,}/g, msg: '점 4개 이상 연속', sev: 'medium', suggestion: '…(말줄임표) 또는 ...' },
    { pattern: /,,+/g, msg: '쉼표 연속', sev: 'high', suggestion: ',' },
    { pattern: /--+/g, msg: '하이픈 연속 (대시 구분자?)', sev: 'low', suggestion: '— (em dash) 또는 -' },
  ];
  for (const { pattern, msg, sev, suggestion } of patterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      findings.push({
        id: `dup-punct-${pattern.source.slice(0, 10)}`,
        category: 'punctuation',
        severity: sev,
        title: msg,
        detail: `${matches.length}곳 발견`,
        locations: matches.slice(0, 5).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
        suggestion,
        autoFixable: true,
      });
    }
  }
  return findings;
}

// ============================================================
// PART 3 — Rule: 전각/반각 혼용 (P-2)
// ============================================================
function checkFullWidthMix(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  const fullWidthPunct = /[！？．，；：]/g;
  const matches = [...text.matchAll(fullWidthPunct)];
  if (matches.length > 0) {
    findings.push({
      id: 'fullwidth-punct',
      category: 'punctuation',
      severity: 'medium',
      title: '전각 문장부호 사용',
      detail: `전각(！？．，)이 ${matches.length}곳. 한국어 출판은 일반적으로 반각(!?.,).`,
      locations: matches.slice(0, 3).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
      suggestion: '반각 문장부호로 통일',
      autoFixable: true,
    });
  }
  return findings;
}

// ============================================================
// PART 4 — Rule: 자주 틀리는 한국어 맞춤법 (P-3)
// ============================================================
const COMMON_MISTAKES: { wrong: RegExp; right: string; note: string }[] = [
  { wrong: /\b됬/g, right: '됐', note: '"되었다"의 줄임은 "됐다"' },
  { wrong: /할게요|할께요/g, right: '할게요', note: '"-ㄹ께요"가 아니라 "-ㄹ게요"' },
  { wrong: /어떻해|어떡해서/g, right: '어떻게 해 / 어떡해', note: '"어떻해"는 틀림' },
  { wrong: /않돼|않되/g, right: '안 돼 / 안 되', note: '부정 "안"은 띄어쓰기' },
  { wrong: /몇일/g, right: '며칠', note: '"몇일"은 비표준' },
  { wrong: /왠만하면|왠지모르게/g, right: '웬만하면 / 왠지 모르게', note: '"왠"은 "왜인지"의 줄임형' },
  { wrong: /\b됏|됏어/g, right: '됐/됐어', note: '받침은 ㅆ' },
  { wrong: /\b맞추다/g, right: '맞히다/맞추다', note: '문맥 확인 (정답=맞히다)' },
  { wrong: /어의없/g, right: '어이없', note: '"어의없다"는 틀림' },
];

function checkCommonSpelling(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  for (const { wrong, right, note } of COMMON_MISTAKES) {
    const matches = [...text.matchAll(wrong)];
    if (matches.length > 0) {
      findings.push({
        id: `spelling-${wrong.source}`,
        category: 'spelling',
        severity: 'high',
        title: `의심 맞춤법: "${matches[0][0]}"`,
        detail: `${matches.length}곳. ${note}`,
        locations: matches.slice(0, 3).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
        suggestion: `→ ${right}`,
        autoFixable: false, // 문맥 확인 필요
      });
    }
  }
  return findings;
}

// ============================================================
// PART 5 — Rule: 띄어쓰기 (자주 틀리는 표현 중심, P-4)
// ============================================================
function checkSpacing(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  // "안되다/안 되다": 부정 "안"은 띄어쓰기
  const antBadPattern = /안([되돼])/g;
  const antMatches = [...text.matchAll(antBadPattern)];
  // "안돼/안되"가 여러 곳이면 주의
  if (antMatches.length >= 3) {
    findings.push({
      id: 'spacing-ant',
      category: 'spacing',
      severity: 'low',
      title: '부정 "안" 띄어쓰기 확인',
      detail: `"안돼/안되"가 ${antMatches.length}곳. 부정 의미면 "안 돼/안 되"로 띄어쓰기.`,
      locations: antMatches.slice(0, 3).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
      suggestion: '"안 돼/안 되" (부정) vs "안되다"(용언, 붙여쓰기는 드묾)',
      autoFixable: false,
    });
  }
  // "할 수 있다/할수있다" — 의존명사 "수" 띄어쓰기
  const suBadPattern = /[할할것을돼어모할돼을할를]수\s*[있없]/g;
  // 덜 정확한 대체: '[동사]수있/수없' 붙어있음 감지
  const suMatches = [...text.matchAll(/[\uAC00-\uD7A3]수[있없]/g)];
  if (suMatches.length >= 1) {
    findings.push({
      id: 'spacing-su',
      category: 'spacing',
      severity: 'medium',
      title: '"수 있다/없다" 띄어쓰기',
      detail: `의존명사 "수"는 앞뒤 띄어쓰기 필요 (${suMatches.length}곳 의심).`,
      locations: suMatches.slice(0, 3).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
      suggestion: '"할 수 있다" / "갈 수 없다"',
      autoFixable: false,
    });
  }
  void antBadPattern; void suBadPattern; // 예비 참조, suppress
  return findings;
}

// ============================================================
// PART 6 — Rule: 문장 길이 (P-5)
// ============================================================
function checkStructure(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  // 문장 단위 분리 (. ! ? … 기준, 줄바꿈 포함)
  const sentences = text
    .split(/[.!?…]+\s*|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const longSentences = sentences.filter(s => s.length > 120);
  if (longSentences.length > 0) {
    findings.push({
      id: 'structure-long-sentence',
      category: 'structure',
      severity: 'medium',
      title: '긴 문장',
      detail: `120자 초과 문장 ${longSentences.length}개. 가독성을 위해 분할 권장.`,
      locations: longSentences.slice(0, 3).map((s, i) => ({ index: i, snippet: s.slice(0, 60) + '…' })),
      suggestion: '문장 하나에 아이디어 1~2개로 제한',
    });
  }

  // 문단 길이 (빈 줄 기준)
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  const longParas = paragraphs.filter(p => p.length > 800);
  if (longParas.length > 0) {
    findings.push({
      id: 'structure-long-para',
      category: 'structure',
      severity: 'low',
      title: '긴 문단',
      detail: `800자 초과 문단 ${longParas.length}개. 웹소설 플랫폼은 짧은 문단이 유리.`,
      suggestion: '문단당 3~5문장 권장',
    });
  }
  return findings;
}

// ============================================================
// PART 7 — Rule: 미완 표식 (P-6)
// ============================================================
function checkCompleteness(text: string): PublishAuditFinding[] {
  const findings: PublishAuditFinding[] = [];
  const placeholders = [
    { pattern: /\bTODO\b/gi, name: 'TODO 표식' },
    { pattern: /\bTBD\b/gi, name: 'TBD 표식' },
    { pattern: /\bFIXME\b/gi, name: 'FIXME 표식' },
    { pattern: /\[\.\.\.?\]|\(\.\.\.?\)/g, name: '[...] 미완 표식' },
    { pattern: /\?\?\?+/g, name: '??? 미완 표식' },
  ];
  for (const { pattern, name } of placeholders) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      findings.push({
        id: `completeness-${name}`,
        category: 'completeness',
        severity: 'high',
        title: `미완 표식: ${name}`,
        detail: `${matches.length}곳. 출판 전 반드시 제거.`,
        locations: matches.slice(0, 3).map(m => ({ index: m.index ?? 0, snippet: m[0] })),
        autoFixable: false,
      });
    }
  }
  return findings;
}

// ============================================================
// PART 8 — Stats & Score
// ============================================================
function computeStats(text: string): PublishAuditReport['stats'] {
  const sentences = text.split(/[.!?…]+\s*|\n+/).map(s => s.trim()).filter(Boolean);
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const totalLen = sentences.reduce((s, x) => s + x.length, 0);
  const longest = sentences.reduce((m, x) => Math.max(m, x.length), 0);
  // 대사 비율: "..." 또는 『...』 또는 「...」 내부 글자 수
  const dialogueMatches = [...text.matchAll(/["“”「」『』]([^"“”「」『』]{1,400})["“”「」『』]/g)];
  const dialogueChars = dialogueMatches.reduce((s, m) => s + m[1].length, 0);
  return {
    totalChars: text.length,
    totalParagraphs: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? Math.round(totalLen / sentences.length) : 0,
    longestSentenceLength: longest,
    dialogueRatio: text.length > 0 ? dialogueChars / text.length : 0,
  };
}

function computeScore(findings: PublishAuditFinding[]): number {
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === 'high') penalty += 12;
    else if (f.severity === 'medium') penalty += 6;
    else if (f.severity === 'low') penalty += 2;
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

// ============================================================
// PART 9 — Main: runPublishAudit
// ============================================================
export function runPublishAudit(text: string): PublishAuditReport {
  if (!text || text.trim().length === 0) {
    return {
      findings: [],
      stats: { totalChars: 0, totalParagraphs: 0, avgSentenceLength: 0, longestSentenceLength: 0, dialogueRatio: 0 },
      overallScore: 0,
    };
  }
  const findings: PublishAuditFinding[] = [
    ...checkDuplicatePunctuation(text),
    ...checkFullWidthMix(text),
    ...checkCommonSpelling(text),
    ...checkSpacing(text),
    ...checkStructure(text),
    ...checkCompleteness(text),
  ];
  return {
    findings,
    stats: computeStats(text),
    overallScore: computeScore(findings),
  };
}

// ============================================================
// PART 10 — Auto-fix (안전한 것만)
// ============================================================

/**
 * autoFixable=true 규칙만 자동 적용. 사용자가 명시적으로 요청할 때만 호출.
 */
export function applyAutoFix(text: string): { fixed: string; changes: number } {
  let fixed = text;
  let changes = 0;

  // 중복 문장부호 정리
  fixed = fixed.replace(/!{3,}/g, (m) => { changes++; return '!!'; });
  fixed = fixed.replace(/\?{3,}/g, (m) => { changes++; return '??'; });
  fixed = fixed.replace(/\.{4,}/g, (m) => { changes++; return '…'; });
  fixed = fixed.replace(/,{2,}/g, (m) => { changes++; return ','; });

  // 전각 → 반각
  const fullToHalf: Record<string, string> = {
    '！': '!', '？': '?', '．': '.', '，': ',', '；': ';', '：': ':',
  };
  for (const [from, to] of Object.entries(fullToHalf)) {
    const re = new RegExp(from, 'g');
    fixed = fixed.replace(re, () => { changes++; return to; });
  }

  return { fixed, changes };
}

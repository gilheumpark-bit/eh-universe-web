// ============================================================
// qa-auditor — 창작 지침 08_검증측정/01_페르소나 (QA 감사원 A/B/C/D chg_151 비수렴) 흡수
// 4 관점 "비수렴" 감사: 같은 원고를 서로 독립된 4 시선으로 본다.
//   A 정합검사관(consistency) · B 외부독자(outsider) · C 반증가(refuter) · D 구조검사관(structure)
// 각 관점은 자기 휴리스틱만으로 결함(AuditFinding)을 수집하고, 서로 합의(수렴)하지 않는다.
// 순수 TS. React/DOM/fetch/LLM 의존 0. 절대금지 8파일 import 0. '@/lib/desktop/writing-stats' 재사용.
// ============================================================

import { analyzeText, topRepeatedWords } from '@/lib/desktop/writing-stats';

// ============================================================
// PART 1 — 타입 정의 (관점 · 결함 · 평결)
// ============================================================

/** 감사 관점 4종: 정합 / 외부독자 / 반증 / 구조. */
export type AuditPerspective = 'consistency' | 'outsider' | 'refuter' | 'structure';

/** 결함 심각도. */
export type AuditSeverity = 'high' | 'mid' | 'low';

/** 단일 감사 발견(결함). */
export interface AuditFinding {
  /** 어느 관점이 잡았는가. */
  perspective: AuditPerspective;
  /** 결함 설명(작가용 한글). */
  issue: string;
  /** 심각도. */
  severity: AuditSeverity;
}

/** 4 관점 평결 집계. */
export interface AuditVerdict {
  /** high 결함이 하나도 없으면 통과. */
  passed: boolean;
  /** 관점별 결함 개수(4 관점 모두 0 초기화). */
  byPerspective: Record<AuditPerspective, number>;
}

/** 모든 관점 목록(평결 집계 초기화·순회용 단일 출처). */
const PERSPECTIVES: readonly AuditPerspective[] = ['consistency', 'outsider', 'refuter', 'structure'];

// ============================================================
// PART 2 — 공용 가드 · 보조 유틸 (휴리스틱 입력 정규화)
// ============================================================

/** 비문자열·null·undefined 입력을 빈 문자열로 정규화(전 관점 공통 가드). */
function normalizeText(text: unknown): string {
  return typeof text === 'string' ? text : '';
}

/** 문장 단위 분할(끝부호 기준). 빈 토큰 제거. */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?。…\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 문단 단위 분할(빈 줄 기준). 빈 토큰 제거. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** 따옴표 짝 균형 여부(여는 수 == 닫는 수). 유니코드 따옴표 포함. */
function isQuoteBalanced(text: string): boolean {
  const open = (text.match(/[“]/g) ?? []).length;
  const close = (text.match(/[”]/g) ?? []).length;
  // 곧은따옴표(")는 여닫이 구분 불가 → 짝수성만 검사
  const straight = (text.match(/["]/g) ?? []).length;
  return open === close && straight % 2 === 0;
}

// ============================================================
// PART 3 — 관점 A: 정합검사관 (consistency)
// 따옴표 짝 불일치 · 문장 미완(종결부호 없음) 탐지
// ============================================================

function auditConsistency(text: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (text.trim().length === 0) return findings;

  // 1) 따옴표 짝 불일치 → 대사 경계 붕괴(high)
  if (!isQuoteBalanced(text)) {
    findings.push({
      perspective: 'consistency',
      issue: '따옴표 짝이 맞지 않습니다(대사 경계 미완).',
      severity: 'high',
    });
  }

  // 2) 종결부호 없이 끝남 → 문장 미완(mid)
  const trimmed = text.trimEnd();
  if (trimmed.length > 0 && !/[.!?。…”"’']$/.test(trimmed)) {
    findings.push({
      perspective: 'consistency',
      issue: '마지막 문장이 종결부호 없이 끊겼습니다(문장 미완).',
      severity: 'mid',
    });
  }

  return findings;
}

// ============================================================
// PART 4 — 관점 B: 외부독자 (outsider)
// tell 과다(평균 문장 길이/문장 수 대비) · 대사 부족 탐지
// ============================================================

// tell 신호 어미: 감정·상태를 직접 진술하는 패턴
const TELL_MARKERS = /(느꼈다|생각했다|보였다|것이었다|듯했다|같았다)/g;

function auditOutsider(text: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (text.trim().length === 0) return findings;

  const stats = analyzeText(text);

  // 1) tell 과다 → 문장 수 대비 tell 신호 밀도 30% 초과(high)
  const tellCount = (text.match(TELL_MARKERS) ?? []).length;
  if (stats.sentences > 0) {
    const tellRatio = tellCount / stats.sentences;
    if (tellRatio > 0.3) {
      findings.push({
        perspective: 'outsider',
        issue: `직접 진술(tell)이 과다합니다(문장당 ${(tellRatio * 100).toFixed(0)}%).`,
        severity: 'high',
      });
    } else if (tellRatio > 0.15) {
      findings.push({
        perspective: 'outsider',
        issue: '직접 진술(tell)이 다소 많습니다(보여주기 권장).',
        severity: 'mid',
      });
    }
  }

  // 2) 대사 부족 → 본문 분량이 충분한데 대사 비율 5% 미만(mid)
  if (stats.chars >= 200 && stats.dialoguePct < 5) {
    findings.push({
      perspective: 'outsider',
      issue: `대사 비율이 낮습니다(${stats.dialoguePct}%, 인물 목소리 부족).`,
      severity: 'mid',
    });
  }

  return findings;
}

// ============================================================
// PART 4.5 — 관점 B 변형: EN 전용 외부독자 (B리더 — KO 컨텍스트 차단)
// [Z1a-2 2026-06-11] 번역(EN) 결과 전용 감사관.
// KO 컨텍스트 차단 directive: 이 함수는 EN 본문 인자 하나만 받는다 —
// KO 원문/세계관/용어집이 시그니처에 존재하지 않아 차단이 '구조적으로' 강제
// (Blind 명세: 영어 독자가 원문 없이 결과만 읽는 시선).
// 한계 (정직): 휴리스틱 grep — tell 동사가 정당한 문맥(인지 묘사)일 수 있음.
// ============================================================

// EN tell 신호 동사 — 감정/사고 직접 진술 (show 결여 의심)
const TELL_MARKERS_EN = /\b(felt|thought|seemed|realized|wondered|knew)\b/gi;

/**
 * EN 전용 B리더(외부독자) 감사 — 번역 결과만 입력 (KO 컨텍스트 구조 차단).
 * @param text  EN 번역 본문 (비문자열/빈 입력 안전 → 빈 결과)
 * @returns perspective='outsider' findings
 */
export function auditOutsiderEnglish(text: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const t = normalizeText(text);
  if (t.trim().length === 0) return findings;

  // 문장 수 근사 — EN 종결부호 (0분모 방어 최소 1)
  const sentences = (t.match(/[.!?]+/g) ?? []).length || 1;

  // 1) tell 과다 — 문장당 tell 동사 밀도 (KO auditOutsider 와 동일 임계 30%/15%)
  const tellCount = (t.match(new RegExp(TELL_MARKERS_EN.source, TELL_MARKERS_EN.flags)) ?? []).length;
  const tellRatio = tellCount / sentences;
  if (tellRatio > 0.3) {
    findings.push({
      perspective: 'outsider',
      issue: `직접 진술(tell) 동사가 과다합니다 (felt/thought 류, 문장당 ${(tellRatio * 100).toFixed(0)}%) — EN 독자 시선.`,
      severity: 'high',
    });
  } else if (tellRatio > 0.15) {
    findings.push({
      perspective: 'outsider',
      issue: '직접 진술(tell) 동사가 다소 많습니다 (보여주기 권장) — EN 독자 시선.',
      severity: 'mid',
    });
  }

  // 2) 대사 부족 — 따옴표 내부 글자 비율 < 5% (본문 400자 이상일 때만)
  if (t.length >= 400) {
    const dialogueChars = (t.match(/"[^"\n]*"|“[^”\n]*”/g) ?? []).reduce((a, m) => a + m.length, 0);
    const dialoguePct = (dialogueChars / t.length) * 100;
    if (dialoguePct < 5) {
      findings.push({
        perspective: 'outsider',
        issue: `대사 비율이 낮습니다 (${dialoguePct.toFixed(0)}%) — EN 독자 시선 (인물 목소리 부족).`,
        severity: 'mid',
      });
    }
  }

  return findings;
}

// ============================================================
// PART 5 — 관점 C: 반증가 (refuter)
// 반복어 과다 · 문장 단조(길이 다양성 부족) 탐지
// ============================================================

function auditRefuter(text: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (text.trim().length === 0) return findings;

  const stats = analyzeText(text);

  // 1) 반복어 과다 → repetitionPct 25% 초과(mid), 최다 반복어 명시
  if (stats.repetitionPct > 25) {
    const top = topRepeatedWords(text, 1)[0];
    const hint = top ? ` (최다: "${top.word}" ${top.count}회)` : '';
    findings.push({
      perspective: 'refuter',
      issue: `반복어가 과다합니다(${stats.repetitionPct}%)${hint}.`,
      severity: stats.repetitionPct > 40 ? 'high' : 'mid',
    });
  }

  // 2) 문장 단조 → 문장 길이 표준편차가 작음(다양성 부족, low)
  const sentences = splitSentences(text);
  if (sentences.length >= 3) {
    const lengths = sentences.map((s) => s.length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
    const std = Math.sqrt(variance);
    // 평균 대비 표준편차가 15% 미만이면 길이가 거의 균일 → 리듬 단조
    if (mean > 0 && std / mean < 0.15) {
      findings.push({
        perspective: 'refuter',
        issue: '문장 길이가 균일해 리듬이 단조롭습니다(장단 변주 부족).',
        severity: 'low',
      });
    }
  }

  return findings;
}

// ============================================================
// PART 6 — 관점 D: 구조검사관 (structure)
// 문단 수 부족 · 문단 길이 편차 과다 탐지
// ============================================================

function auditStructure(text: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (text.trim().length === 0) return findings;

  const paragraphs = splitParagraphs(text);

  // 1) 문단 분리 부재 → 분량이 충분한데 단일 문단(mid)
  if (text.length >= 400 && paragraphs.length <= 1) {
    findings.push({
      perspective: 'structure',
      issue: '문단 분리가 없습니다(긴 본문이 한 덩어리).',
      severity: 'mid',
    });
  }

  // 2) 문단 길이 편차 과다 → 가장 긴 문단이 평균의 3배 초과(low)
  if (paragraphs.length >= 2) {
    const lengths = paragraphs.map((p) => p.length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const max = Math.max(...lengths);
    if (mean > 0 && max > mean * 3) {
      findings.push({
        perspective: 'structure',
        issue: '문단 길이 편차가 큽니다(한 문단만 비대).',
        severity: 'low',
      });
    }
  }

  return findings;
}

// ============================================================
// PART 7 — 오케스트레이션: auditManuscript · auditVerdict
// 4 관점을 독립 실행 후 합치되 합의(수렴)하지 않는다.
// ============================================================

/**
 * 원고 4 관점 비수렴 감사.
 * @param text  검사할 본문(비문자열/null/undefined 안전 → 빈 결과)
 * @returns 관점별 결함을 합친 배열(빈 텍스트면 빈 배열).
 */
export function auditManuscript(text: string): AuditFinding[] {
  const t = normalizeText(text);
  if (t.trim().length === 0) return [];
  return [
    ...auditConsistency(t),
    ...auditOutsider(t),
    ...auditRefuter(t),
    ...auditStructure(t),
  ];
}

/**
 * 감사 결과 평결.
 * @param findings  auditManuscript 결과(비배열/null 안전)
 * @returns {passed, byPerspective}. high 결함 0건이면 passed=true.
 */
export function auditVerdict(findings: AuditFinding[]): AuditVerdict {
  // 관점별 카운트 0 초기화(빈 입력에서도 4 키 모두 존재 보장)
  const byPerspective = PERSPECTIVES.reduce(
    (acc, p) => {
      acc[p] = 0;
      return acc;
    },
    {} as Record<AuditPerspective, number>,
  );

  const list = Array.isArray(findings) ? findings : [];
  let hasHigh = false;
  for (const f of list) {
    // 미지 관점/형식 깨진 항목 방어
    if (!f || !(f.perspective in byPerspective)) continue;
    byPerspective[f.perspective] += 1;
    if (f.severity === 'high') hasHigh = true;
  }

  return { passed: !hasHigh, byPerspective };
}

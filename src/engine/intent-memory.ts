// ============================================================
// PART 1 — Module Header
// ============================================================
//
// intent-memory.ts — 직전 N turn 작가 의도 누적.
//
// 사상: AI 가 raw 메시지 history 만 받으면 5 turn 전 결정 흘림.
//   인텐트 명시 추출 (휴리스틱 — LLM 호출 X) → AI prompt 자동 prepend.
//
// 추출 패턴:
//   - "X로 가자" / "X 결정" / "X 하자" — 결정
//   - "X 하지 말자" / "X 빼자" / "X 안 됨" — 거절
//   - "X 가 핵심" / "X 우선" — 우선순위
//   - "방금 말한 X" / "다시 X" — 강조
//
// [C] 빈 메시지 → 빈 list / [G] 직전 N (default 5) turn 만 / [K] 휴리스틱
// ============================================================

import type { Message, AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 2 — Types
// ============================================================

export type IntentKind = 'decision' | 'rejection' | 'priority' | 'emphasis';

export interface IntentRecord {
  kind: IntentKind;
  /** 추출된 핵심 표현 (정제됨) */
  text: string;
  /** 원본 메시지 turn 인덱스 (가장 최근 = 0) */
  turnIdx: number;
  /** 원본 timestamp */
  timestamp: number;
}

export interface IntentMemoryDigest {
  records: IntentRecord[];
  /** 가장 최근 결정 (있으면) */
  latestDecision?: string;
  /** 우선순위 list */
  priorities: string[];
  /** 거절 list */
  rejections: string[];
}

// ============================================================
// PART 3 — Pattern matching (4언어 부분 지원)
// ============================================================

interface IntentPattern {
  regex: RegExp;
  kind: IntentKind;
  /** 캡처 그룹 1 = 인텐트 본문 */
}

const KO_PATTERNS: IntentPattern[] = [
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})(?:으|로|을|를)?\s*가자/g, kind: 'decision' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})(?:으|로|을|를)?\s*하자/g, kind: 'decision' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*결정/g, kind: 'decision' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*확정/g, kind: 'decision' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*하지\s*말자/g, kind: 'rejection' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*빼자/g, kind: 'rejection' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*안\s*됨/g, kind: 'rejection' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})\s*폐기/g, kind: 'rejection' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})(?:이|가)?\s*핵심/g, kind: 'priority' },
  { regex: /([가-힣A-Za-z0-9 _\-]{2,40})(?:을|를)?\s*우선/g, kind: 'priority' },
  { regex: /방금\s*말한\s*([가-힣A-Za-z0-9 _\-]{2,40})/g, kind: 'emphasis' },
  { regex: /다시\s*([가-힣A-Za-z0-9 _\-]{2,40})/g, kind: 'emphasis' },
];

const EN_PATTERNS: IntentPattern[] = [
  { regex: /(?:let'?s|we'?ll|going with)\s+([A-Za-z0-9 _\-]{2,40})/gi, kind: 'decision' },
  { regex: /decided?\s+(?:on|to)\s+([A-Za-z0-9 _\-]{2,40})/gi, kind: 'decision' },
  { regex: /(?:no|not|drop|remove)\s+([A-Za-z0-9 _\-]{2,40})/gi, kind: 'rejection' },
  { regex: /([A-Za-z0-9 _\-]{2,40})\s+(?:is\s+)?(?:key|priority|critical)/gi, kind: 'priority' },
  { regex: /(?:as I said|again)\s+([A-Za-z0-9 _\-]{2,40})/gi, kind: 'emphasis' },
];

function extractFromText(text: string, turnIdx: number, timestamp: number, lang: AppLanguage): IntentRecord[] {
  if (!text) return [];
  const patterns = lang === 'KO' ? KO_PATTERNS : lang === 'EN' ? EN_PATTERNS : [...KO_PATTERNS, ...EN_PATTERNS];
  const seen = new Set<string>();
  const records: IntentRecord[] = [];

  for (const p of patterns) {
    p.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.regex.exec(text)) !== null) {
      const captured = (m[1] ?? '').trim();
      if (captured.length < 2 || captured.length > 40) continue;
      const key = `${p.kind}:${captured}`;
      if (seen.has(key)) continue;
      seen.add(key);
      records.push({ kind: p.kind, text: captured, turnIdx, timestamp });
    }
  }
  return records;
}

// ============================================================
// PART 4 — Public API
// ============================================================

export interface BuildDigestOptions {
  /** 직전 N turn 만 — 기본 5 */
  recentN?: number;
  /** 사용자 입력만 (assistant 무시) — 기본 true */
  userOnly?: boolean;
  /** 언어 */
  language: AppLanguage;
}

export function buildIntentDigest(
  messages: Message[] | null | undefined,
  options: BuildDigestOptions,
): IntentMemoryDigest {
  const recentN = options.recentN ?? 5;
  const userOnly = options.userOnly ?? true;

  if (!messages || messages.length === 0) {
    return { records: [], priorities: [], rejections: [] };
  }

  const filtered = userOnly ? messages.filter((m) => m.role === 'user') : messages;
  const recent = filtered.slice(-recentN);

  const records: IntentRecord[] = [];
  recent.forEach((m, i) => {
    const turnIdx = recent.length - 1 - i; // 가장 최근 = 0
    const extracted = extractFromText(m.content ?? '', turnIdx, m.timestamp ?? 0, options.language);
    records.push(...extracted);
  });

  // 가장 최근 결정 / 우선순위 / 거절
  const decisions = records.filter((r) => r.kind === 'decision').sort((a, b) => a.turnIdx - b.turnIdx);
  const priorities = records.filter((r) => r.kind === 'priority').map((r) => r.text);
  const rejections = records.filter((r) => r.kind === 'rejection').map((r) => r.text);

  return {
    records,
    latestDecision: decisions[0]?.text,
    priorities: Array.from(new Set(priorities)).slice(0, 5),
    rejections: Array.from(new Set(rejections)).slice(0, 5),
  };
}

// ============================================================
// PART 5 — Prompt prefix builder
// ============================================================

export interface IntentMemoryOptions {
  language: AppLanguage;
  charCap?: number;
}

export function buildIntentMemoryModifier(
  digest: IntentMemoryDigest | null | undefined,
  options: IntentMemoryOptions,
): string {
  if (!digest || digest.records.length === 0) return '';
  const cap = options.charCap ?? 200;
  const isKO = options.language === 'KO';

  const lines: string[] = [
    isKO ? '[대화 누적 의도 — 자동]' : '[Intent Memory — auto]',
  ];

  if (digest.latestDecision) {
    lines.push(isKO ? `  최근 결정: ${digest.latestDecision}` : `  Latest decision: ${digest.latestDecision}`);
  }
  if (digest.priorities.length > 0) {
    lines.push(isKO ? `  우선순위: ${digest.priorities.join(', ')}` : `  Priorities: ${digest.priorities.join(', ')}`);
  }
  if (digest.rejections.length > 0) {
    lines.push(isKO ? `  거절: ${digest.rejections.join(', ')}` : `  Rejected: ${digest.rejections.join(', ')}`);
  }

  let result = lines.join('\n');
  if (result.length > cap) result = result.slice(0, cap - 3) + '...';
  return result;
}

// ============================================================
// ai-signature-scan — AI 시그니처/양념 검출 (창작 지침 05_집필 baseline 108 축약)
// 순수 함수. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// AI가 흔히 남기는 4종 패턴(hedging/formulaic/tell/generic)을 한국어 정규식으로 탐지.
// score 0~100 — 낮을수록 인간적(시그니처 적음), 높을수록 AI 양념 과다.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 + 패턴 카탈로그
// ============================================================

/** 검출 패턴 분류 */
export type SignatureKind = 'hedging' | 'formulaic' | 'tell' | 'generic';

/** 단일 패턴 적중 결과 */
export interface SignatureHit {
  /** 적중한 패턴 식별자(라벨) */
  pattern: string;
  /** 분류 */
  kind: SignatureKind;
  /** 본문 내 적중 횟수(1 이상) */
  count: number;
}

/** scanAISignature 반환 */
export interface SignatureScanResult {
  /** 적중한 패턴 목록(count 내림차순) */
  hits: SignatureHit[];
  /** 0~100 — 낮을수록 인간적 */
  score: number;
}

/** 패턴 카탈로그 항목(라벨/분류/정규식) */
interface PatternEntry {
  pattern: string;
  kind: SignatureKind;
  regex: RegExp;
}

// 한국어 정규식 카탈로그.
// 주의: 각 정규식은 호출 시점에 lastIndex 영향을 피하려 매 스캔마다 새 RegExp 생성(아래 countMatches).
// 여기서는 source/flags 만 보관용으로 정의한다.
const PATTERN_CATALOG: readonly PatternEntry[] = [
  // hedging — 모호한 회피/추측 어미
  { pattern: '~인 듯', kind: 'hedging', regex: /인\s*듯/g },
  { pattern: '~같았다', kind: 'hedging', regex: /같았다/g },
  { pattern: '~듯했다', kind: 'hedging', regex: /듯했다/g },
  // formulaic — AI 상투 구문 틀
  { pattern: '단순한 .* 아니다', kind: 'formulaic', regex: /단순한\s+\S[^.!?\n]*?\s*아니[었]?다/g },
  // 'A 아니라 B' — 조사(가/이/은/는/도/만 등) 변이를 허용해 실제 한국어 문장 포착
  { pattern: 'A가 아니라 B', kind: 'formulaic', regex: /\S*[가이은는도만을를]?\s*아니라\s+\S+/g },
  // tell — 감정/사고 직접 서술(보여주기 결여)
  { pattern: '느꼈다', kind: 'tell', regex: /느꼈다/g },
  { pattern: '생각했다', kind: 'tell', regex: /생각했다/g },
  // generic — 무미건조한 종결 상투구
  { pattern: '것이었다', kind: 'generic', regex: /것이었다/g },
  { pattern: '뿐이었다', kind: 'generic', regex: /뿐이었다/g },
] as const;

// ============================================================
// PART 2 — 카운팅 유틸 + 점수 계산
// ============================================================

/** 단일 정규식의 본문 내 적중 횟수. 입력/정규식 방어 후 안전 카운트. */
function countMatches(text: string, source: string, flags: string): number {
  if (!text) return 0;
  // 매 호출마다 새 RegExp 생성 → 전역 lastIndex 상태 오염 방지(경계 안전)
  const re = new RegExp(source, flags.includes('g') ? flags : flags + 'g');
  const matched = text.match(re);
  return matched ? matched.length : 0;
}

/**
 * 적중 밀도 → 0~100 점수.
 * 분모는 "문장 수 근사"(종결부호 + 줄바꿈). 0분모 방어로 최소 1 보장.
 * 한 문장당 시그니처 1개를 거칠게 100% 상한 기준으로 환산.
 */
function densityScore(totalHits: number, text: string): number {
  if (totalHits <= 0) return 0;
  const sentenceLike = (text.match(/[.!?。…\n]/g) ?? []).length;
  const denom = sentenceLike > 0 ? sentenceLike : 1; // 0분모 방어
  const ratio = totalHits / denom;
  const score = Math.round(ratio * 100);
  return score > 100 ? 100 : score; // 상한 클램프
}

// ============================================================
// PART 3 — 공개 진입점
// ============================================================

/**
 * 본문에서 AI 시그니처 패턴을 스캔한다.
 * @param text 검사 대상 본문(빈 문자열/공백 안전)
 * @returns hits(적중 패턴, count 내림차순) + score(0~100, 낮을수록 인간적)
 */
export function scanAISignature(text: string): SignatureScanResult {
  // 입력 방어: null/undefined/비문자열 → 빈 결과
  if (typeof text !== 'string' || text.length === 0) {
    return { hits: [], score: 0 };
  }

  const hits: SignatureHit[] = [];
  let totalHits = 0;

  for (const entry of PATTERN_CATALOG) {
    const count = countMatches(text, entry.regex.source, entry.regex.flags);
    if (count > 0) {
      hits.push({ pattern: entry.pattern, kind: entry.kind, count });
      totalHits += count;
    }
  }

  // count 내림차순 정렬(동률은 카탈로그 순서 유지 — 안정 정렬)
  hits.sort((a, b) => b.count - a.count);

  return { hits, score: densityScore(totalHits, text) };
}

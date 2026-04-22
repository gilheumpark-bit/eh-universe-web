/**
 * N-gram Similarity Detector (2026-04-23 신설)
 *
 * 한국어 본문의 **타사 소설 발췌·표절 의심** 탐지.
 * 브랜드 블록리스트는 이름을 잡지만, 이건 **문장 구조 자체가 겹치는** 경우를 잡는다.
 *
 * 전략:
 *   - 한국어 문자 단위 n-gram shingling (영어식 whitespace 토큰화 부적합)
 *   - 정규화: 공백·문장부호 제거, 소문자화 (영문 혼합 대응)
 *   - Jaccard 유사도 계산 — O(min(|A|, |B|))
 *   - 임계(기본 0.3) 초과 시 표절 의심 플래그
 *
 * 사용 시나리오:
 *   1. RAG ingestion 시 — 새 문서 vs 사내 등록 원본 비교 (inside-job 방지)
 *   2. 생성 후 — 작가가 등록한 "비교 원본 코퍼스"(예: 자기가 자주 참고하는
 *      타사 웹소설 발췌본) vs 생성 초안 비교 → 무의식적 표절 탐지
 *   3. 번역 — 원문과 "이전 번역 문장" 간 중복 세그먼트 찾기
 *
 * 한계:
 *   - 패러프레이즈(의미 같고 단어 다름)는 못 잡음 — 그건 임베딩 기반이 필요
 *   - 3-gram 기본은 단문에 민감 — 장편에선 4~5-gram이 낫다
 *   - 공개 웹소설 전수 DB는 없으므로 작가가 **비교 코퍼스를 직접 구성**해야 함
 */

// ============================================================
// PART 1 — Types
// ============================================================

export interface NGramOptions {
  /** shingle 크기 (한국어 3~5 권장, 기본 3) */
  readonly n?: number;
  /** 공백·문장부호 제거 여부 (기본 true) */
  readonly normalize?: boolean;
  /** 최소 유사도 임계 (기본 0.3) */
  readonly threshold?: number;
  /** 비교 텍스트 최대 길이 (ReDoS·과도 메모리 방어) */
  readonly maxLength?: number;
}

export interface SimilarityMatch {
  /** 비교 대상 원본 식별자 (작가가 등록한 label) */
  readonly referenceId: string;
  /** Jaccard 유사도 0~1 */
  readonly similarity: number;
  /** 겹친 n-gram 개수 */
  readonly overlap: number;
  /** 표절 의심 (similarity >= threshold) */
  readonly suspicious: boolean;
}

export interface ReferenceCorpusEntry {
  /** 고유 ID — 예: 'solo-leveling-ch1', 'other-webnovel-excerpt-42' */
  readonly id: string;
  /** 비교할 원문 텍스트 */
  readonly text: string;
  /** 원저자·출처 (선택) */
  readonly source?: string;
}

// ============================================================
// PART 2 — 정규화 · n-gram
// ============================================================

const DEFAULT_N = 3;
const DEFAULT_THRESHOLD = 0.3;
const DEFAULT_MAX_LENGTH = 100_000;

/**
 * 텍스트 정규화 — 공백·문장부호 제거 + 소문자화.
 * 한국어는 음절 단위 그대로 유지.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // 한글 음절/영문/숫자 제외한 모든 것 제거 (공백·문장부호·개행 등)
    .replace(/[^\uac00-\ud7afa-z0-9]/g, '');
}

/**
 * 문자 단위 n-gram set 생성.
 * 반복되는 shingle은 Set 특성상 자동 중복 제거.
 */
export function buildNGramSet(text: string, n: number = DEFAULT_N): Set<string> {
  const out = new Set<string>();
  if (text.length < n) return out;
  for (let i = 0; i <= text.length - n; i++) {
    out.add(text.slice(i, i + n));
  }
  return out;
}

// ============================================================
// PART 3 — Jaccard 유사도
// ============================================================

/**
 * 두 n-gram set의 Jaccard 유사도.
 *   |A ∩ B| / |A ∪ B|
 * 빈 합집합 시 0 반환.
 */
export function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  // 작은 쪽을 순회해서 교집합 계산 — O(min(|A|, |B|))
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  let intersection = 0;
  for (const gram of smaller) {
    if (larger.has(gram)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 두 raw 텍스트 간 직접 유사도 (n-gram set 빌더 내장).
 */
export function textSimilarity(textA: string, textB: string, options: NGramOptions = {}): number {
  const n = options.n ?? DEFAULT_N;
  const maxLen = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const normalize = options.normalize ?? true;
  const a = normalize ? normalizeText(textA.slice(0, maxLen)) : textA.slice(0, maxLen);
  const b = normalize ? normalizeText(textB.slice(0, maxLen)) : textB.slice(0, maxLen);
  if (!a || !b) return 0;
  return jaccardSimilarity(buildNGramSet(a, n), buildNGramSet(b, n));
}

// ============================================================
// PART 4 — 코퍼스 탐지
// ============================================================

/**
 * 비교 코퍼스 전체를 대상으로 표절 의심 구간을 찾는다.
 * 각 reference 별로 Jaccard 계산 후 threshold 초과 엔트리 반환.
 *
 * 성능:
 *   draft n-gram은 1회 생성 후 모든 reference와 재사용 — O(1 + R) set 연산.
 *   R개 reference × O(min(|draft|, |ref|)) 교집합.
 */
export function detectSimilarPassages(
  draft: string,
  referenceCorpus: readonly ReferenceCorpusEntry[],
  options: NGramOptions = {},
): SimilarityMatch[] {
  const n = options.n ?? DEFAULT_N;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const maxLen = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const normalize = options.normalize ?? true;

  if (!draft || !draft.trim() || referenceCorpus.length === 0) return [];

  const draftNorm = normalize ? normalizeText(draft.slice(0, maxLen)) : draft.slice(0, maxLen);
  if (draftNorm.length < n) return [];
  const draftSet = buildNGramSet(draftNorm, n);
  if (draftSet.size === 0) return [];

  const out: SimilarityMatch[] = [];
  for (const ref of referenceCorpus) {
    if (!ref.text || !ref.text.trim()) continue;
    const refNorm = normalize ? normalizeText(ref.text.slice(0, maxLen)) : ref.text.slice(0, maxLen);
    if (refNorm.length < n) continue;
    const refSet = buildNGramSet(refNorm, n);
    const similarity = jaccardSimilarity(draftSet, refSet);
    if (similarity <= 0) continue;

    // 교집합 크기 재계산 (보고 용)
    let overlap = 0;
    const [smaller, larger] = draftSet.size <= refSet.size ? [draftSet, refSet] : [refSet, draftSet];
    for (const g of smaller) if (larger.has(g)) overlap += 1;

    out.push({
      referenceId: ref.id,
      similarity,
      overlap,
      suspicious: similarity >= threshold,
    });
  }

  // 유사도 내림차순
  out.sort((x, y) => y.similarity - x.similarity);
  return out;
}

/**
 * 의심만 필터링해서 반환 — 빠른 UI 배지용.
 */
export function detectSuspiciousPassages(
  draft: string,
  referenceCorpus: readonly ReferenceCorpusEntry[],
  options: NGramOptions = {},
): SimilarityMatch[] {
  return detectSimilarPassages(draft, referenceCorpus, options).filter(m => m.suspicious);
}

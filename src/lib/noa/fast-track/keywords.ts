// ============================================================
// NOA Fast Track — Keyword Lists
// Source: NOA v42.6 Final (Aux Scout/Guard)
// ============================================================

/**
 * 안전 인사말 — 정확히 일치하면 Fast Track PASS (0ms 통과)
 */
export const SAFE_GREETINGS: readonly string[] = [
  "안녕하세요",
  "반갑습니다",
  "감사합니다",
  "네, 알겠습니다",
  "네 알겠습니다",
  "네. 알겠습니다",
  "hello",
  "hi",
  "thanks",
  "thank you",
  "yes",
  "ok",
] as const;

/**
 * 즉시 차단 키워드 — 포함 시 Fast Track BLOCK
 * (v42.6 Aux Guard hard keywords)
 */
export const HARD_BLOCK_KEYWORDS: readonly string[] = [
  "살상",
  "학살",
  "테러",
  "폭발",
  "파괴",
  "자살",
  "마약",
] as const;

/**
 * 감시 키워드 — 포함 시 Fast Track ESCALATE → Trinity 검사
 * (v42.6 Aux Scout soft keywords)
 */
export const SOFT_WATCH_KEYWORDS: readonly string[] = [
  "공격",
  "해킹",
  "조작",
  "우회",
  "몰래",
  "비밀",
  "침투",
  "무기",
  "백도어",
  "뒷문",
  "익명",
] as const;

/**
 * prism-rejection-detector.ts (2026-05-10 신설 — M-05)
 *
 * LLM 이 PRISM 가드로 인해 콘텐츠 생성을 거절한 경우 패턴 감지 + 사용자 친화 안내.
 *
 * 배경:
 *   - PRISM all-ages / teen-15 / mature-18 가드는 LLM 에 강제됨
 *   - LLM 이 거절 시 "I cannot generate..." / "申し訳..." 같은 메타 응답 반환
 *   - 사용자에게 raw LLM 거절 메시지 그대로 노출하면 UX ↓
 *   - "이 콘텐츠는 PRISM XX+ 등급. Settings 에서 변경 후 재시도" 친화 안내 필요
 *
 * 4언어 거절 패턴 + 친화 메시지 매트릭스.
 *
 * [C] 안전성: false positive 회피 (정상 응답을 거절로 오인 X)
 * [G] 성능: 짧은 정규식 set
 * [K] 간결성: detector + suggestion 헬퍼 2개
 */

import type { PrismLevel } from './safety-registry';

// ============================================================
// PART 1 — 거절 감지 패턴 (4언어)
// ============================================================

/**
 * LLM 거절 시그너처 — 응답 시작 부분에 자주 나타나는 패턴.
 *
 * [M-05 / G-test-2 보강 — 2026-05-10]
 * regex (영어) + 문자열 prefix (CJK) 혼합 — CJK regex 의 source mojibake 우회.
 */

/** 영어 거절 정규식 (case-insensitive). */
const REJECTION_REGEXES_EN = [
  /^\s*I cannot\b/i,
  /^\s*I can't\b/i,
  /^\s*I'm unable to\b/i,
  /^\s*I will not\b/i,
  /^\s*I won't\b/i,
  /^\s*I refuse to\b/i,
  /^\s*I'm sorry,?\s+but I (cannot|can't|won't)/i,
  /^\s*Sorry,?\s+(but )?I (cannot|can't)/i,
  /^\s*As an AI\b/i,
  /^\s*As a language model\b/i,
  /^\s*This content (is|would be) (inappropriate|harmful|against)/i,
];

/**
 * CJK 거절 prefix list — head.includes 로 검사.
 * 보수적: 정상 본문에 자연 등장 가능성 ↓ 한 phrase 만.
 */
const REJECTION_PREFIXES_CJK: readonly string[] = [
  // Korean
  '죄송하지만',
  '죄송합니다, 하지만',
  '죄송합니다만',
  '이러한 콘텐츠를 생성할 수 없',
  '이러한 내용을 생성할 수 없',
  '해당 요청은',
  '저는 AI',
  '저는 인공지능',
  // Japanese
  '申し訳ありません',
  '申し訳ございません',
  'お詫び申し上げ',
  'このコンテンツは生成',
  'そのような要求',
  // Chinese
  '对不起',
  '抱歉',
  '很抱歉',
  '非常抱歉',
  '不好意思',
  '作为AI',
  '作为 AI',
  '作为一个AI',
  '作为语言模型',
  '作为 语言模型',
  '作为一个语言模型',
  '这种内容无法',
  '此类内容无法',
];

/**
 * 응답이 LLM 거절 메시지인지 감지.
 * 응답 시작 부분 200자 이내에 거절 패턴 존재 시 true.
 *
 * 검사:
 *   1) 영어 regex (alternation 으로 단어 경계 보장)
 *   2) CJK prefix string includes (mojibake 회피)
 *
 * 보수적: 본문 안에 정상 인용 등으로 들어간 패턴은 false (시작 부분만 검사).
 */
export function isPrismRejection(response: string): boolean {
  if (!response || response.length === 0) return false;
  const head = response.slice(0, 200).trimStart();
  // 영어 정규식
  for (const re of REJECTION_REGEXES_EN) {
    if (re.test(head)) return true;
  }
  // CJK prefix 검사 — head 가 prefix 로 시작하는지
  for (const prefix of REJECTION_PREFIXES_CJK) {
    if (head.startsWith(prefix)) return true;
  }
  return false;
}

// ============================================================
// PART 2 — 사용자 친화 안내 메시지
// ============================================================

const SUGGESTION_LABELS: Record<PrismLevel | 'unknown', Record<'ko' | 'en' | 'ja' | 'zh', string>> = {
  'all-ages': {
    ko: '이 콘텐츠는 [전체이용가] 등급에 부적합한 표현이 포함됩니다. 표현을 순화하거나 PRISM 등급을 변경하세요.',
    en: 'This content includes expressions inappropriate for [All Ages]. Soften the expressions or change the PRISM level.',
    ja: 'このコンテンツは [全年齢] 等級に不適切な表現を含みます。表現を和らげるか、PRISM 等級を変更してください。',
    zh: '此内容包含 [全年龄] 等级不适宜的表达。请软化表达或更改 PRISM 等级。',
  },
  'teen-15': {
    ko: '이 콘텐츠는 [청소년이용가 15+] 등급을 초과하는 표현이 포함됩니다. 표현을 조정하거나 등급을 [성인 18+] 으로 변경하세요.',
    en: 'This content exceeds [Teen 15+] level. Adjust expressions or upgrade to [Mature 18+].',
    ja: 'このコンテンツは [青少年向け 15+] 等級を超える表現を含みます。表現を調整するか、[成人向け 18+] に変更してください。',
    zh: '此内容超出 [青少年 15+] 等级。请调整表达或升级至 [成人 18+]。',
  },
  'mature-18': {
    ko: '이 표현은 AI 모델 정책상 생성 불가합니다 (실제 위해·불법 콘텐츠 등). 다른 표현을 시도하세요.',
    en: 'This expression cannot be generated due to AI model policy (actual harm/illegal content). Try a different expression.',
    ja: 'この表現は AI モデルポリシー上生成できません (実害・違法コンテンツ等)。別の表現を試してください。',
    zh: '此表达因 AI 模型政策无法生成 (实际危害/违法内容等)。请尝试其他表达。',
  },
  'unknown': {
    ko: '요청한 표현을 처리하지 못했습니다. 표현을 조정하거나 PRISM 등급 설정을 확인해 주세요.',
    en: 'AI declined to generate. Adjust expressions or review PRISM level settings.',
    ja: 'AI が生成を拒否しました。表現を調整するか、PRISM 等級設定を確認してください。',
    zh: 'AI 拒绝生成。请调整表达或检查 PRISM 等级设置。',
  },
};

/**
 * PRISM 거절 발생 시 사용자에게 표시할 친화 메시지.
 * level 미지정 시 'unknown' fallback (일반 안내).
 */
export function getPrismRejectionSuggestion(
  level: PrismLevel | undefined,
  language: 'ko' | 'en' | 'ja' | 'zh' = 'ko',
): string {
  const key = level ?? 'unknown';
  return SUGGESTION_LABELS[key][language];
}

/**
 * 통합 진입점 — LLM 응답을 받아 거절이면 친화 메시지 반환, 아니면 null.
 *
 * 사용:
 *   const friendlyMsg = checkAndExplainRejection(rawResponse, currentPrismLevel, lang);
 *   if (friendlyMsg) {
 *     // 사용자에게 토스트로 표시 + 본문 미적용
 *   }
 */
export function checkAndExplainRejection(
  response: string,
  level: PrismLevel | undefined,
  language: 'ko' | 'en' | 'ja' | 'zh' = 'ko',
): string | null {
  if (!isPrismRejection(response)) return null;
  return getPrismRejectionSuggestion(level, language);
}

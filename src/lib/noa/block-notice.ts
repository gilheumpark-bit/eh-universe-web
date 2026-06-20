/**
 * block-notice.ts (2026-06-11 신설 — N4 고지 의무·사일런트 차단 금지)
 *
 * 차단 응답 {blocked: true, reason, gradeRequired} 수신 시 클라이언트 고지 단일 진입점.
 *
 * 고지 2채널 (둘 다 발화 — 표면별 수신처가 다름):
 *   1) noa:toast (error)        → loreguard ToastHost (LoreguardStudio 마운트)
 *   2) noa:block-notice         → NoaBlockNoticeCard (StudioShell 마운트 — 인라인 안내 카드)
 *
 * + 차단 사실을 audit-report 체인(block-policy.recordPolicyAudit)에 기록.
 *
 * 사용 패턴:
 *   const msg = checkBlockedJson(json, 'plot-ai');
 *   if (msg) throw new NoaBlockedError(msg, payload, 'plot-ai');
 *
 * [C] 안전성: window 부재(서버/테스트) 시 이벤트 발화 silent skip — throw 경로는 유지
 * [K] 간결성: 에러 1 + 발화 1 + 식별 1
 */

import {
  isBlockedPayload,
  getBlockNoticeMessage,
  normalizePrismGrade,
  recordPolicyAudit,
  type BlockedResponsePayload,
  type NoticeLanguage,
} from './block-policy';

export type { BlockedResponsePayload } from './block-policy';
export { isBlockedPayload } from './block-policy';

// ============================================================
// PART 1 — 차단 에러 (호출 측이 인라인 표시에 사용)
// ============================================================

/** NOA 정책 차단 — message 는 사용자 표시용 고지 문장. */
export class NoaBlockedError extends Error {
  readonly payload: BlockedResponsePayload;
  readonly surface: string;
  constructor(message: string, payload: BlockedResponsePayload, surface: string) {
    super(message);
    this.name = 'NoaBlockedError';
    this.payload = payload;
    this.surface = surface;
  }
}

// ============================================================
// PART 2 — 고지 발화 (toast + 인라인 카드 이벤트 + audit)
// ============================================================

/** noa:block-notice CustomEvent detail 계약. */
export interface BlockNoticeDetail {
  /** 사용자 표시 고지 문장. */
  message: string;
  gradeRequired: BlockedResponsePayload['gradeRequired'];
  /** 발생 표면 식별자 (예: 'chat' | 'inline-complete' | 'plot-ai'). */
  surface: string;
}

// 연속 차단 시 동일 메시지 중복 고지 방지 (3초 dedup — PrismRejectionToast 와 동일 정책)
let lastNoticeMessage = '';
let lastNoticeAt = 0;

/**
 * 차단 고지 발화 — 사일런트 차단 절대 금지의 실행부.
 * 반환값: 사용자 표시 메시지 (호출 측 인라인 표시에 재사용).
 */
export function notifyNoaBlock(
  payload: BlockedResponsePayload,
  surface: string,
  language: NoticeLanguage = 'ko',
): string {
  // 서버 reason 우선 (N2 계약상 사용자 언어 문장) — 없으면 정책 메시지로 생성
  // gradeRequired 는 양 namespace ('all-ages'… / 'ALL'…) → PrismLevel 정규화
  const message = payload.reason?.trim()
    ? payload.reason
    : getBlockNoticeMessage(undefined, normalizePrismGrade(payload.gradeRequired), language);

  // 차단 사실 audit 기록 (고지와 별개 — 대시보드/보고서용)
  recordPolicyAudit('BLOCK', { surface });

  if (typeof window !== 'undefined') {
    const now = Date.now();
    const isDup = message === lastNoticeMessage && now - lastNoticeAt < 3000;
    lastNoticeMessage = message;
    lastNoticeAt = now;
    if (!isDup) {
      // 채널 1: loreguard ToastHost (noa:toast 계약 — { message, variant })
      window.dispatchEvent(new CustomEvent('noa:toast', {
        detail: { message, variant: 'error' },
      }));
      // 채널 2: 인라인 안내 카드 (NoaBlockNoticeCard — StudioShell)
      window.dispatchEvent(new CustomEvent<BlockNoticeDetail>('noa:block-notice', {
        detail: { message, gradeRequired: payload.gradeRequired, surface },
      }));
    }
  }
  return message;
}

// ============================================================
// PART 3 — 응답 식별 헬퍼 (fetch 호출 측 1줄 통합용)
// ============================================================

/**
 * 임의 JSON 응답이 차단 계약이면 고지 발화 후 메시지 반환, 아니면 null.
 *
 *   const blockedMsg = checkBlockedJson(data, 'direction-ai');
 *   if (blockedMsg) throw new Error(blockedMsg); // 표면의 기존 에러 UI 가 인라인 표시
 */
export function checkBlockedJson(
  json: unknown,
  surface: string,
  language: NoticeLanguage = 'ko',
): string | null {
  if (!isBlockedPayload(json)) return null;
  return notifyNoaBlock(json, surface, language);
}

// ============================================================
// PART 4 — 레거시 403 차단 식별 (/api/chat 직접 호출 표면용)
// ============================================================

/**
 * 레거시 403 본문 { error, noa: { reason } } 의 내부 코드 → 사용자 언어 문구.
 * 내부 코드(TRINITY_BLOCK 등)는 사용자에게 절대 그대로 노출하지 않는다.
 */
const LEGACY_REASON_TEXT: Record<NoticeLanguage, {
  fastTrack: string; trinity: string; budget: string; generic: string;
}> = {
  ko: {
    fastTrack: '입력에 제한된 표현이 포함되어 생성을 중단했습니다. 내용을 수정한 뒤 다시 시도해 주세요.',
    trinity: '안전 검사에서 차단되어 생성을 중단했습니다. 표현을 바꿔 다시 시도해 주세요.',
    budget: '일일 사용 한도에 도달해 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    generic: '안전 정책에 따라 이 요청을 처리할 수 없습니다. 표현을 바꿔 다시 시도해 주세요.',
  },
  en: {
    fastTrack: 'Generation was stopped because the input contains restricted expressions. Please revise and try again.',
    trinity: 'Generation was stopped by the safety check. Please rephrase and try again.',
    budget: 'The daily usage limit has been reached. Please try again later.',
    generic: 'This request cannot be processed under the safety policy. Please rephrase and try again.',
  },
  ja: {
    fastTrack: '入力に制限された表現が含まれているため、生成を中断しました。内容を修正して再試行してください。',
    trinity: '安全検査により生成を中断しました。表現を変えて再試行してください。',
    budget: '1日の利用上限に達したため、リクエストを処理できません。しばらくしてから再試行してください。',
    generic: '安全ポリシーにより、このリクエストは処理できません。表現を変えて再試行してください。',
  },
  zh: {
    fastTrack: '输入中包含受限表达，已中止生成。请修改内容后重试。',
    trinity: '安全检查已中止生成。请调整表达后重试。',
    budget: '已达到每日使用上限，无法处理请求。请稍后重试。',
    generic: '根据安全政策，无法处理此请求。请调整表达后重试。',
  },
};

/**
 * 레거시 403 NOA 차단 (/api/chat — HTTP 403 + { error, noa:{reason} }) 식별 + 고지.
 * 차단이면 notifyNoaBlock 발화(toast + 카드 + audit) 후 사용자 문구 반환, 아니면 null.
 *
 *   const blockedMsg = checkBlockedLegacy403(errData, 'style-studio', 'ko');
 *   if (blockedMsg) setInlineError(blockedMsg); // 내부 코드 비노출 — 사일런트 차단 금지
 */
export function checkBlockedLegacy403(
  errBody: unknown,
  surface: string,
  language: NoticeLanguage = 'ko',
): string | null {
  if (!errBody || typeof errBody !== 'object') return null;
  const noa = (errBody as { noa?: unknown }).noa;
  if (!noa || typeof noa !== 'object') return null;
  const reason = (noa as { reason?: unknown }).reason;
  if (typeof reason !== 'string' || reason.length === 0) return null;
  const t = LEGACY_REASON_TEXT[language];
  const message =
    reason === 'FAST_TRACK_BLOCK' ? t.fastTrack
    : reason === 'TRINITY_BLOCK' ? t.trinity
    : reason === 'BUDGET_EXCEEDED' ? t.budget
    : t.generic;
  notifyNoaBlock({ blocked: true, reason: message, gradeRequired: null }, surface, language);
  return message;
}

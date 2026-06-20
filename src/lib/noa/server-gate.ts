// ============================================================
// PART 0 — NOA Server Gate (N2: 전 AI 경로 서버 단일 게이트)
// ============================================================
// 모든 서버 AI 경로(/api/chat, /api/complete, /api/structured-generate)가
// 공유하는 단일 게이트:
//   ① 입력 판정 — runNoa (PRISM 등급 연동 차등: grade → domain 가중)
//   ② 출력 IP 필터 — filterTrademarks (상표/IP 자동 치환)
//
// 차단 응답 계약 (N4 클라이언트 고지 UI 와 공유):
//   HTTP 200 + { blocked: true, reason, gradeRequired }
//   - reason 은 사용자 언어 문구만. 내부 판정 상세(grade label·tactical path·
//     risk score)는 절대 노출하지 않는다 (auditId 는 불투명 해시 — 노출 OK).
//   - 사일런트 차단 금지: blocked=true 를 받은 클라이언트는 반드시 고지 UI 표시.
//
// 장애 정책 (fail-open — 의도된 결정):
//   - 콘텐츠 게이트(runNoa) 자체 장애 → fail-open (가용성 우선) + error 로깅.
//     게이트 버그가 전 AI 기능을 죽이는 것보다 통과가 낫다.
//   - IP 필터(filterTrademarks) 장애 → fail-open (원문 그대로 반환) + error 로깅.
//     필터 실패가 생성 차단보다 낫다.
//   ※ fail-open 은 "게이트 코드가 throw 한 경우"에만 적용. 게이트가 정상 작동해
//     BLOCK 판정을 내린 경우는 당연히 차단된다.
//
// 성능: 게이트 1회 호출당 apiLog 1줄 (event: 'noa_gate', durationMs) — 지연 측정용.
// ============================================================

import { runNoa } from './index';
import type { DomainType, SourceTier } from './types';
import {
  decideFromNoaResult,
  buildBlockedPayload,
  normalizePrismGrade,
  recordPolicyAudit,
  type NoticeLanguage,
} from './block-policy';
import type { PrismLevel } from '@/lib/ai/safety-registry';
import { filterTrademarks, type TrademarkMatch } from '@/engine/validator';
import { apiLog } from '@/lib/api-logger';

// ============================================================
// PART 1 — Types & contract
// ============================================================

/** PRISM 등급 키 (chat route 의 prismMode 와 동일 namespace) */
export type PrismGradeKey = 'ALL' | 'T15' | 'M18';

export interface ApplyNoaGateParams {
  /** 입력 판정 대상 (사용자 prompt). 비우면 입력 판정 생략. */
  prompt?: string;
  /** 출력 IP 필터 대상 (AI 산출 텍스트). 비우면 필터 생략. */
  output?: string;
  /** PRISM 등급 ('ALL'|'T15'|'M18') — 차등 판정 (ALL 이 가장 엄격). */
  grade?: string;
  /** 명시 도메인 — 지정 시 grade 매핑보다 우선. */
  domain?: DomainType;
  /** NOA 소스 신뢰 등급 (1=BYOK/Pro 완화, 2=호스팅 표준). 기본 2. */
  sourceTier?: SourceTier;
  /**
   * [특허 청구 1·8·효과 29 — 멀티턴 누적 맥락] 직전 사용자 발화 이력 (과거→최신).
   * additive 옵션 — 미전달 시 단일 입력 판정 (기존 동작과 완전 동일, 회귀 0).
   * 맥락은 위험도 가산 전용 (max(single, contextual) — runNoa 내장 보장).
   */
  conversationHistory?: readonly string[];
  /** 로그용 라우트 식별자 (예: '/api/complete'). */
  route?: string;
  /** 차단 사유 언어. 'en'/'EN' 계열 → 영어, 그 외 → 한국어. */
  language?: string;
  /** 로그용 요청 메타 (선택). */
  ip?: string;
  requestId?: string;
}

export interface NoaGateBlocked {
  blocked: true;
  /** 사용자 언어 사유 — 내부 판정 상세 비노출 */
  reason: string;
  /** 이 내용이 통과될 수 있는 최소 PRISM 등급 힌트 (전 등급 차단이면 null) */
  gradeRequired: PrismGradeKey | null;
  /** 불투명 감사 ID (지원 문의 참조용) */
  auditId?: string;
  gateMs: number;
}

export interface NoaGatePassed {
  blocked: false;
  /** output 전달 시: IP 필터 적용된 출력. 미전달 시 undefined. */
  output?: string;
  /** 출력에서 검출·치환된 상표/IP 매치 */
  ipMatches: TrademarkMatch[];
  gateMs: number;
}

export type NoaGateResult = NoaGateBlocked | NoaGatePassed;

// ============================================================
// PART 2 — Grade ↔ domain mapping (PRISM 등급 연동 차등)
// ============================================================

/**
 * PRISM 등급 → NOA 도메인 가중.
 * ALL(전체가) = education (최엄격) / T15 = general / M18 = creative (최완화).
 * /api/chat 의 기존 매핑(route.ts PART 6)과 의미 정합.
 */
function gradeToDomain(grade?: string): DomainType {
  if (grade === 'ALL') return 'education';
  if (grade === 'T15') return 'general';
  if (grade === 'M18') return 'creative';
  return 'general';
}

/**
 * 등급 미전달 시 도메인 → 매트릭스 작품 등급 열 (gradeToDomain 의 역방향 — 의미 정합).
 * creative 기본 라우트(/api/complete 등)가 매트릭스 도입으로 엄격해지지 않게 보존.
 */
function domainToWorkGrade(domain: DomainType): PrismLevel {
  if (domain === 'education') return 'all-ages';
  if (domain === 'creative') return 'mature-18';
  return 'teen-15';
}

/** PrismLevel → 게이트 응답 namespace ('ALL'|'T15'|'M18'). */
const LEVEL_TO_GRADE_KEY: Record<PrismLevel, PrismGradeKey> = {
  'all-ages': 'ALL',
  'teen-15': 'T15',
  'mature-18': 'M18',
};

/** 게이트 language(자유 문자열) → 고지 4언어 정규화 (기본 ko). */
function toNoticeLanguage(language?: string): NoticeLanguage {
  const l = (language ?? '').toLowerCase();
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('ja')) return 'ja';
  if (l.startsWith('zh')) return 'zh';
  return 'ko';
}

function blockReason(language: string | undefined, gradeRequired: PrismGradeKey | null): string {
  const en = (language ?? '').toLowerCase().startsWith('en');
  if (gradeRequired) {
    return en
      ? 'This request cannot be processed at the current content rating. Please review your rating settings.'
      : '현재 관람 등급에서는 처리할 수 없는 내용입니다. 등급 설정을 확인해 주세요.';
  }
  return en
    ? 'This request was blocked by the safety policy. Please rephrase and try again.'
    : '안전 정책에 따라 이 요청을 처리할 수 없습니다. 표현을 바꿔 다시 시도해 주세요.';
}

// ============================================================
// PART 3 — Output IP filter helpers (fail-open)
// ============================================================

/**
 * 출력 텍스트 IP 필터. 필터 자체가 throw 하면 fail-open (원문 반환 + 로깅)
 * — 필터 실패가 생성 차단보다 낫다.
 */
export function filterOutputIp(output: string, route = 'noa-gate'): { output: string; matches: TrademarkMatch[] } {
  try {
    const { filtered, matches } = filterTrademarks(output);
    return { output: matches.length > 0 ? filtered : output, matches };
  } catch (err) {
    apiLog({
      level: 'error', event: 'noa_ip_filter_error', route,
      error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
    });
    return { output, matches: [] }; // fail-open
  }
}

/**
 * 구조화(JSON) 출력 IP 필터 — stringify → 필터 → re-parse.
 * re-parse 실패(치환이 JSON 을 깨는 경우) 시 fail-open (원본 반환 + 로깅).
 */
export function filterJsonIp<T>(value: T, route = 'noa-gate'): { value: T; matches: TrademarkMatch[] } {
  try {
    const raw = JSON.stringify(value);
    const { filtered, matches } = filterTrademarks(raw);
    if (matches.length === 0) return { value, matches };
    try {
      return { value: JSON.parse(filtered) as T, matches };
    } catch {
      // 치환이 JSON 구조를 깨뜨림 → fail-open: 필터 미적용 원본 + 검출 사실만 로깅
      apiLog({ level: 'warn', event: 'noa_ip_filter_json_unparseable', route, meta: { matches: matches.length } });
      return { value, matches };
    }
  } catch (err) {
    apiLog({
      level: 'error', event: 'noa_ip_filter_error', route,
      error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
    });
    return { value, matches: [] }; // fail-open
  }
}

// ============================================================
// PART 4 — applyNoaGate (단일 진입점)
// ============================================================

/**
 * 전 AI 경로 공통 게이트.
 * - prompt 전달 시: runNoa 입력 판정 (BLOCK → blocked 계약 반환)
 * - output 전달 시: filterTrademarks 출력 IP 필터
 * - 둘 다 전달 시: 판정 통과 후 필터까지 한 번에.
 */
export async function applyNoaGate(params: ApplyNoaGateParams): Promise<NoaGateResult> {
  const t0 = performance.now();
  const route = params.route ?? 'noa-gate';

  // ── ① 입력 판정 (runNoa) + 차등 차단 (N4 — BLOCK_POLICY_MATRIX 단일 소스) ──
  if (params.prompt && params.prompt.trim().length > 0) {
    try {
      const domain = params.domain ?? gradeToDomain(params.grade);
      const noaResult = await runNoa({
        text: params.prompt,
        domain,
        sourceTier: params.sourceTier ?? 2,
        // [특허 청구 1·8 — 멀티턴 맥락 결선] 미전달 시 undefined → runNoa 기존 경로 (회귀 0)
        conversationHistory: params.conversationHistory,
      });

      // 작품 등급 열: 명시 grade 우선 — 미전달 시 도메인 의미 정합 열 (creative=M18 완화 보존)
      const workGrade = normalizePrismGrade(params.grade) ?? domainToWorkGrade(domain);
      // 매트릭스 판정 (decideFromNoaResult) — NOA 하드 차단(allowed=false)은 완화 불가 내장
      const policy = decideFromNoaResult(noaResult, workGrade);

      if (policy.decision === 'BLOCK') {
        const gradeRequired = policy.gradeRequired ? LEVEL_TO_GRADE_KEY[policy.gradeRequired] : null;
        // 하드 차단(fast-track/tactical/예산 — allowed=false)은 안전 정책 문구,
        // 매트릭스 차단(작품 등급 초과)은 등급 고지 문구 (해결 경로 포함) — 내부 상세 비노출 동일
        const reason = !noaResult.allowed
          ? blockReason(params.language, gradeRequired)
          : buildBlockedPayload(workGrade, policy.gradeRequired, toNoticeLanguage(params.language)).reason;
        const gateMs = Math.round(performance.now() - t0);
        apiLog({
          level: 'warn', event: 'noa_gate', route, ip: params.ip, requestId: params.requestId,
          durationMs: gateMs,
          meta: {
            blocked: true, reason: noaResult.tactical.reason, auditId: noaResult.auditEntry.id,
            policy: 'BLOCK', noaGrade: noaResult.judgment?.grade.level, workGrade,
          },
        });
        return {
          blocked: true,
          reason, // 사용자 언어 — 내부 상세 비노출
          gradeRequired,
          auditId: noaResult.auditEntry.id,
          gateMs,
        };
      }

      if (policy.decision === 'AUDIT_ONLY') {
        // 등급 경계 — 통과 + 주의 기록만 (사용자 방해 0). 서버측 기록 = apiLog,
        // recordPolicyAudit 는 클라 체인용 (window 부재 시 내부 no-op — 계약 유지 호출)
        recordPolicyAudit('AUDIT_ONLY', {
          workGrade, noaGrade: noaResult.judgment?.grade.level, surface: route,
          inputPreview: params.prompt,
        });
        apiLog({
          level: 'info', event: 'noa_policy_audit', route, ip: params.ip, requestId: params.requestId,
          meta: { decision: 'AUDIT_ONLY', noaGrade: noaResult.judgment?.grade.level, workGrade },
        });
      }
    } catch (err) {
      // fail-open: 콘텐츠 게이트 자체 장애는 통과 (가용성 우선) + 에러 로깅
      apiLog({
        level: 'error', event: 'noa_gate_error', route, ip: params.ip, requestId: params.requestId,
        error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
      });
    }
  }

  // ── ② 출력 IP 필터 (filterTrademarks — fail-open 내장) ──
  let filteredOutput: string | undefined;
  let ipMatches: TrademarkMatch[] = [];
  if (typeof params.output === 'string' && params.output.length > 0) {
    const r = filterOutputIp(params.output, route);
    filteredOutput = r.output;
    ipMatches = r.matches;
  }

  const gateMs = Math.round(performance.now() - t0);
  // 게이트 지연 측정 — 서버 로그 1줄(ms)
  apiLog({
    level: 'info', event: 'noa_gate', route, ip: params.ip, requestId: params.requestId,
    durationMs: gateMs, meta: { blocked: false, ipMatches: ipMatches.length },
  });

  return { blocked: false, output: filteredOutput, ipMatches, gateMs };
}

// ============================================================
// PART 5 — Streaming IP audit (SSE 경로용)
// ============================================================

/** SSE 버퍼에서 실제 모델 출력 텍스트만 추출 (OpenAI delta / Gemini candidates 두 형식) */
function extractSseContent(buffer: string): string {
  let content = '';
  for (const line of buffer.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const delta = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content;
      if (delta) content += delta;
      const parts = parsed.candidates?.[0]?.content?.parts;
      if (parts) for (const p of parts) if (p.text) content += p.text;
    } catch { /* 비-JSON data 라인 — 무시 */ }
  }
  return content;
}

/**
 * 스트리밍 출력 IP 검사 wrapper (정직 보고 — 설계 제약):
 *   이미 클라이언트로 흘러간 청크는 소급 수정이 불가능하다. 따라서 스트리밍
 *   경로는 "입력 판정(사전) + 청크 누적 후 완료 시점 검사+고지" 방식을 택한다:
 *   - 청크는 그대로 통과 (스트리밍 안 깨짐)
 *   - flush 시점에 누적 텍스트로 filterTrademarks 검사
 *   - 검출 시: ① apiLog warn 1줄 ② 스트림 말미에 noa ipNotice SSE 이벤트 1개
 *     추가 (delta/candidates 가 없는 라인이므로 기존 파서는 안전하게 무시,
 *     N4 고지 UI 는 이 이벤트로 사후 고지·클라이언트측 재필터 트리거)
 *   IP 필터/검사 장애 시 fail-open (스트림은 이미 전달됨 — 로깅만).
 *
 *   format: 'text' (plain-text 스트림 — translate 등) 의 경우 SSE notice 이벤트를
 *   주입하면 본문이 오염되므로 검출 시 apiLog warn 만 남긴다 (정직 보고 —
 *   plain-text 스트림은 사후 인밴드 고지가 구조적으로 불가능한 설계 제약).
 */
export function wrapStreamWithIpAudit(
  stream: ReadableStream,
  ctx: { route: string; ip?: string; requestId?: string; format?: 'sse' | 'text' },
): ReadableStream {
  const decoder = new TextDecoder();
  let buffer = '';
  return stream.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk); // 청크 즉시 통과 — 스트리밍 유지
      if (chunk instanceof Uint8Array) buffer += decoder.decode(chunk, { stream: true });
    },
    flush(controller) {
      try {
        const content = ctx.format === 'text' ? buffer : (extractSseContent(buffer) || buffer);
        const { matches } = filterTrademarks(content);
        if (matches.length > 0) {
          const terms = [...new Set(matches.map(m => m.original))].slice(0, 10);
          apiLog({
            level: 'warn', event: 'noa_ip_detected_post_stream', route: ctx.route,
            ip: ctx.ip, requestId: ctx.requestId, meta: { count: matches.length, terms },
          });
          // 사후 고지 이벤트 — 기존 SSE 파서(choices/candidates 만 읽음)는 무시.
          // plain-text 스트림(format: 'text')은 주입 시 본문 오염 → 로깅만.
          if (ctx.format !== 'text') {
            controller.enqueue(new TextEncoder().encode(
              `data: ${JSON.stringify({ noa: { ipNotice: { count: matches.length, terms } } })}\n\n`,
            ));
          }
        }
      } catch (err) {
        // fail-open: 검사 장애가 응답을 깨면 안 된다 — 로깅만
        apiLog({
          level: 'error', event: 'noa_ip_audit_error', route: ctx.route,
          ip: ctx.ip, requestId: ctx.requestId,
          error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
        });
      }
    },
  }));
}

// ============================================================
// PART 1 — Overview (M1.7 Sentry Integration — opt-in)
// ============================================================
//
// 저장 실패·다운그레이드·복구 실패 같은 P0/P1 이벤트를 Sentry 에 송신하는
// 얇은 래퍼. 기본 비활성(opt-in) — `NEXT_PUBLIC_SENTRY_ENABLED === 'true'`
// 환경에서만 실제 호출이 발생. 그 외 환경은 완전 no-op.
//
// [원칙 1] 기본 OFF. env 플래그가 명시적 'true' 일 때만 ON.
// [원칙 2] 민감 정보 금지. 프로젝트 원문 절대 전송 X — 해시/메타/카운트만.
// [원칙 3] 관측은 간섭 없이. captureMessage 실패해도 상위에 throw 없음.
// [원칙 4] Sentry SDK 미로드 / 브라우저 외 환경에서도 안전 — typeof 가드.
// [원칙 5] 테스트 주입 가능 — setSentryClientForTests 로 mock 가능.
//
// [C] SSR 가드 + try/catch 2중 + tags/extra 사전 sanitize
// [G] 활성 여부는 모듈 로드 시 1회 계산 — 매 호출마다 env 읽기 회피
// [K] 4 public API — isSentryEnabled / reportStorageEvent / setSentryClientForTests / __resetForTests

import { logger } from '@/lib/logger';
import type { JournalEngineMode } from '@/lib/feature-flags';

// ============================================================
// PART 2 — Types
// ============================================================

/**
 * Sentry 이벤트 계약.
 *
 * - `event`: dot-separated 코드 이름 (e.g. 'storage.primary-failed').
 * - `mode`: 현재 JournalEngineMode — 경로 맥락.
 * - `severity`: Sentry level 매핑.
 * - `details`: 해시/메타만. 원문 금지.
 */
export interface StorageSentryEvent {
  event: string;
  mode: JournalEngineMode;
  severity: 'info' | 'warning' | 'error';
  details: Record<string, unknown>;
}

/** Sentry SDK 의 최소 계약 — 테스트 주입 가능. */
export interface SentryClientLike {
  captureMessage: (
    message: string,
    context?: {
      level?: 'info' | 'warning' | 'error';
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    },
  ) => void;
}

// ============================================================
// PART 3 — Activation check (opt-in)
// ============================================================

/**
 * env 기반 활성 여부 — 명시적 'true' 만 활성.
 * 빌드 타임에 `process.env.NEXT_PUBLIC_SENTRY_ENABLED` 로 주입.
 *
 * [C] SSR/테스트 환경 대응 — env 미정의 시 false.
 */
function computeEnabledFromEnv(): boolean {
  try {
    const val = process.env.NEXT_PUBLIC_SENTRY_ENABLED;
    return val === 'true';
  } catch {
    return false;
  }
}

let envEnabled: boolean = computeEnabledFromEnv();

/**
 * 주입된 테스트 클라이언트. production 에서는 null 로 유지.
 * `setSentryClientForTests` 를 호출하면 `isSentryEnabled()` 도 true 로 간주.
 */
let injectedClient: SentryClientLike | null = null;

/**
 * 현재 활성 여부 — env opt-in 이거나 테스트 주입 시 true.
 * 이 함수 결과가 true 여야만 reportStorageEvent 내부 captureMessage 가 호출.
 */
export function isSentryEnabled(): boolean {
  if (injectedClient !== null) return true;
  return envEnabled;
}

// ============================================================
// PART 4 — Sentry client resolution
// ============================================================

/**
 * 현재 시점에 사용할 SentryClientLike 반환.
 * 우선순위:
 *   1) 테스트 주입 클라이언트
 *   2) 브라우저 window.Sentry (sentry.client.config.ts 가 로드됨)
 *   3) null (활성 X)
 */
function resolveClient(): SentryClientLike | null {
  if (injectedClient) return injectedClient;
  if (!envEnabled) return null;
  try {
    if (typeof window === 'undefined') return null;
    // @ts-expect-error Sentry 는 @sentry/nextjs SDK 가 주입하는 전역.
    const s = window.Sentry as SentryClientLike | undefined;
    if (s && typeof s.captureMessage === 'function') return s;
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// PART 5 — Tag / extra sanitize (민감정보 방어)
// ============================================================

const MAX_TAG_VALUE_LEN = 64;
const MAX_EXTRA_STRING_LEN = 200;
const MAX_EXTRA_KEYS = 20;

/** tag 값은 짧은 enum-style 만 허용. */
function sanitizeTags(d: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  const keys = Object.keys(d).slice(0, MAX_EXTRA_KEYS);
  for (const k of keys) {
    const v = d[k];
    if (typeof v === 'string') {
      out[k] = v.length > MAX_TAG_VALUE_LEN ? v.slice(0, MAX_TAG_VALUE_LEN) : v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = String(v);
    } else if (typeof v === 'boolean') {
      out[k] = v ? 'true' : 'false';
    }
    // 객체/배열은 tag 로 부적합 — skip.
  }
  return out;
}

/** extra 는 중첩 객체를 표지만 남기고 제거. 문자열은 짧게 자름. */
function sanitizeExtra(d: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(d).slice(0, MAX_EXTRA_KEYS);
  for (const k of keys) {
    const v = d[k];
    if (v === null) {
      out[k] = null;
    } else if (typeof v === 'string') {
      if (v.length > 2000) out[k] = '[redacted:too-long]';
      else out[k] = v.length > MAX_EXTRA_STRING_LEN ? v.slice(0, MAX_EXTRA_STRING_LEN) + '…' : v;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v;
    } else if (typeof v === 'boolean') {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `[array:${v.length}]`;
    } else if (typeof v === 'object') {
      out[k] = '[object]';
    } else {
      out[k] = '[other]';
    }
  }
  return out;
}

// ============================================================
// PART 6 — Public API
// ============================================================

/**
 * 저장 관련 이벤트를 Sentry 에 송신.
 *
 * - 비활성 시 완전 no-op — 호출자는 분기 없이 호출 가능.
 * - throw 없음 — 전송 실패는 logger.debug 만 남김.
 * - tag: `{ 'storage.mode', 'storage.outcome' }` 고정 + details 필드 prefix.
 * - extra: sanitized details.
 */
export function reportStorageEvent(event: StorageSentryEvent): void {
  try {
    const client = resolveClient();
    if (!client) return;
    const details = event.details ?? {};

    const baseTags: Record<string, unknown> = {
      'storage.mode': event.mode,
      'storage.event': event.event,
    };
    // details 의 일부는 tag 로도 복제 (검색성).
    if (typeof details.outcome === 'string') baseTags['storage.outcome'] = details.outcome;
    if (typeof details.errorName === 'string') baseTags['storage.error'] = details.errorName;

    const safeTags = sanitizeTags(baseTags);
    const safeExtra = sanitizeExtra(details);

    client.captureMessage(event.event, {
      level: event.severity,
      tags: safeTags,
      extra: safeExtra,
    });
  } catch (err) {
    // 관측 실패가 호출자에게 번지지 않도록 흡수.
    logger.debug('sentry-integration', 'reportStorageEvent failed (isolated)', err);
  }
}

/**
 * 테스트용 client 주입. 주입 즉시 `isSentryEnabled()` = true.
 * production 경로에서는 호출 금지.
 */
export function setSentryClientForTests(client: SentryClientLike | null): void {
  injectedClient = client;
}

// ============================================================
// PART 7 — Test helpers
// ============================================================

export function __resetSentryIntegrationForTests(): void {
  injectedClient = null;
  envEnabled = computeEnabledFromEnv();
}

/** 테스트에서 envEnabled 를 강제 설정. production 금지. */
export function __setEnvEnabledForTests(enabled: boolean): void {
  envEnabled = enabled;
}

// IDENTITY_SEAL: PART-1..7 | role=sentry-integration | inputs=StorageSentryEvent | outputs=void

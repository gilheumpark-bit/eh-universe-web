// ============================================================
// sentry-scrub — PII / secret redactor for Sentry beforeSend
// ============================================================
// 목적: Sentry 업로드 전 API 키 · 이메일 · Bearer 토큰 등 정규식 전수 치환.
// 3 환경 (client / server / edge) 공통 사용.
// ============================================================

// ============================================================
// PART 1 — Redaction patterns
// ============================================================

const PATTERNS: Array<[RegExp, string]> = [
  // OpenAI / Anthropic / Claude-compat sk-
  [/sk-(ant-)?[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]'],
  // Google / Firebase API keys (AIza...)
  [/AIza[A-Za-z0-9_-]{35}/g, '[REDACTED_GOOGLE_KEY]'],
  // Firebase service account private_key JSON 필드
  [/"private_key"\s*:\s*"[^"]+"/g, '"private_key":"[REDACTED]"'],
  // Generic Bearer tokens (헤더·로그 본문 모두)
  [/Bearer\s+[A-Za-z0-9._-]{20,}/g, 'Bearer [REDACTED]'],
  // Email addresses — PII redaction (보수적으로 전량)
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]'],
  // 카드 번호 패턴 (14~19 자리)
  [/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g, '[REDACTED_CARD]'],
];

// 민감 헤더/쿠키 키 전체 치환
const SENSITIVE_KEYS = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|x-firebase-appcheck)$/i;

function scrubString(input: string): string {
  let out = input;
  for (const [re, to] of PATTERNS) out = out.replace(re, to);
  return out;
}

// ============================================================
// PART 2 — Event walker (type-agnostic, fail-safe)
// ============================================================

type Anyish = Record<string, unknown>;

function walk(node: unknown): unknown {
  if (node == null) return node;
  if (typeof node === 'string') return scrubString(node);
  if (Array.isArray(node)) return node.map(walk);
  if (typeof node === 'object') {
    const obj = node as Anyish;
    for (const k of Object.keys(obj)) {
      if (SENSITIVE_KEYS.test(k)) {
        obj[k] = '[REDACTED]';
        continue;
      }
      obj[k] = walk(obj[k]);
    }
    return obj;
  }
  return node;
}

/**
 * Sentry beforeSend 훅 — 업로드 전 PII/secret 전수 치환.
 * 스크러빙 중 예외 발생 시 조용히 원본 반환 (Sentry 자체 장애 방지).
 */
export function scrubSentryEvent<T>(event: T): T {
  try {
    return walk(event) as T;
  } catch {
    return event;
  }
}

// IDENTITY_SEAL: PART-1~2 | role=sentry-pii-scrubber | inputs=event | outputs=scrubbed

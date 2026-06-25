// ============================================================
// Correlation ID — 클라이언트 세션 추적 (claude3 _observability: structured logs + correlation ID)
// 세션당 1 ID(sessionStorage). 요청 헤더 x-correlation-id 로 전파 → 서버 api-logger requestId 와 연결.
// SSR 안전.
// ============================================================

const KEY = 'noa_correlation_id';

function generate(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `cid_${crypto.randomUUID()}`;
  }
  return `cid_${Date.now().toString(36)}_${Math.round(Math.random() * 1e9).toString(36)}`;
}

/** 세션 correlation ID (없으면 생성·영속). SSR 에서는 'server'. */
export function getCorrelationId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = generate();
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'cid_nostore';
  }
}

/** 헤더에 x-correlation-id 부착 */
export function withCorrelationHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return { ...headers, 'x-correlation-id': getCorrelationId() };
}

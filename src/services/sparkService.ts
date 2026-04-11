/**
 * DGX Spark AI Server Client
 * LM Studio 프록시 서버와 통신. 회원당 일 100회 제한 지원.
 */

export const SPARK_SERVER_URL = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_SERVER_URL || '';

/** Spark 서버 사용량 정보 */
export interface SparkUsage {
  count: number;
  limit: number;
  remaining: number;
}

/** Spark 서버 건강 체크 */
export async function checkSparkHealth(): Promise<{ ok: boolean; lmStudio: string }> {
  if (!SPARK_SERVER_URL) return { ok: false, lmStudio: '' };
  try {
    const res = await fetch(`${SPARK_SERVER_URL}/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, lmStudio: '' };
    const data = await res.json();
    return { ok: data.status === 'ok', lmStudio: data.lm_studio || '' };
  } catch {
    return { ok: false, lmStudio: '' };
  }
}

/** 현재 사용자 일일 사용량 조회 */
export async function getSparkUsage(userId?: string): Promise<SparkUsage> {
  if (!SPARK_SERVER_URL) return { count: 0, limit: 100, remaining: 100 };
  try {
    const headers: Record<string, string> = {};
    if (userId) headers['x-user-id'] = userId;
    const res = await fetch(`${SPARK_SERVER_URL}/api/usage`, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { count: 0, limit: 100, remaining: 100 };
    return await res.json();
  } catch {
    return { count: 0, limit: 100, remaining: 100 };
  }
}

/** OpenAI 호환 chat completions (스트리밍) */
export async function streamSparkAI(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  temperature: number,
  opts?: { userId?: string; apiKey?: string; signal?: AbortSignal },
): Promise<ReadableStream> {
  if (!SPARK_SERVER_URL) throw new Error('SPARK_SERVER_URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.userId) headers['x-user-id'] = opts.userId;
  if (opts?.apiKey) headers['authorization'] = `Bearer ${opts.apiKey}`;

  const res = await fetch(`${SPARK_SERVER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    signal: opts?.signal ?? AbortSignal.timeout(180_000),
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature,
      stream: true,
    }),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || '일일 호출 한도 초과 (100회). 내일 초기화됩니다.');
  }

  if (res.status === 401) {
    throw new Error('DGX 서버 인증 실패. API 키를 확인하세요.');
  }

  if (res.status === 503) {
    throw new Error('LM Studio 서버 미실행. DGX에서 LM Studio를 시작하세요.');
  }

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Spark API ${res.status}: ${err.slice(0, 200)}`);
  }

  if (!res.body) throw new Error('Empty response body from Spark Server');
  return res.body;
}

/** 코드 샌드박스 실행 */
export async function executeOnSandbox(
  code: string,
  opts?: { apiKey?: string },
): Promise<{ status: string; output: string; security_check: string; reason?: string }> {
  if (!SPARK_SERVER_URL) throw new Error('SPARK_SERVER_URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.apiKey) headers['authorization'] = `Bearer ${opts.apiKey}`;

  const res = await fetch(`${SPARK_SERVER_URL}/api/sandbox/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Sandbox error ${res.status}`);
  return await res.json();
}

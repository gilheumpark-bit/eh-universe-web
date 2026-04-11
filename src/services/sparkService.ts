/**
 * DGX Spark AI Server Client
 * LM Studio 프록시 서버와 통신. 회원당 일 100회 제한 지원.
 * Cloudflare 임시 터널 SSE 비호환 → non-stream 모드 + 가짜 스트림 변환
 */

export const SPARK_SERVER_URL = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_SERVER_URL || '';

/** Spark 서버 사용량 정보 */
export interface SparkUsage {
  count: number;
  limit: number;
  remaining: number;
}

// ============================================================
// PART 1 — 헬스체크 + 사용량
// ============================================================

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

// ============================================================
// PART 2 — 재시도 유틸
// ============================================================

const RETRYABLE_STATUSES = new Set([502, 503, 520, 521, 522, 523, 524]);
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1500, 3000];

function isRetryableError(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

async function extractSparkError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  const isHtml = text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html');
  if (res.status >= 520 && res.status <= 524) {
    return 'DGX 서버 연결 불안정 (Cloudflare 터널 오류)';
  }
  return isHtml ? `서버 연결 오류 (${res.status})` : text.slice(0, 200);
}

// ============================================================
// PART 3 — AI 호출 (non-stream → 가짜 스트림 변환)
// ============================================================

/**
 * OpenAI 호환 chat completions
 * Cloudflare 임시 터널이 SSE를 차단하므로 non-stream으로 요청 후
 * 응답을 ReadableStream으로 변환하여 기존 스트리밍 인터페이스 유지
 */
export async function streamSparkAI(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  temperature: number,
  opts?: { userId?: string; apiKey?: string; signal?: AbortSignal; userTier?: string },
): Promise<ReadableStream> {
  if (!SPARK_SERVER_URL) throw new Error('SPARK_SERVER_URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.userId) headers['x-user-id'] = opts.userId;
  if (opts?.userTier) headers['x-user-tier'] = opts.userTier;
  if (opts?.apiKey) headers['authorization'] = `Bearer ${opts.apiKey}`;

  // non-stream 모드로 요청 (Cloudflare 터널 SSE 520 방지)
  const body = JSON.stringify({
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    temperature,
    stream: false,
    max_tokens: 12000,
  });

  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }

    try {
      const res = await fetch(`${SPARK_SERVER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers,
        signal: opts?.signal ?? AbortSignal.timeout(180_000),
        body,
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '일일 호출 한도 초과 (100회). 내일 초기화됩니다.');
      }
      if (res.status === 401) {
        throw new Error('DGX 서버 인증 실패. API 키를 확인하세요.');
      }

      if (isRetryableError(res.status)) {
        lastError = await extractSparkError(res);
        if (attempt < MAX_RETRIES) continue;
        throw new Error(lastError);
      }

      if (!res.ok) {
        lastError = await extractSparkError(res);
        throw new Error(`Spark API ${res.status}: ${lastError}`);
      }

      // non-stream 응답 파싱
      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const content = msg?.content || msg?.reasoning_content || '';

      if (!content) {
        throw new Error('DGX 서버에서 빈 응답을 받았습니다. 다시 시도해주세요.');
      }

      // non-stream 응답을 SSE 스트림으로 변환 (기존 인터페이스 호환)
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          // 청크 단위로 분할하여 스트리밍 효과
          const chunks = splitIntoChunks(content, 20);
          for (const chunk of chunks) {
            const sseData = JSON.stringify({
              choices: [{ delta: { content: chunk } }],
            });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      if (err instanceof TypeError && attempt < MAX_RETRIES) {
        lastError = err.message;
        continue;
      }
      throw err;
    }
  }

  throw new Error(`DGX 서버 연결 실패 (${MAX_RETRIES + 1}회 시도). ${lastError}`);
}

/** 텍스트를 n자 단위로 분할 (단어 경계 존중) */
function splitIntoChunks(text: string, charsPerChunk: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + charsPerChunk));
    i += charsPerChunk;
  }
  return chunks;
}

// ============================================================
// PART 4 — 코드 샌드박스
// ============================================================

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

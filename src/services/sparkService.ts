/**
 * DGX Spark AI Server Client
 * vLLM 프록시 서버와 통신. Cloudflare 100초 하드 타임아웃 대응.
 * 전략: 청크 이어쓰기 — max_tokens 4000 단위로 분할 요청, finish_reason=length면 이어서 요청
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
// PART 3 — 단건 non-stream 요청 (90초 이내 응답용)
// ============================================================

async function singleSparkRequest(
  url: string,
  headers: Record<string, string>,
  messages: { role: string; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<{ content: string; finishReason: string }> {
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        signal: signal ?? AbortSignal.timeout(58_000), // 58초 — Vercel 60초 maxDuration 내
        body: JSON.stringify({
          model,
          messages,
          temperature,
          stream: false,
          max_tokens: maxTokens,
        }),
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

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const content = msg?.content || '';
      const finishReason = data.choices?.[0]?.finish_reason || 'stop';

      return { content, finishReason };
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

// ============================================================
// PART 4 — 청크 이어쓰기 AI 호출 (Cloudflare 100초 대응)
// ============================================================

const CHUNK_MAX_TOKENS = 2000; // 청크당 최대 토큰 (50초 이내 완료)
const MAX_CHUNKS = 6; // 최대 6연타 = 12,000 토큰

/**
 * 청크 이어쓰기 방식 AI 호출
 * - 1차: max_tokens=4000으로 요청 (90초 이내 완료)
 * - finish_reason=length면: 이전 내용을 컨텍스트에 넣고 "이어서 써" 2차 요청
 * - 최대 4연타 = 16,000 토큰
 * - 결과를 SSE 스트림으로 변환하여 기존 인터페이스 호환
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

  const url = `${SPARK_SERVER_URL}/v1/chat/completions`;
  const encoder = new TextEncoder();

  // 청크 이어쓰기를 ReadableStream으로 감싸서 실시간 전달
  return new ReadableStream({
    async start(controller) {
      try {
        let fullContent = '';
        const chatMessages = [{ role: 'system', content: system }, ...messages];

        for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
          const currentMessages = chunk === 0
            ? chatMessages
            : [
                ...chatMessages,
                { role: 'assistant', content: fullContent },
                { role: 'user', content: '이어서 계속 작성해주세요. 앞의 내용에 자연스럽게 이어서 쓰세요.' },
              ];

          const result = await singleSparkRequest(
            url, headers, currentMessages, model, temperature, CHUNK_MAX_TOKENS, opts?.signal,
          );

          if (!result.content && chunk === 0) {
            throw new Error('DGX 서버에서 빈 응답을 받았습니다.');
          }

          // 청크 결과를 즉시 SSE로 전달 (실시간 느낌)
          if (result.content) {
            const pieces = splitIntoChunks(result.content, 30);
            for (const piece of pieces) {
              const sseData = JSON.stringify({ choices: [{ delta: { content: piece } }] });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
            }
            fullContent += result.content;
          }

          // finish_reason이 stop이면 완료
          if (result.finishReason !== 'length') break;

          // 이어쓰기 간 짧은 딜레이 (vLLM 캐시 활용)
          await new Promise(r => setTimeout(r, 100));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        // 에러도 SSE로 전달
        const sseError = JSON.stringify({ choices: [{ delta: { content: `\n\n[오류: ${msg}]` } }] });
        controller.enqueue(encoder.encode(`data: ${sseError}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

/** 텍스트를 n자 단위로 분할 */
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
// PART 5 — 코드 샌드박스
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

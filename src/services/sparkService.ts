/**
 * DGX Spark AI Server Client
 * vLLM 프록시 서버와 통신. Cloudflare 100초 하드 타임아웃 대응.
 * 전략: 청크 이어쓰기 — max_tokens 4000 단위로 분할 요청, finish_reason=length면 이어서 요청
 */

import { SPARK_GATEWAY_URL, buildSparkSystemPrompt, VLLM_MODEL_ID } from '@/lib/dgx-models';

export const SPARK_SERVER_URL = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_SERVER_URL || '';

/**
 * 서버 URL 결정 — Nginx LB(8090)가 Engine A/B 자동 분산하므로
 * 게이트웨이 단일 URL로 일원화.
 */
function resolveServerUrl(): string {
  return SPARK_SERVER_URL || SPARK_GATEWAY_URL;
}

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

// 520, 502는 Cloudflare Tunnel이 SSE 스트림을 즉시 끊을 때 자주 반환.
// non-stream 폴백 우선 시도 후, 폴백까지 실패하면 이 세트로 지수 백오프 재시도.
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504, 520, 521, 522, 523, 524]);
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
// PART 3 — 진짜 SSE 스트리밍 AI 호출 (TTFT 0.05초 활용)
// ============================================================

const STREAM_MAX_TOKENS = 4000; // 스트리밍 요청당 최대 토큰
const MAX_CHUNKS = 4;           // 최대 4연타 = 16,000 토큰

/**
 * 진짜 SSE 스트리밍 AI 호출
 * - stream: true로 백엔드에 요청 → TTFT 0.05초 만에 첫 토큰 수신
 * - 백엔드 SSE 청크를 즉시 프론트 SSE로 포워딩 (zero-copy)
 * - finish_reason=length면 이어쓰기 요청 (청크 이어쓰기 유지)
 */
export async function streamSparkAI(
  _model: string, // API 호환용 — 실제 payload는 VLLM_MODEL_ID 고정 사용
  system: string,
  messages: { role: string; content: string }[],
  temperature: number,
  opts?: { userId?: string; apiKey?: string; signal?: AbortSignal; userTier?: string },
): Promise<ReadableStream> {
  const serverUrl = resolveServerUrl();
  if (!serverUrl && !SPARK_SERVER_URL) throw new Error('SPARK_SERVER_URL not configured');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.userId) headers['x-user-id'] = opts.userId;
  if (opts?.userTier) headers['x-user-tier'] = opts.userTier;
  if (opts?.apiKey) headers['authorization'] = `Bearer ${opts.apiKey}`;

  // [SSE 직결] DGX 게이트웨이가 `: heartbeat` 선행 + aiohttp 스트리밍으로
  // Cloudflare Tunnel 520/502 이슈 해결. 브라우저/서버 모두 직결 경로 사용.
  // TTFT 0.13초, 진짜 SSE 관통.
  const url = `${serverUrl}/v1/chat/completions`;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let fullContent = '';
        // Qwen 3.5-9B 추론형 모델의 영어 Thinking Process 출력 차단 guard 자동 삽입
        const guardedSystem = buildSparkSystemPrompt(system);
        const chatMessages = [{ role: 'system', content: guardedSystem }, ...messages];

        for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
          const currentMessages = chunk === 0
            ? chatMessages
            : [
                ...chatMessages,
                { role: 'assistant', content: fullContent },
                { role: 'user', content: '이어서 계속 작성해주세요. 앞의 내용에 자연스럽게 이어서 쓰세요.' },
              ];

          // 진짜 스트리밍 결과를 읽고, finish_reason 반환
          const finishReason = await streamOneRequest(
            url, headers, currentMessages, temperature,
            opts?.signal, decoder, encoder, controller,
            (text) => { fullContent += text; },
          );

          if (!fullContent && chunk === 0) {
            throw new Error('DGX 서버에서 빈 응답을 받았습니다.');
          }

          if (finishReason !== 'length') break;

          // 이어쓰기 간 짧은 딜레이 (vLLM KV-cache 활용)
          await new Promise(r => setTimeout(r, 100));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        const sseError = JSON.stringify({ choices: [{ delta: { content: `\n\n[오류: ${msg}]` } }] });
        controller.enqueue(encoder.encode(`data: ${sseError}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

/**
 * 단일 스트리밍 요청: stream:true로 fetch → SSE 파싱 → 즉시 포워딩
 * @returns finish_reason ('stop' | 'length')
 */
async function streamOneRequest(
  url: string,
  headers: Record<string, string>,
  messages: { role: string; content: string }[],
  temperature: number,
  signal: AbortSignal | undefined,
  decoder: TextDecoder,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  onContent: (text: string) => void,
): Promise<string> {
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));

    try {
      // Nginx LB가 Engine A/B 자동 분산. role 힌트는 더 이상 불필요.
      const requestBody: Record<string, unknown> = {
        model: VLLM_MODEL_ID,
        messages,
        temperature,
        stream: true,
        max_tokens: STREAM_MAX_TOKENS,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        signal: signal ?? AbortSignal.timeout(180_000),
        body: JSON.stringify(requestBody),
      });

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || '일일 호출 한도 초과 (100회). 내일 초기화됩니다.');
      }
      if (res.status === 401) throw new Error('DGX 서버 인증 실패.');

      if (isRetryableError(res.status)) {
        lastError = await extractSparkError(res);
        if (attempt < MAX_RETRIES) continue;
        throw new Error(lastError);
      }

      if (!res.ok) {
        lastError = await extractSparkError(res);
        throw new Error(`Spark API ${res.status}: ${lastError}`);
      }

      // 스트리밍 본문 읽기
      const reader = res.body?.getReader();
      if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

      let finishReason = 'stop';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 마지막 불완전 라인 보존

        for (const line of lines) {
          const trimmed = line.trim();
          // SSE 코멘트(": heartbeat" 등) 스킵 — DGX 게이트웨이가 TTFT 유지 위해 선행 전송
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (!trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            const reason = parsed.choices?.[0]?.finish_reason;

            if (delta) {
              // 즉시 프론트 SSE로 포워딩 — zero delay
              const sseData = JSON.stringify({ choices: [{ delta: { content: delta } }] });
              controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              onContent(delta);
            }

            if (reason) finishReason = reason;
          } catch {
            // 파싱 불가 라인 무시 (빈 줄, 코멘트 등)
          }
        }
      }

      return finishReason;
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

// ============================================================
// /api/spark-stream — DGX Spark non-stream 응답을 SSE로 리스트리밍
// ============================================================
// [왜 필요한가]
// Cloudflare Tunnel이 DGX의 /v1/chat/completions stream:true 응답에 520/502를 반환.
// 브라우저 직결 SSE 불가 → Vercel Edge에서 non-stream 호출 후 fake SSE로 중계.
//
// 동작:
// 1) 클라이언트가 이 엔드포인트로 OpenAI chat completion body 전송 (stream:true 무관)
// 2) 서버는 DGX에 max_tokens=1200 non-stream 반복 요청 (chunk chaining)
// 3) 각 chunk 받을 때마다 SSE data: 이벤트로 브라우저에 푸시
// 4) finish_reason=length면 이어서 다음 chunk 요청
//
// 효과:
// - TTFT: 첫 chunk 도착(약 15-25초) → 기존 45-90초 대비 개선
// - 타자기 효과: chunk 내부를 20자씩 50ms 간격으로 stream
// - 클라이언트 sparkService는 기존 SSE 파서 그대로 사용
// ============================================================

import { NextRequest } from 'next/server';
import { SPARK_GATEWAY_URL, VLLM_MODEL_ID, buildSparkSystemPrompt, type AgentRole } from '@/lib/dgx-models';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ============================================================
// PART 1 — 설정
// ============================================================

const CHUNK_MAX_TOKENS = 1200; // 한 번의 DGX 요청당 토큰 (25-40초 소요)
const MAX_CHAINS = 10;         // 최대 12,000 토큰 = 7000-8000자
const TYPEWRITER_SIZE = 25;    // SSE push 청크 내부 분할 크기 (글자)
const TYPEWRITER_DELAY_MS = 40; // 타자기 간격

// ============================================================
// PART 2 — DGX 호출 헬퍼 (non-stream)
// ============================================================

interface ChatCompletionResp {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
}

// Nginx LB(8090)가 Engine A/B(8080/8081) 자동 분산 — 프록시에서는 게이트웨이만 호출.
// role은 서버 메타데이터/로깅 힌트 용도로만 유지.
function pickBackendUrl(_role?: AgentRole): string {
  return SPARK_GATEWAY_URL;
}

async function callDgxNonStream(
  url: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<{ content: string; finishReason: string }> {
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DGX ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as ChatCompletionResp;
  const content = data.choices?.[0]?.message?.content ?? '';
  const finishReason = data.choices?.[0]?.finish_reason ?? 'stop';
  return { content, finishReason };
}

// ============================================================
// PART 3 — 타자기 SSE 스트리밍
// ============================================================

async function pushTypewriter(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  text: string,
  abort: AbortSignal,
): Promise<void> {
  for (let i = 0; i < text.length; i += TYPEWRITER_SIZE) {
    if (abort.aborted) return;
    const slice = text.slice(i, i + TYPEWRITER_SIZE);
    const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: slice } }] })}\n\n`;
    controller.enqueue(encoder.encode(chunk));
    if (i + TYPEWRITER_SIZE < text.length) {
      await new Promise(r => setTimeout(r, TYPEWRITER_DELAY_MS));
    }
  }
}

/**
 * 상태 chunk 전송 — content가 아니라 phase/status 필드로 구분.
 * 클라이언트 파서는 status 필드가 있으면 content 누적에서 제외하고
 * noa:ai-phase CustomEvent로 UI에 전달.
 */
function pushPhase(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  phase: 'search' | 'prepare' | 'writing' | 'continue' | 'done',
  status: string,
): void {
  const chunk = `data: ${JSON.stringify({ phase, status })}\n\n`;
  controller.enqueue(encoder.encode(chunk));
}

// ============================================================
// PART 4 — POST 핸들러
// ============================================================

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host && !origin.endsWith(host)) {
    return new Response(JSON.stringify({ error: 'Cross-origin blocked' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), { status: 400 });
  }

  // System prompt guard (Thinking Process 차단)
  const sysIdx = messages.findIndex((m: unknown) => (m as { role?: string }).role === 'system');
  if (sysIdx >= 0) {
    const msg = messages[sysIdx] as { role: string; content: string };
    msg.content = buildSparkSystemPrompt(msg.content);
  } else {
    messages.unshift({ role: 'system', content: buildSparkSystemPrompt() });
  }

  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const role = typeof body.role === 'string' ? body.role as AgentRole : 'writer';
  const backendUrl = pickBackendUrl(role);

  const encoder = new TextEncoder();
  const abort = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      let accumulated = '';
      let chainCount = 0;
      const workingMessages = [...messages];

      try {
        // [즉시] 첫 상태 메시지 — 15초 무반응 구간 채우기
        pushPhase(controller, encoder, 'search', '🔍 세계관 설정 검색 중…');

        // 3초 후 단계 전환 (DGX 응답 전까지 빈 화면 방지)
        const prepareTimer = setTimeout(() => {
          if (!abort.aborted) pushPhase(controller, encoder, 'prepare', '✍️ 집필 준비 중…');
        }, 3000);

        // 8초 후 집필 시작 단계 (DGX 첫 chunk 도달 전)
        const writingTimer = setTimeout(() => {
          if (!abort.aborted) pushPhase(controller, encoder, 'writing', '📝 첫 문장 생성 중…');
        }, 8000);

        while (chainCount < MAX_CHAINS) {
          if (abort.aborted) break;

          const currentMessages = chainCount === 0
            ? workingMessages
            : [
                ...workingMessages,
                { role: 'assistant', content: accumulated },
                { role: 'user', content: '이어서 계속 작성해주세요. 끊긴 부분에 자연스럽게 이어지도록.' },
              ];

          // chain 2회차부터는 "다음 장면 준비 중" 상태 표시
          if (chainCount > 0) {
            pushPhase(controller, encoder, 'continue', `📖 다음 장면 준비 중… (${chainCount + 1}/${MAX_CHAINS})`);
          }

          const { content, finishReason } = await callDgxNonStream(
            backendUrl,
            {
              model: VLLM_MODEL_ID,
              messages: currentMessages,
              temperature,
              stream: false,
              max_tokens: CHUNK_MAX_TOKENS,
            },
            abort,
          );

          // 첫 chunk 받으면 예비 상태 타이머 취소
          if (chainCount === 0) {
            clearTimeout(prepareTimer);
            clearTimeout(writingTimer);
          }

          if (!content) {
            if (chainCount === 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '빈 응답' })}\n\n`));
            }
            break;
          }

          accumulated += content;
          // 브라우저에 타자기 효과로 즉시 push
          await pushTypewriter(controller, encoder, content, abort);

          chainCount++;
          if (finishReason !== 'length') break;
        }

        pushPhase(controller, encoder, 'done', '');
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      // 클라이언트 abort — 진행 중이던 DGX 요청은 abort.signal로 자동 취소
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}

// IDENTITY_SEAL: spark-stream | role=sse-proxy-fallback | inputs=chat-completion-body | outputs=SSE-stream

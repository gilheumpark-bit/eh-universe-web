// ============================================================
// /api/lsp/diagnostics — SSE stream of diagnostics.
//
// 클라가 토큰으로 SSE 구독 → 저장 직후 push 형태.
// Phase 1: authenticated heartbeat stream. Phase 2: 실제 변경 이벤트.
// ============================================================

import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 30_000;
const MAX_STREAM_MS = 10 * 60_000;

export async function GET(request: Request): Promise<Response> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json', ...(lspAuthHeaders(authResult) ?? {}) },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      // 즉시 connection event
      controller.enqueue(
        enc.encode(
          `event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`,
        ),
      );

      let closed = false;
      const closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearTimeout(maxStreamTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Heartbeat — 30s 간격
      const interval = setInterval(() => {
        try {
          controller.enqueue(
            enc.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`,
            ),
          );
        } catch {
          // 연결 종료 — 정리
          closeStream();
        }
      }, HEARTBEAT_MS);

      const maxStreamTimer = setTimeout(() => {
        try {
          controller.enqueue(
            enc.encode(
              `event: closing\ndata: ${JSON.stringify({ reason: 'stream_ttl' })}\n\n`,
            ),
          );
        } catch {
          /* connection already gone */
        }
        closeStream();
      }, MAX_STREAM_MS);

      // Abort 핸들링
      request.signal.addEventListener('abort', () => {
        closeStream();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

// ============================================================
// /api/lsp/diagnostics — SSE stream of diagnostics.
//
// 클라가 토큰으로 SSE 구독 → 저장 직후 push 형태.
// Phase 1: stub (heartbeat + sample diagnostic). Phase 2: 실제 변경 이벤트.
// ============================================================

import { isValidTokenFormat } from '@/lib/lsp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  if (!isValidTokenFormat(token)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
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
          clearInterval(interval);
        }
      }, 30_000);

      // Abort 핸들링
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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

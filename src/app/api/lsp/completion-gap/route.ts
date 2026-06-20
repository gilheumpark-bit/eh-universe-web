// ============================================================
// /api/lsp/completion-gap — POST: AI 작업 결과 검증.
// 외부 도구가 messages 보내면 5축 검증 보고 반환.
// ============================================================

import { NextResponse } from 'next/server';
import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';
import { buildCompletionGapReport } from '@/lib/completion-gap/orchestrator';
import type { Message } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface CompletionGapRequest {
  messages: Message[];
  recentN?: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status, headers: lspAuthHeaders(authResult) },
    );
  }

  let body: CompletionGapRequest;
  try {
    body = (await request.json()) as CompletionGapRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'messages_required' }, { status: 400 });
  }

  const report = buildCompletionGapReport(body.messages, { recentN: body.recentN ?? 10 });

  return NextResponse.json(report, {
    headers: { 'X-RateLimit-Remaining': String(authResult.remaining) },
  });
}

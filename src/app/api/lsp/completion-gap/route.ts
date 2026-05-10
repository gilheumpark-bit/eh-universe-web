// ============================================================
// /api/lsp/completion-gap — POST: AI 작업 결과 검증.
// 외부 도구가 messages 보내면 5축 검증 보고 반환.
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
import { buildCompletionGapReport } from '@/lib/completion-gap/orchestrator';
import type { Message } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface CompletionGapRequest {
  messages: Message[];
  recentN?: number;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const rl = checkRateLimit(token);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
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
    headers: { 'X-RateLimit-Remaining': String(rl.remaining) },
  });
}

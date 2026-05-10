// ============================================================
// /api/lsp/meta-context — POST: 사용자 텍스트 → MetaDefinition 추출.
//
// 서버측 stateless — 클라/외부 도구가 자기 store 운영.
// 본 endpoint 는 단순 추출 함수 wrapping.
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
import { extractMetaDefinitions } from '@/lib/meta-context/extractor';
import { buildMetaContextModifier } from '@/lib/meta-context/prompt-injector';
import type { AppLanguage } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface MetaContextRequest {
  text: string;
  language?: AppLanguage;
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

  let body: MetaContextRequest;
  try {
    body = (await request.json()) as MetaContextRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text_required' }, { status: 400 });
  }

  const language = body.language ?? 'KO';
  const definitions = extractMetaDefinitions(body.text, 0, Date.now());

  const current: Record<string, typeof definitions[0]> = {};
  for (const d of definitions) current[`${d.kind}:${d.key}`] = d;

  const promptText = buildMetaContextModifier(
    { definitions, current, conflicts: [] },
    { language, charCap: 400 },
  );

  return NextResponse.json(
    {
      definitions,
      promptText,
      generatedAt: new Date().toISOString(),
    },
    { headers: { 'X-RateLimit-Remaining': String(rl.remaining) } },
  );
}

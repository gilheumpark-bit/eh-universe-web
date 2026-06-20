// ============================================================
// /api/lsp/glossary-validate — Dual glossary 일관성 검증
// ============================================================
// POST: { translation, glossary[], track: 'faithful'|'market', token }
//   → { violations: [{ source, expected, found }], score: 0-100 }
//
// 외부 도구가 번역본의 용어 일관성 (Faithful 또는 Market 매핑) 자동 검증.
// ============================================================

import { NextResponse } from 'next/server';
import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';
import { pickGlossaryTarget, type GlossaryEntry } from '@/lib/translation/glossary-manager';

export const runtime = 'nodejs';

interface ValidateBody {
  translation?: string;
  glossary?: GlossaryEntry[];
  track?: 'faithful' | 'market' | 'default';
}

export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error, ...(authResult.resetAt ? { reset_at: authResult.resetAt } : {}) },
      { status: authResult.status, headers: lspAuthHeaders(authResult) },
    );
  }

  let body: ValidateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const translation = body.translation ?? '';
  const glossary = Array.isArray(body.glossary) ? body.glossary : [];
  const track = body.track ?? 'default';

  if (!translation || translation.length < 5) {
    return NextResponse.json({ error: 'translation_too_short' }, { status: 400 });
  }

  // 결정론적 — translation 안에 expected target 이 적어도 1번 등장하는지
  const violations: Array<{ source: string; expected: string; found: boolean }> = [];
  for (const entry of glossary) {
    if (!entry.source) continue;
    const expected = pickGlossaryTarget(entry, track);
    if (!expected) continue;
    const found = translation.includes(expected);
    if (!found) {
      violations.push({ source: entry.source, expected, found: false });
    }
  }

  const total = glossary.length;
  const score = total === 0 ? 100 : Math.round(((total - violations.length) / total) * 100);

  return NextResponse.json({
    track,
    total,
    violations,
    score,
    timestamp: new Date().toISOString(),
  });
}

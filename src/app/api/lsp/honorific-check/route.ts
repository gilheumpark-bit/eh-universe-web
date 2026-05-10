// ============================================================
// /api/lsp/honorific-check — 호칭 일관성 검증 (Market track 전용)
// ============================================================
// POST: { translation, relations[], token }
//   → { suggestions: HonorificSuggestion[], inconsistencies: [...] }
//
// Market track 출판 전 외부 검증 — 캐릭터 호칭이 관계 매트릭스와 일치하는지.
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
import {
  suggestHonorific,
  type CharacterRelation,
} from '@/lib/translation/honorifics';

export const runtime = 'nodejs';

interface CheckBody {
  translation?: string;
  relations?: CharacterRelation[];
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // [P0-3 — 2026-05-09]
  const rl = checkRateLimit(token);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded', reset_at: rl.resetAt }, { status: 429 });
  }

  let body: CheckBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const translation = body.translation ?? '';
  const relations = Array.isArray(body.relations) ? body.relations : [];

  // 각 관계마다 권장 호칭 + 번역본에 호칭 등장 여부 확인
  const report = relations.map((rel) => {
    const suggestions = suggestHonorific(rel);
    const top = suggestions[0];
    const expectedHonorific = top?.honorific ?? rel.listener.name;
    const found = translation.includes(expectedHonorific);
    return {
      speaker: rel.speaker.name,
      listener: rel.listener.name,
      hierarchy: rel.hierarchy,
      distance: rel.distance,
      age: rel.age,
      suggestions,
      expectedHonorific,
      foundInTranslation: found,
    };
  });

  const inconsistent = report.filter((r) => !r.foundInTranslation);
  const score = relations.length === 0
    ? 100
    : Math.round(((relations.length - inconsistent.length) / relations.length) * 100);

  return NextResponse.json({
    total: relations.length,
    report,
    inconsistencies: inconsistent,
    score,
    timestamp: new Date().toISOString(),
  });
}

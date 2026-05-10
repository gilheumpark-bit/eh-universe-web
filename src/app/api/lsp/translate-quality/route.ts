// ============================================================
// /api/lsp/translate-quality — Dual track 결과 결정론적 채점
// ============================================================
// POST: { source, faithful?, market?, srcLang, tgtLang, token }
//   → { faithful: IntegrityReport | null, market: IntegrityReport | null }
//
// 시장 분석 4차 §11 §"NCG/NCT" 본질 매핑.
// 외부 도구 (출판사 CMS / 번역가 IDE / CI) 가 호출하는 결정론적 quality endpoint.
//
// [C] LLM 호출 0 — 결정론적
// [C] 인증 필수 — Bearer token (lsp/auth 에서 발급)
// [G] 100k chars 페어도 < 100ms
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
import { runIntegrityCheck, type SupportedLang } from '@/lib/translation/source-integrity';

export const runtime = 'nodejs';

function normalizeLang(code: string): SupportedLang {
  const u = (code || '').toUpperCase();
  if (u === 'KO' || u === 'KR') return 'ko';
  if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'ja';
  if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'zh';
  return 'en';
}

export async function POST(request: Request): Promise<NextResponse> {
  // 인증
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // [P0-3 — 2026-05-09] rate-limit (기존 5 endpoint 정합)
  const rl = checkRateLimit(token);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limit_exceeded', reset_at: rl.resetAt }, { status: 429 });
  }

  let body: {
    source?: string;
    faithful?: string;
    market?: string;
    srcLang?: string;
    tgtLang?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const source = (body.source ?? '').toString();
  const srcLang = normalizeLang(body.srcLang ?? 'ko');
  const tgtLang = normalizeLang(body.tgtLang ?? 'en');

  if (!source || source.length < 10) {
    return NextResponse.json({ error: 'source_too_short' }, { status: 400 });
  }

  const faithfulText = body.faithful;
  const marketText = body.market;

  const result: {
    faithful: ReturnType<typeof runIntegrityCheck> | null;
    market: ReturnType<typeof runIntegrityCheck> | null;
    timestamp: string;
  } = {
    faithful: null,
    market: null,
    timestamp: new Date().toISOString(),
  };

  if (typeof faithfulText === 'string' && faithfulText.length > 0) {
    try {
      result.faithful = runIntegrityCheck({
        source,
        translation: faithfulText,
        srcLang,
        tgtLang,
        trackMode: 'faithful',
      });
    } catch {
      /* keep null */
    }
  }
  if (typeof marketText === 'string' && marketText.length > 0) {
    try {
      result.market = runIntegrityCheck({
        source,
        translation: marketText,
        srcLang,
        tgtLang,
        trackMode: 'market',
      });
    } catch {
      /* keep null */
    }
  }

  return NextResponse.json(result);
}

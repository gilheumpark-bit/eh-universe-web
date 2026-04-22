// ============================================================
// Network Agent Ingest API (멀티 테넌트 저장용)
// ============================================================
// POST /api/network-agent/ingest
// Body: { documentId, title, content, planetId?, isPublic?, documentType?, translationProjectId? }
// Headers: Authorization (식별용 토큰)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ingestNetworkDocument, isNetworkAgentConfigured } from '@/lib/vertex-network-agent';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { logger } from '@/lib/logger';
import { getNetworkAgentCorsHeaders } from '@/lib/network-agent-cors';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { scanTextForIP } from '@/lib/ip-guard/scan';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getNetworkAgentCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = getNetworkAgentCorsHeaders(req);
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, 'network-agent-ingest', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...cors, 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }
  try {
    const authHeader = req.headers.get('authorization') || '';
    const raw = authHeader.replace(/^Bearer\s+/i, '').trim();
    const verified = await verifyFirebaseIdToken(raw);
    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
    const userId = verified.uid;

    if (!isNetworkAgentConfigured()) {
      return NextResponse.json({ error: 'Network Agent Engine is not configured yet.' }, { status: 503, headers: cors });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.documentId || !body.title || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, title, content' },
        { status: 400, headers: cors },
      );
    }

    const documentType =
      body.documentType === 'translation' ? 'translation' : 'universe';
    const translationProjectId =
      typeof body.translationProjectId === 'string' ? body.translationProjectId.trim() : undefined;
    if (documentType === 'translation' && !translationProjectId) {
      return NextResponse.json(
        { error: 'translationProjectId is required when documentType is translation' },
        { status: 400, headers: cors },
      );
    }

    // [L1 IP Guard] RAG ingestion 단계 방어 — critical IP/저작권 매칭 시 거부.
    // warning 이하는 로깅만 하고 통과 (작가 피드백용).
    const ipScan = scanTextForIP(`${body.title}\n\n${body.content}`);
    const criticalBrands = ipScan.brands.filter(b => b.entry.severity === 'critical');
    const criticalPatterns = ipScan.patterns.filter(p => p.severity === 'critical');
    if (criticalBrands.length > 0 || criticalPatterns.length > 0) {
      logger.warn('network-agent/ingest', 'L1 IP guard blocked ingestion', {
        userId,
        documentId: body.documentId,
        score: ipScan.score,
        brands: criticalBrands.length,
        patterns: criticalPatterns.length,
      });
      return NextResponse.json(
        {
          error: 'IP/brand violation detected — ingestion blocked',
          score: ipScan.score,
          grade: ipScan.grade,
          summary: ipScan.summary,
          recommendations: ipScan.recommendations,
          brands: criticalBrands.map(b => ({ canonical: b.entry.canonical, matched: b.matched })),
          patterns: criticalPatterns.map(p => ({ description: p.description, line: p.line })),
        },
        { status: 403, headers: cors },
      );
    }
    if (ipScan.score < 70) {
      // 작가에게 리포트만 남김 — 차단은 안 함
      logger.warn('network-agent/ingest', 'L1 IP guard warning (score<70)', {
        userId,
        documentId: body.documentId,
        score: ipScan.score,
        grade: ipScan.grade,
      });
    }

    const success = await ingestNetworkDocument({
      documentId: String(body.documentId),
      title: String(body.title),
      content: String(body.content),
      userId,
      planetId: body.planetId,
      isPublic: body.isPublic === true,
      documentType,
      translationProjectId,
    });

    if (success) {
      return NextResponse.json(
        { ok: true, message: 'Document synced to Agent Builder successfully.' },
        { headers: cors },
      );
    }
    return NextResponse.json(
      { error: 'Failed to ingest document into Google Cloud.' },
      { status: 500, headers: cors },
    );
  } catch (error) {
    logger.error('network-agent/ingest', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: cors });
  }
}

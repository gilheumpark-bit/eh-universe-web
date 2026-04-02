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

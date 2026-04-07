export const dynamic = "force-dynamic";
// ============================================================
// Network Agent Search API (멀티 테넌트 검색용)
// ============================================================
// POST /api/network-agent/search
// Body: { query, planetId?, onlyPublic?, narrowDocumentType?, translationProjectId? }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchNetworkAgent, isNetworkAgentConfigured } from '@/lib/vertex-network-agent';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { logger } from '@/lib/logger';
import { getNetworkAgentCorsHeaders } from '@/lib/network-agent-cors';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getNetworkAgentCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const cors = getNetworkAgentCorsHeaders(req);

  try {
    const rl = checkRateLimit(ip, 'network-search', RATE_LIMITS.chat);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: cors });
    }

    const authHeader = req.headers.get('authorization') || '';
    const raw = authHeader.replace(/^Bearer\s+/i, '').trim();
    const verified = await verifyFirebaseIdToken(raw);
    if (!verified) {
      return NextResponse.json(
        { error: 'Unauthorized: User session required for personal agent.' },
        { status: 401, headers: cors },
      );
    }
    const userId = verified.uid;

    if (!isNetworkAgentConfigured()) {
      return NextResponse.json(
        { error: 'Network Agent Engine is not configured in .env.local.' },
        { status: 503, headers: cors },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400, headers: cors });
    }

    const { query, planetId, onlyPublic, narrowDocumentType, translationProjectId } = body as {
      query: string;
      planetId?: string;
      onlyPublic?: boolean;
      narrowDocumentType?: string;
      translationProjectId?: string;
    };

    const narrow =
      narrowDocumentType === 'translation'
        ? ('translation' as const)
        : narrowDocumentType === 'universe'
          ? ('universe' as const)
          : undefined;
    const tp =
      typeof translationProjectId === 'string' ? translationProjectId.trim() : undefined;
    if (narrow === 'translation' && !tp) {
      return NextResponse.json(
        { error: 'translationProjectId is required when narrowDocumentType is translation' },
        { status: 400, headers: cors },
      );
    }

    const filters = {
      userId: onlyPublic ? undefined : userId,
      planetId: planetId,
      onlyPublic: onlyPublic === true,
      narrowDocumentType: narrow,
      translationProjectId: tp,
    };

    const searchResult = await searchNetworkAgent(query, filters);

    return NextResponse.json(
      {
        ok: true,
        summary: searchResult.summary,
        results: searchResult.results,
        debugFilterInfo: searchResult.filterApplied,
      },
      { headers: cors },
    );
  } catch (error: unknown) {
    logger.error('network-agent/search', error);
    return NextResponse.json(
      { error: 'Failed to search network agent.' },
      { status: 500, headers: cors },
    );
  }
}


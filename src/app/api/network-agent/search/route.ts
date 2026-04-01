// ============================================================
// Network Agent Search API (멀티 테넌트 검색용)
// ============================================================
// POST /api/network-agent/search
// Body: { query: string, planetId?: string, onlyPublic?: boolean }
// Headers: Authorization (식별용 토큰)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchNetworkAgent, isNetworkAgentConfigured } from '@/lib/vertex-network-agent';
import { getClientIp, checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  try {
    const rl = checkRateLimit(ip, 'network-search', RATE_LIMITS.chat);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 1. 보안 인증 (실제 프로덕션에서는 Firebase Auth VerifyToken 등을 사용)
    const authHeader = req.headers.get('authorization') || '';
    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User session required for personal agent.' }, { status: 401 });
    }

    if (!isNetworkAgentConfigured()) {
      return NextResponse.json({ error: 'Network Agent Engine is not configured in .env.local.' }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const { query, planetId, onlyPublic } = body;

    // 2. 멀티 테넌트 필터링 
    // - onlyPublic이 true면 집단 지성 검색 (다른 사람의 공개 데이터)
    // - 그 외에는 무조건 이메일/ID 기준 내(userId) 것만 검색!
    const filters = {
      userId: onlyPublic ? undefined : userId,
      planetId: planetId,
      onlyPublic: onlyPublic === true,
    };

    // 3. 구글 클라우드(142만 원 크레딧)에 검색 요청
    const searchResult = await searchNetworkAgent(query, filters);

    return NextResponse.json({
      ok: true,
      summary: searchResult.summary,
      results: searchResult.results,
      debugFilterInfo: searchResult.filterApplied, // 개발 중 필터 확인용
    });
  } catch (error: unknown) {
    console.error('[NetworkAgent API Error]', error);
    return NextResponse.json({ error: 'Failed to search network agent.' }, { status: 500 });
  }
}

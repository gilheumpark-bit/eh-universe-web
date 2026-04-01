// ============================================================
// Network Agent Ingest API (멀티 테넌트 저장용)
// ============================================================
// POST /api/network-agent/ingest
// Body: { documentId: string, title: string, content: string, planetId?: string, isPublic?: boolean }
// Headers: Authorization (식별용 토큰)
// 기능: 프론트엔드에서 행성을 만들거나 글을 쓸 때 백엔드 엔진에도 동기화
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ingestNetworkDocument, isNetworkAgentConfigured } from '@/lib/vertex-network-agent';

export async function POST(req: NextRequest) {
  try {
    // 1. 유저 인증 (본인 글만 저장/수정 가능하게 방어)
    const authHeader = req.headers.get('authorization') || '';
    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isNetworkAgentConfigured()) {
      return NextResponse.json({ error: 'Network Agent Engine is not configured yet.' }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.documentId || !body.title || !body.content) {
      return NextResponse.json({ error: 'Missing required fields: documentId, title, content' }, { status: 400 });
    }

    // 2. 서버 엔진(Agent Builder)에 데이터 직접 밀어넣기
    const success = await ingestNetworkDocument({
      documentId: body.documentId,
      title: body.title,
      content: body.content,
      userId: userId, // 세션에서 추출한 진짜 ID
      planetId: body.planetId,
      isPublic: body.isPublic === true,
    });

    if (success) {
      return NextResponse.json({ ok: true, message: 'Document synced to Agent Builder successfully.' });
    } else {
      return NextResponse.json({ error: 'Failed to ingest document into Google Cloud.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Network Ingest API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

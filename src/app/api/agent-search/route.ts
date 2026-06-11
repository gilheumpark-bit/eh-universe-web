// ============================================================
// Agent Builder Search API — 비활성 (Google Discovery Engine 제거)
// ============================================================
// [2026-06-06] 구글 AI 삭제: Vertex AI Agent Builder(142만원 크레딧) 검색 경로 제거.
// production UI 미연결 상태였고(e2e만 참조), 하위호환을 위해 라우트는 유지 — 항상 503.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  void _req;
  return NextResponse.json({ error: 'agent_search_disabled' }, { status: 503 });
}

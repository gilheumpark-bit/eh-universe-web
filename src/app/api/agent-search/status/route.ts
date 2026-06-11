// ============================================================
// Agent Builder 상태 API — 비활성 (Google Discovery Engine 제거)
// ============================================================
// [2026-06-06] 구글 AI 삭제: Vertex AI Agent Builder 상태 경로 제거. 항상 503.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  void _req;
  return NextResponse.json({ error: 'agent_search_disabled' }, { status: 503 });
}

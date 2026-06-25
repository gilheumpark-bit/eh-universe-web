// ============================================================
// Retired external search status API — disabled compatibility route
// ============================================================
// [2026-06-06] 구 외부 검색 상태 경로 제거. 항상 503.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  void _req;
  return NextResponse.json({ error: 'agent_search_disabled' }, { status: 503 });
}

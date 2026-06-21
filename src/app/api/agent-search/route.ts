// ============================================================
// Retired external search API — disabled compatibility route
// ============================================================
// [2026-06-06] 구 외부 검색 경로 제거.
// production UI 미연결 상태였고, 하위호환을 위해 라우트는 유지 — 항상 503.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  void _req;
  return NextResponse.json({ error: 'agent_search_disabled' }, { status: 503 });
}

// ============================================================
// Retired compatibility API — removed external search smoke route
// ============================================================
// [2026-06-19] 구 Network Agent 스모크 경로는 공개 제품 기준에서 제거됐다.
// 직접 호출과 E2E 모두 같은 410 응답으로 고정해 재활성 오독을 막는다.
// ============================================================

import { NextResponse } from 'next/server';

const REMOVED_RESPONSE = {
  ok: false,
  error: 'surface_removed',
  message: 'This retired API surface is no longer active in Loreguard.',
};

function removedResponse() {
  return NextResponse.json(REMOVED_RESPONSE, { status: 410 });
}

export function OPTIONS() {
  return removedResponse();
}

export function GET() {
  return removedResponse();
}

export function POST() {
  return removedResponse();
}

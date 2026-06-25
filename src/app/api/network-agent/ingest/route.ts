// ============================================================
// Retired compatibility API — removed external ingest surface
// ============================================================
// [2026-06-19] 공개 제품 기준에서 제거된 구 인덱싱 경로.
// 프록시와 직접 라우트 모두 같은 410 응답으로 고정한다.
// 현행 Loreguard Studio/Translation Studio UI에서 호출하지 않는 삭제 표면이다.
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

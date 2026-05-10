// ============================================================
// /api/cp/verify/[id] — 창작 과정 확인서 외부 검증 endpoint.
// ============================================================
//
// LearningGuard 설계서 §2.3 매핑 — Cross-border Novel IDE 의 입출판사·외부
// 검증자가 cert ID 만으로 무결성 1차 점검 가능하게 함.
//
// 정책 (alpha):
//   - 본 endpoint 는 cert 데이터 자체를 보관하지 않는다 (privacy 보호)
//   - cert ID 형식 검증 + 사용자 친화 instruction JSON 반환
//   - POST 시 cert JSON 첨부 → schema/hash 무결성 점검 후 결과 반환
//
// 보안:
//   - GET: 누구나 (instruction 만)
//   - POST: rate-limit (Phase 2 — 미구현, 알파는 누구나)
//
// [C] cert ID 형식 검증 — ULID 또는 generateCertificateId 패턴
// [G] 결정론적 (LLM 호출 0)
// [K] 단일 책임 — 검증·instruction 만
// ============================================================

import { NextResponse } from 'next/server';
import type { ProcessCertificate } from '@/lib/creative-process/types';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// ============================================================
// Helpers
// ============================================================

const ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function isValidCertId(id: string | undefined | null): boolean {
  return typeof id === 'string' && ID_REGEX.test(id);
}

function isValidHash(hash: string | undefined | null): boolean {
  return typeof hash === 'string' && SHA256_HEX.test(hash);
}

interface VerifyRouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================
// GET — cert ID 받아 instruction 반환
// ============================================================

export async function GET(
  _request: Request,
  context: VerifyRouteParams,
): Promise<NextResponse> {
  // [전체 검증 사이클 — 2026-05-09] rate-limit 누락 수리. 외부 누구나 호출 가능 endpoint.
  const ip = getClientIp(_request.headers);
  const rl = checkRateLimit(ip, '/api/cp/verify', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retry_after_ms: rl.retryAfterMs },
      { status: 429 },
    );
  }
  const { id } = await context.params;
  if (!isValidCertId(id)) {
    return NextResponse.json(
      {
        valid: false,
        error: 'invalid_id_format',
        message_ko: '확인서 ID 형식이 올바르지 않습니다.',
        message_en: 'Invalid certificate ID format.',
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    id,
    instruction_ko:
      '확인서 무결성 검증: POST 요청 본문에 cert JSON 을 첨부하세요. 본 서버는 schema·hash 형식만 점검하며 cert 데이터를 저장하지 않습니다.',
    instruction_en:
      'To verify integrity: POST the cert JSON in the request body. This server only checks schema/hash format and does NOT store cert data.',
    schema_required_fields: [
      'id',
      'projectId',
      'manuscriptHash',
      'generatedAt',
      'reportVersion',
      'visibility',
      'timelineHash',
    ],
    privacy_note:
      'Loreguard 는 cert 본문을 외부 서버에 저장하지 않습니다. 무결성 검증은 cert 자체 hash 일치만으로 결정론적으로 수행됩니다.',
    expected_id: id,
    method: 'POST',
  });
}

// ============================================================
// POST — cert JSON 무결성 1차 검증
// ============================================================

export async function POST(
  request: Request,
  context: VerifyRouteParams,
): Promise<NextResponse> {
  // [전체 검증 사이클 — 2026-05-09] POST 도 rate-limit. payload 검증은 비용이 더 큼.
  const ip = getClientIp(request.headers);
  const rl = checkRateLimit(ip, '/api/cp/verify-post', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', retry_after_ms: rl.retryAfterMs },
      { status: 429 },
    );
  }

  const { id } = await context.params;

  if (!isValidCertId(id)) {
    return NextResponse.json(
      { valid: false, error: 'invalid_id_format' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { valid: false, error: 'cert_required' },
      { status: 400 },
    );
  }

  const cert = body as Partial<ProcessCertificate>;
  const issues: string[] = [];

  // 1. ID 일치
  if (cert.id !== id) {
    issues.push('cert.id mismatch with URL id');
  }

  // 2. 필수 필드 존재
  const requiredFields: Array<keyof ProcessCertificate> = [
    'id',
    'projectId',
    'manuscriptHash',
    'generatedAt',
    'reportVersion',
    'visibility',
    'timelineHash',
    'sourceSummaryHash',
    'limitationTextVersion',
  ];
  for (const f of requiredFields) {
    if (cert[f] === undefined || cert[f] === null) {
      issues.push(`missing required field: ${String(f)}`);
    }
  }

  // 3. SHA-256 형식
  if (cert.manuscriptHash && !isValidHash(cert.manuscriptHash)) {
    issues.push('invalid manuscriptHash format (expected sha256 hex)');
  }
  if (cert.timelineHash && !isValidHash(cert.timelineHash)) {
    issues.push('invalid timelineHash format');
  }
  if (cert.sourceSummaryHash && !isValidHash(cert.sourceSummaryHash)) {
    issues.push('invalid sourceSummaryHash format');
  }

  // 4. 빈 manuscript hash 방어 (LearningGuard §3.3)
  if (cert.manuscriptHash === EMPTY_SHA256) {
    issues.push('manuscriptHash is empty-string SHA-256 — cert covers an empty manuscript');
  }

  // 5. ISO 8601 generatedAt
  if (cert.generatedAt) {
    const t = Date.parse(cert.generatedAt);
    if (Number.isNaN(t)) issues.push('generatedAt is not a valid ISO 8601 date');
  }

  // 6. retention 만료 점검
  if (cert.retention?.expiresAt) {
    const exp = Date.parse(cert.retention.expiresAt);
    if (!Number.isNaN(exp) && exp < Date.now()) {
      issues.push('cert retention expired — cert may have been auto-deleted from issuer side');
    }
  }

  const valid = issues.length === 0;

  return NextResponse.json({
    valid,
    cert_id: cert.id,
    schema_version: cert.schemaVersion,
    report_version: cert.reportVersion,
    issuer_type: cert.issuer?.type,
    visibility: cert.visibility,
    issues,
    note: valid
      ? 'Schema/hash format check passed. This does NOT verify content authenticity — only structural integrity. For full verification, compare manuscriptHash against the original manuscript independently.'
      : `${issues.length} issue(s) found. See "issues" array.`,
    timestamp: new Date().toISOString(),
  });
}

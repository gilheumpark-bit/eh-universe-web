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
//   - GET ?lookup=true → Firestore 레지스트리에서 certId/봉인번호로 메타 조회
//     (원본 콘텐츠 0 — 레지스트리는 해시·메타만 보관. 미등록 = cert_not_registered)
//   - POST 시 cert JSON 첨부 → schema/hash 무결성 점검 + 레지스트리 대조
//     (certHash/chainTipHash 일치 + 레지스트리 엔트리 HMAC 검증) 후 결과 반환
//
// 보안:
//   - GET/POST: 누구나 + rate-limit (IP 기준)
//   - HMAC secret (CP_REGISTRY_HMAC_ENV) — 응답·로그에 절대 노출 금지
//
// 정직 한계 (의무 표기): 인간 작성 자체는 증명 불가 —
// 앵커(등록) 시점 이후 무변조·존재만 증명 (HONESTY_LIMITATION).
//
// [C] cert ID 형식 검증 — ULID / generateCertificateId / Witness Seal 번호 패턴
// [G] 결정론적 (LLM 호출 0)
// [K] 단일 책임 — 검증·instruction·레지스트리 대조만
// ============================================================

import { NextResponse } from 'next/server';
import type { ProcessCertificate } from '@/lib/creative-process/types';
import {
  CP_REGISTRY_COLLECTION,
  CP_REGISTRY_HMAC_ENV,
  HONESTY_LIMITATION,
  computeCertHash,
  computeRegistryHmac,
  parseRegistryDocument,
  timingSafeEqualHex,
  type CertRegistryEntry,
} from '@/lib/creative-process/registry-contract';
import { firestoreListDocuments } from '@/lib/firestore-service-rest';
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
// Registry lookup (Firestore — firestoreListDocuments 재사용)
// ============================================================
//
// [alpha 한계 — /api/share 와 동일 list-scan 패턴] pageSize 300 내 스캔.
// 레지스트리가 300건 초과 시 structured query 로 교체 필요 (S8 후속).

type RegistryLookup =
  | { status: 'unavailable' }
  | { status: 'not_found' }
  | { status: 'found'; entry: CertRegistryEntry };

async function lookupRegistryEntry(idOrSeal: string): Promise<RegistryLookup> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!projectId) return { status: 'unavailable' };
  try {
    const res = await firestoreListDocuments(projectId, CP_REGISTRY_COLLECTION, { pageSize: 300 });
    if (!res.ok) return { status: 'unavailable' };
    for (const doc of res.documents) {
      const entry = parseRegistryDocument(doc);
      if (!entry) continue; // 손상 문서 skip
      if (entry.certId === idOrSeal || entry.sealNumber === idOrSeal) {
        return { status: 'found', entry };
      }
    }
    return { status: 'not_found' };
  } catch {
    // Firestore 장애 — 검증 자체를 거짓 FAIL 로 만들지 않고 unavailable 로 정직 보고
    return { status: 'unavailable' };
  }
}

/** 레지스트리 메타만 추출 — 원본 콘텐츠·secret 0 (공개 응답용). */
function registryMeta(entry: CertRegistryEntry) {
  return {
    cert_id: entry.certId,
    seal_number: entry.sealNumber ?? null,
    registered_at: entry.registeredAt,
    visibility: entry.visibility ?? null,
    issuer_type: entry.issuerType ?? null,
    github_repo: entry.githubRepo ?? null,
    github_commit_sha: entry.githubCommitSha ?? null,
    cert_hash: entry.certHash,
    chain_tip_hash: entry.chainTipHash ?? null,
  };
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

  // ?lookup=true — 레지스트리 메타 조회 (certId 또는 봉인번호)
  const lookup = new URL(_request.url).searchParams.get('lookup') === 'true';
  if (lookup) {
    const found = await lookupRegistryEntry(id);
    if (found.status === 'unavailable') {
      return NextResponse.json(
        {
          registered: false,
          error: 'registry_unavailable',
          message_ko: '레지스트리에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도하세요.',
          message_en: 'Registry temporarily unavailable. Please retry later.',
        },
        { status: 503 },
      );
    }
    if (found.status === 'not_found') {
      return NextResponse.json(
        {
          registered: false,
          error: 'cert_not_registered',
          message_ko: '해당 ID/봉인번호로 등록된 확인서가 없습니다.',
          message_en: 'No certificate registered under this ID / seal number.',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      registered: true,
      ...registryMeta(found.entry),
      honesty_note_ko: HONESTY_LIMITATION.ko,
      honesty_note_en: HONESTY_LIMITATION.en,
      privacy_note:
        'The registry stores hashes and metadata only — no manuscript content is stored, displayed, or downloadable.',
    });
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

  // 7. 레지스트리 대조 — 제출 cert 의 certHash/chainTipHash vs 앵커 + HMAC 검증
  const registry = await crossCheckRegistry(id, cert, issues);

  const valid = issues.length === 0;

  return NextResponse.json({
    valid,
    cert_id: cert.id,
    schema_version: cert.schemaVersion,
    report_version: cert.reportVersion,
    issuer_type: cert.issuer?.type,
    visibility: cert.visibility,
    issues,
    registry,
    note: valid
      ? 'Schema/hash format check passed. This does NOT verify content authenticity — only structural integrity. For full verification, compare manuscriptHash against the original manuscript independently.'
      : `${issues.length} issue(s) found. See "issues" array.`,
    honesty_note_ko: HONESTY_LIMITATION.ko,
    honesty_note_en: HONESTY_LIMITATION.en,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================
// Registry cross-check (POST 전용 helper)
// ============================================================
//
// 결과 status:
//   match              — certHash·chainTipHash 모두 레지스트리와 일치
//   mismatch           — 1개 이상 불일치 (issues 에 push → valid=false)
//   cert_not_registered — 레지스트리 미등록 (구조 검증 결과에는 영향 X — 정직 보고만)
//   unavailable        — Firestore 미설정/장애 (검증 불능 ≠ FAIL — 정직 보고)
//
// hmac:
//   pass / fail / missing / skipped_no_secret / skipped
//   fail·missing 은 레지스트리 자체 변조 의심 → issues push.

async function crossCheckRegistry(
  id: string,
  cert: Partial<ProcessCertificate>,
  issues: string[],
): Promise<{ status: string; hmac: string; registered_at?: string }> {
  const found = await lookupRegistryEntry(id);
  if (found.status === 'unavailable') return { status: 'unavailable', hmac: 'skipped' };
  if (found.status === 'not_found') return { status: 'cert_not_registered', hmac: 'skipped' };

  const entry = found.entry;
  let mismatch = false;

  // (1) certHash 대조 — 제출 cert 를 canonical 재해시 후 앵커 값과 비교
  try {
    const submittedHash = await computeCertHash(cert);
    if (!timingSafeEqualHex(submittedHash, entry.certHash)) {
      issues.push('certHash mismatch with registry — submitted cert differs from anchored cert');
      mismatch = true;
    }
  } catch {
    issues.push('certHash recompute failed — cert payload not hashable');
    mismatch = true;
  }

  // (2) chainTipHash 대조 ('' = 없음 — 양쪽 정규화 후 비교)
  if ((cert.chainTipHash ?? '') !== (entry.chainTipHash ?? '')) {
    issues.push('chainTipHash mismatch with registry — event chain tip differs from anchored value');
    mismatch = true;
  }

  // (3) 레지스트리 엔트리 HMAC 검증 — 레지스트리 자체 변조 검출
  //     secret 은 env 에서만 read — 응답·로그 절대 노출 금지
  let hmacStatus: string;
  const secret = process.env[CP_REGISTRY_HMAC_ENV];
  if (!secret) {
    hmacStatus = 'skipped_no_secret';
  } else if (!entry.hmac) {
    hmacStatus = 'missing';
    issues.push('registry entry missing HMAC — registry integrity cannot be confirmed');
    mismatch = true;
  } else {
    try {
      // v2 payload — register/route.ts 와 *동일 필드*로 재계산해야 일치한다.
      // uid·visibility·issuerType 누락 시 register 와 다른 bytes → 항상 fail (high #15).
      const expected = await computeRegistryHmac(secret, {
        certId: entry.certId,
        certHash: entry.certHash,
        chainTipHash: entry.chainTipHash,
        registeredAt: entry.registeredAt,
        uid: entry.authorUid,
        visibility: entry.visibility,
        issuerType: entry.issuerType,
      });
      if (timingSafeEqualHex(expected, entry.hmac)) {
        hmacStatus = 'pass';
      } else {
        hmacStatus = 'fail';
        issues.push('registry entry HMAC mismatch — registry entry may have been tampered');
        mismatch = true;
      }
    } catch {
      hmacStatus = 'fail';
      issues.push('registry HMAC verification failed (crypto error)');
      mismatch = true;
    }
  }

  return {
    status: mismatch ? 'mismatch' : 'match',
    hmac: hmacStatus,
    registered_at: entry.registeredAt,
  };
}

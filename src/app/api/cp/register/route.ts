// ============================================================
// /api/cp/register — 창작 과정 확인서 원본 레지스트리 등록 (D3-registry)
// ============================================================
//
// 옵트인 전용 (CpJournalPanel 발급 플로우의 체크박스 동의 시에만 호출).
// 저장 항목 = 메타데이터만 (certId·projectId·해시·시각·공개범위·UID·issuer·
// GitHub anchor sha). 원고 본문·콘텐츠 0byte — PIPA 최소 수집 원칙.
//
// 정직 한계 (verify 표면 의무 문구):
//   인간 작성 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명.
//
// 보안:
//   - 인증 필수: Firebase Bearer (checkout/route.ts 패턴 재사용)
//   - rate-limit 10/min/IP
//   - 입력 형식 검증: certId = Crockford base32 26자 (report-builder PART 9
//     generateCertificateId 출력), 해시 = sha256 hex 64자, commit sha = hex 40자
//   - HMAC-SHA256 서버 서명: env CP_REGISTRY_HMAC_SECRET — 미설정 시 명시적 503
//     (시크릿 하드코딩·fallback 키 절대 금지)
//   - generatedAt = 서버 시각: Firestore REST createDocument 는 serverTimestamp
//     transform 미지원 — 본 route 의 서버 시계가 앵커 시점의 권위.
//     클라이언트가 주장하는 발급 시각은 수용하지 않는다.
//   - write-once: documentId = certId 고정 → 중복 등록 시 Firestore 409
//     ALREADY_EXISTS → already_registered 응답. firestore.rules 의
//     certificates/{certId} (update/delete = admin only) 와 대칭.
//
// [C] 결정론 — LLM 호출 0
// [G] 실패 비침묵 — Firestore 쓰기 실패 시 502 + apiLog error
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { firestoreCreateDocument } from '@/lib/firestore-service-rest';
import { apiLog } from '@/lib/api-logger';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// PART 1 — 입력 형식 (콘텐츠 0 — 메타데이터만)
// ============================================================

/** report-builder.ts PART 9 generateCertificateId — Crockford base32 26자 (I·L·O·U 제외) */
const CERT_ID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const GIT_COMMIT_SHA = /^[a-f0-9]{40}$/i;
/** useProjectManager `project-${crypto.randomUUID()}` 포함 — 안전 charset 한정 */
const PROJECT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
/** 빈 문자열 SHA-256 — 빈 발급물 anchoring 차단 (report-builder §3.3 과 동일 방어) */
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const VISIBILITIES = ['public', 'publisher', 'legal', 'private'] as const;
const ISSUER_TYPES = ['self', 'publisher', 'collaborator', 'admission_token'] as const;

const HONESTY_NOTE_KO =
  '인간 작성 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명';
const HONESTY_NOTE_EN =
  'Human authorship itself cannot be proven — this registry only proves existence and non-tampering after the anchor time.';

interface RegisterInput {
  certId: string;
  projectId: string;
  certHash: string;
  chainTipHash: string | null;
  visibility: (typeof VISIBILITIES)[number];
  issuerType: (typeof ISSUER_TYPES)[number];
  githubCommitSha: string | null;
}

/** body 형식 검증 — 실패 사유 전부 수집 (한 번에 표면화, 부분 silent 금지) */
function parseRegisterBody(raw: unknown): { input: RegisterInput; issues: string[] } {
  const issues: string[] = [];
  const b = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const certId = typeof b.certId === 'string' ? b.certId.trim().toUpperCase() : '';
  if (!CERT_ID_REGEX.test(certId)) issues.push('certId: Crockford base32 26자 형식이 아님');

  const projectId = typeof b.projectId === 'string' ? b.projectId.trim() : '';
  if (!PROJECT_ID_REGEX.test(projectId)) issues.push('projectId: [A-Za-z0-9_-]{1,128} 형식이 아님');

  const certHash = typeof b.certHash === 'string' ? b.certHash.trim().toLowerCase() : '';
  if (!SHA256_HEX.test(certHash)) issues.push('certHash: sha256 hex 64자 형식이 아님');
  else if (certHash === EMPTY_SHA256) issues.push('certHash: 빈 문자열 SHA-256 — 빈 발급물은 등록 불가');

  // chainTipHash — optional (legacy 프로젝트는 hashed 이벤트 0건 → 체인 tip 없음)
  let chainTipHash: string | null = null;
  if (b.chainTipHash !== undefined && b.chainTipHash !== null && b.chainTipHash !== '') {
    const v = typeof b.chainTipHash === 'string' ? b.chainTipHash.trim().toLowerCase() : '';
    if (!SHA256_HEX.test(v)) issues.push('chainTipHash: sha256 hex 64자 형식이 아님 (생략 가능)');
    else chainTipHash = v;
  }

  const visibility = typeof b.visibility === 'string' ? b.visibility : '';
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) {
    issues.push(`visibility: ${VISIBILITIES.join('|')} 중 하나여야 함`);
  }

  // issuerType — optional, default 'self' (report-builder alpha default 와 일치)
  let issuerType: RegisterInput['issuerType'] = 'self';
  if (b.issuerType !== undefined && b.issuerType !== null) {
    if (typeof b.issuerType === 'string' && (ISSUER_TYPES as readonly string[]).includes(b.issuerType)) {
      issuerType = b.issuerType as RegisterInput['issuerType'];
    } else {
      issues.push(`issuerType: ${ISSUER_TYPES.join('|')} 중 하나여야 함 (생략 시 self)`);
    }
  }

  // githubCommitSha — optional (S8 GitHub anchoring 도입 전까지 보통 없음)
  let githubCommitSha: string | null = null;
  if (b.githubCommitSha !== undefined && b.githubCommitSha !== null && b.githubCommitSha !== '') {
    const v = typeof b.githubCommitSha === 'string' ? b.githubCommitSha.trim().toLowerCase() : '';
    if (!GIT_COMMIT_SHA.test(v)) issues.push('githubCommitSha: git commit sha hex 40자 형식이 아님 (생략 가능)');
    else githubCommitSha = v;
  }

  return {
    input: {
      certId,
      projectId,
      certHash,
      chainTipHash,
      visibility: visibility as RegisterInput['visibility'],
      issuerType,
      githubCommitSha,
    },
    issues,
  };
}

// ============================================================
// PART 2 — POST 핸들러
// ============================================================

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // --- Rate limit (10/min per IP — 발급은 드문 행위) ---
  const rl = checkRateLimit(ip, '/api/cp/register', { windowMs: 60_000, maxRequests: 10 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  // --- HMAC 시크릿 게이트 — 미설정이면 명시적 503 (silent 저장·하드코딩 fallback 금지) ---
  const hmacSecret = process.env.CP_REGISTRY_HMAC_SECRET?.trim();
  if (!hmacSecret) {
    return NextResponse.json(
      { error: 'registry_disabled', detail: 'CP_REGISTRY_HMAC_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }

  const fbProjectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!fbProjectId) {
    return NextResponse.json({ error: 'service_misconfigured' }, { status: 503 });
  }

  // --- 인증 필수 (checkout/route.ts Bearer 패턴 재사용) ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
  }
  const auth = await verifyFirebaseIdToken(authHeader.slice(7).trim());
  if (!auth) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  // --- 입력 검증 ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { input, issues } = parseRegisterBody(raw);
  if (issues.length > 0) {
    return NextResponse.json({ error: 'invalid_input', issues }, { status: 400 });
  }

  // --- 서버 시각 = 앵커 시점 (클라이언트 주장 시각 불수용) ---
  const generatedAt = new Date().toISOString();

  // --- HMAC-SHA256 서명 — 결정론 canonical 문자열 (버전 prefix → 향후 키/포맷 회전 대비) ---
  const canonical = [
    'v1',
    input.certId,
    input.projectId,
    input.certHash,
    input.chainTipHash ?? '',
    generatedAt,
    input.visibility,
    auth.uid,
    input.issuerType,
    input.githubCommitSha ?? '',
  ].join('|');
  const registrySignature = createHmac('sha256', hmacSecret).update(canonical).digest('hex');

  // --- Firestore 저장 (메타데이터만 — 콘텐츠 필드 0) ---
  const fields: Record<string, { stringValue?: string; timestampValue?: string }> = {
    certId: { stringValue: input.certId },
    projectId: { stringValue: input.projectId },
    certHash: { stringValue: input.certHash },
    generatedAt: { timestampValue: generatedAt },
    visibility: { stringValue: input.visibility },
    authorUid: { stringValue: auth.uid }, // 검증된 토큰의 uid — body 값 불수용
    issuerType: { stringValue: input.issuerType },
    registrySignature: { stringValue: registrySignature },
    signatureAlgo: { stringValue: 'hmac-sha256-v1' },
  };
  if (input.chainTipHash) fields.chainTipHash = { stringValue: input.chainTipHash };
  if (input.githubCommitSha) fields.githubCommitSha = { stringValue: input.githubCommitSha };

  let created: Awaited<ReturnType<typeof firestoreCreateDocument>>;
  try {
    created = await firestoreCreateDocument(fbProjectId, 'certificates', fields, {
      documentId: input.certId,
    });
  } catch (err) {
    logger.error('cp-register', 'firestore write threw', err);
    created = { ok: false, error: 'fetch_failed' };
  }

  if (!created.ok) {
    // write-once: 같은 certId 재등록 → Firestore 409 ALREADY_EXISTS
    if (created.error === 'http_409') {
      apiLog({
        level: 'info',
        event: 'cp_register_duplicate',
        route: '/api/cp/register',
        ip,
        meta: { certId: input.certId, uid: auth.uid },
      });
      return NextResponse.json(
        { error: 'already_registered', certId: input.certId },
        { status: 409 },
      );
    }
    if (created.error === 'no_service_account') {
      return NextResponse.json({ error: 'registry_unavailable' }, { status: 503 });
    }
    apiLog({
      level: 'error',
      event: 'cp_register_write_failed',
      route: '/api/cp/register',
      ip,
      error: created.error,
      meta: { certId: input.certId, uid: auth.uid },
    });
    return NextResponse.json({ error: 'registry_write_failed' }, { status: 502 });
  }

  apiLog({
    level: 'info',
    event: 'cp_registered',
    route: '/api/cp/register',
    ip,
    meta: {
      certId: input.certId,
      uid: auth.uid,
      visibility: input.visibility,
      hasChainTip: input.chainTipHash !== null,
      hasGithubSha: input.githubCommitSha !== null,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      certId: input.certId,
      registeredAt: generatedAt,
      signatureAlgo: 'hmac-sha256-v1',
      registrySignature,
      stored_fields: Object.keys(fields),
      privacy_note_ko:
        '메타데이터만 저장되었습니다 (원고 본문 0byte). 삭제 요청은 /api/user/delete 또는 관리자 문의.',
      honesty_note_ko: HONESTY_NOTE_KO,
      honesty_note_en: HONESTY_NOTE_EN,
    },
    { status: 201 },
  );
}

// IDENTITY_SEAL: cp-register | role=opt-in cert metadata registry (write-once) | inputs=Bearer+cert meta | outputs=HMAC-signed registry entry

// ============================================================
// CP Cert Registry Contract — 확인서 레지스트리 단일 계약 (S8 /verify)
// ============================================================
//
// 발급(레지스트리 등록) 측과 검증 측(/api/cp/verify GET lookup·POST 대조,
// /verify 공개 페이지)이 공유하는 canonical 해시·HMAC·Firestore 문서
// 스키마 정의 1곳. 등록기(S8-4)는 반드시 이 파일의 함수로 certHash/hmac 을
// 생성해야 검증 측 재계산과 일치한다 (정의 1곳 — chain-verify 패턴 대칭).
//
// Firestore collection: `cp_cert_registry`
//   certId          stringValue    (필수 — ProcessCertificate.id)
//   sealNumber      stringValue    (선택 — Witness Seal: LG-{YY}{MM}-{serial}-{hash4})
//   certHash        stringValue    (필수 — buildCertHashPayload() 의 SHA-256 hex)
//   chainTipHash    stringValue    (선택 — '' = hashed 이벤트 0건)
//   registeredAt    timestampValue (필수 — ISO 8601 UTC 등록 시각 = 앵커 시점)
//   visibility      stringValue    (선택 — CertificateView)
//   issuerType      stringValue    (선택 — CertificateIssuerType)
//   githubRepo      stringValue    (선택 — 'owner/repo' 공개 앵커 저장소)
//   githubCommitSha stringValue    (선택 — GitHub 앵커 commit SHA)
//   hmac            stringValue    (선택 — computeRegistryHmac() hex.
//                                   키 = 서버 env CP_REGISTRY_HMAC_SECRET — 절대 로그·응답 노출 금지)
//
// ⚠ 레지스트리는 원고·콘텐츠를 일절 저장하지 않는다 — 해시·메타만.
// ⚠ 정직 한계 (모든 verify 표면 의무 표기): 인간 작성 자체는 증명 불가 —
//    앵커 시점 이후 무변조·존재만 증명.
//
// [C] 결정론적 — LLM 호출 0, 네트워크 0 (순수 함수만)
// [G] save-engine/hash.ts 의 sha256·getSubtle 재사용 (중복 구현 X)
// [K] 단일 책임 — 계약 정의·해시·파서만 (Firestore I/O 는 호출 측)
// ============================================================

import type { ProcessCertificate } from './types';
import { sha256, getSubtle, utf8Encode, bytesToHex } from '../save-engine/hash';

// ============================================================
// PART 1 — 상수·타입
// ============================================================

/** Firestore 레지스트리 collection 이름 (등록기·검증기 공용). */
export const CP_REGISTRY_COLLECTION = 'cp_cert_registry';

/** HMAC 키 env 이름 (서버 전용 — 값은 어디에도 기록·노출 금지). */
export const CP_REGISTRY_HMAC_ENV = 'CP_REGISTRY_HMAC_SECRET';

/** 레지스트리 1 엔트리 (Firestore 문서의 파싱 결과). */
export interface CertRegistryEntry {
  certId: string;
  sealNumber?: string;
  certHash: string;
  chainTipHash?: string;
  registeredAt: string;
  visibility?: string;
  issuerType?: string;
  githubRepo?: string;
  githubCommitSha?: string;
  hmac?: string;
}

/**
 * 정직 한계 문구 — 모든 verify 표면(페이지·API 응답) 의무 표기.
 * "인간 작성 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명."
 */
export const HONESTY_LIMITATION = {
  ko: '본 검증은 인간 작성 자체를 증명하지 않습니다 — 앵커(등록) 시점 이후의 무변조·존재만 증명합니다.',
  en: 'This verification does NOT prove human authorship — it only proves existence and non-tampering since the anchor (registration) time.',
  ja: 'この検証は人間による執筆そのものを証明しません — アンカー（登録）時点以降の非改ざん・存在のみを証明します。',
  zh: '本验证不证明内容由人类撰写 — 仅证明自锚定（登记）时刻以来的存在性与未被篡改。',
} as const;

// ============================================================
// PART 2 — Canonical certHash (v1)
// ============================================================

/**
 * certHash canonical payload v1.
 * 핵심 불변 필드만 '\n' join — 등록 시점과 제출 시점의 cert 동일성 판단 기준.
 * 필드 추가/순서 변경 = 해시 호환성 파괴 → 반드시 'cp-cert-v2' prefix 로 버전 분기.
 */
export function buildCertHashPayload(cert: Partial<ProcessCertificate>): string {
  return [
    'cp-cert-v1',
    cert.id ?? '',
    cert.projectId ?? '',
    cert.manuscriptHash ?? '',
    cert.generatedAt ?? '',
    cert.reportVersion ?? '',
    cert.visibility ?? '',
    cert.timelineHash ?? '',
    cert.sourceSummaryHash ?? '',
    cert.limitationTextVersion ?? '',
    cert.chainTipHash ?? '',
    cert.sealNumber ?? '',
  ].join('\n');
}

/** cert 의 canonical SHA-256 hex (소문자 64자). */
export async function computeCertHash(cert: Partial<ProcessCertificate>): Promise<string> {
  return sha256(buildCertHashPayload(cert));
}

// ============================================================
// PART 3 — Registry HMAC (v1)
// ============================================================

/**
 * 레지스트리 엔트리 HMAC payload v1 — 레지스트리 자체 변조 검출용.
 * 등록 시 서버 secret 으로 서명, 검증 시 재계산 대조.
 */
export function buildRegistryHmacPayload(entry: {
  certId: string;
  certHash: string;
  chainTipHash?: string;
  registeredAt: string;
}): string {
  return [
    'cp-registry-v1',
    entry.certId,
    entry.certHash,
    entry.chainTipHash ?? '',
    entry.registeredAt,
  ].join('\n');
}

/** HMAC-SHA256 hex (소문자). secret 은 호출 측 env 에서만 — 절대 로그 금지. */
export async function computeRegistryHmac(
  secret: string,
  entry: { certId: string; certHash: string; chainTipHash?: string; registeredAt: string },
): Promise<string> {
  const subtle = getSubtle();
  const keyBytes = utf8Encode(secret);
  const keyBuf = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength,
  ) as ArrayBuffer;
  const key = await subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const msgBytes = utf8Encode(buildRegistryHmacPayload(entry));
  const msgBuf = msgBytes.buffer.slice(
    msgBytes.byteOffset,
    msgBytes.byteOffset + msgBytes.byteLength,
  ) as ArrayBuffer;
  const sig = await subtle.sign('HMAC', key, msgBuf);
  return bytesToHex(new Uint8Array(sig));
}

/** hex 문자열 상수 시간 비교 — 길이 불일치 시 false (조기 반환은 길이만 누설). */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================
// PART 4 — Firestore REST 문서 파서
// ============================================================

interface FirestoreValue {
  stringValue?: string;
  timestampValue?: string;
}

/**
 * firestoreListDocuments() 의 documents[i] → CertRegistryEntry.
 * 필수 필드(certId·certHash·registeredAt) 누락 시 null (손상 문서 skip).
 */
export function parseRegistryDocument(doc: unknown): CertRegistryEntry | null {
  if (!doc || typeof doc !== 'object') return null;
  const fields = (doc as { fields?: Record<string, FirestoreValue> }).fields;
  if (!fields) return null;

  const s = (k: string): string | undefined => fields[k]?.stringValue;
  const certId = s('certId');
  const certHash = s('certHash');
  const registeredAt = fields.registeredAt?.timestampValue ?? s('registeredAt');
  if (!certId || !certHash || !registeredAt) return null;

  const entry: CertRegistryEntry = { certId, certHash, registeredAt };
  const sealNumber = s('sealNumber');
  if (sealNumber) entry.sealNumber = sealNumber;
  const chainTipHash = s('chainTipHash');
  if (chainTipHash) entry.chainTipHash = chainTipHash;
  const visibility = s('visibility');
  if (visibility) entry.visibility = visibility;
  const issuerType = s('issuerType');
  if (issuerType) entry.issuerType = issuerType;
  const githubRepo = s('githubRepo');
  if (githubRepo) entry.githubRepo = githubRepo;
  const githubCommitSha = s('githubCommitSha');
  if (githubCommitSha) entry.githubCommitSha = githubCommitSha;
  const hmac = s('hmac');
  if (hmac) entry.hmac = hmac;
  return entry;
}

// IDENTITY_SEAL: PART-1 | role=registry schema contract | inputs=none | outputs=constants,types
// IDENTITY_SEAL: PART-2 | role=canonical cert hash v1 | inputs=cert | outputs=sha256 hex
// IDENTITY_SEAL: PART-3 | role=registry HMAC v1 | inputs=secret,entry | outputs=hmac hex
// IDENTITY_SEAL: PART-4 | role=firestore doc parser | inputs=REST doc | outputs=CertRegistryEntry|null

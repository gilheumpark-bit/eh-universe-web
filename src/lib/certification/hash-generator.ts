/**
 * Loreguard document hash helper.
 *
 * This helper creates a deterministic SHA-256 fingerprint for a local
 * document payload. It is not a C2PA signature, legal proof, or authorship
 * guarantee. Signed registry/C2PA-ready flows live under creative-process.
 */

import { canonicalJson, sha256 } from '../save-engine/hash';

export interface HashPayload {
  content: string;
  authorId: string;
  hciScore: number;
  timestamp: string;
}

/**
 * 주어진 페이로드로 무결성 확인용 지문을 생성합니다.
 * @param payload 해시에 포함될 문서 데이터
 * @returns SHA-256 hex 문자열. 기존 표시 호환을 위해 0x prefix를 붙입니다.
 */
export async function generateDocumentHash(payload: HashPayload): Promise<string> {
  const normalizedPayload = {
    kind: 'loreguard.document-hash.v1',
    content: payload.content,
    authorId: payload.authorId,
    hciScore: Number.isFinite(payload.hciScore) ? payload.hciScore : 0,
    timestamp: payload.timestamp,
  };
  return `0x${await sha256(canonicalJson(normalizedPayload))}`;
}

/**
 * 입력된 해시값이 현재 페이로드 지문과 일치하는지 확인합니다.
 */
export async function verifyDocumentHash(payload: HashPayload, originalHash: string): Promise<boolean> {
  const currentHash = await generateDocumentHash(payload);
  return currentHash === originalHash;
}

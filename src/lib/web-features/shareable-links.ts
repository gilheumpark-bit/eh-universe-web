// ============================================================
// Shareable Links — URL 하나로 결과물 공유
// ============================================================
// 웹에서만 가능한 핵심 기능. 설치형에선 파일 보내야 하지만
// 여기선 URL 하나로 원고/번역/코드/검증 결과를 공유.
//
// 구현 방식: 짧은 콘텐츠는 URL 해시에 압축 인코딩,
// 긴 콘텐츠는 /api/share 엔드포인트로 임시 저장.

const SHARE_BASE = '/share';
const MAX_HASH_LENGTH = 4000; // URL 해시에 넣을 수 있는 최대 길이

export type ShareType = 'novel' | 'code' | 'translation' | 'verify-report' | 'world-doc';

export interface SharePayload {
  type: ShareType;
  title: string;
  content: string;
  /** 추가 메타데이터 */
  meta?: Record<string, string>;
  /** 공유 만료 (시간, 기본 72h) */
  expiresInHours?: number;
}

export interface ShareResult {
  url: string;
  method: 'hash' | 'server';
  expiresAt?: number;
}

/**
 * 공유 링크 생성.
 * 짧은 콘텐츠: URL 해시에 base64 인코딩 (서버 불필요)
 * 긴 콘텐츠: /api/share에 POST → 단축 ID 반환
 */
export async function createShareLink(payload: SharePayload): Promise<ShareResult> {
  const compressed = compressPayload(payload);

  // 짧으면 URL 해시로 (서버 불필요, 영구 링크)
  if (compressed.length <= MAX_HASH_LENGTH) {
    const hash = encodeURIComponent(compressed);
    const url = `${window.location.origin}${SHARE_BASE}/${payload.type}#${hash}`;
    return { url, method: 'hash' };
  }

  // 길면 서버에 임시 저장
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        expiresInHours: payload.expiresInHours || 72,
      }),
    });
    if (res.ok) {
      const { id } = await res.json();
      const url = `${window.location.origin}${SHARE_BASE}/${payload.type}/${id}`;
      return { url, method: 'server', expiresAt: Date.now() + (payload.expiresInHours || 72) * 3600000 };
    }
  } catch { /* fallback */ }

  // 서버 실패 시 해시 잘라서라도 공유 (앞부분만)
  const truncated = compressPayload({ ...payload, content: payload.content.slice(0, 2000) + '\n\n[... truncated]' });
  const url = `${window.location.origin}${SHARE_BASE}/${payload.type}#${encodeURIComponent(truncated)}`;
  return { url, method: 'hash' };
}

/**
 * 공유 링크에서 페이로드 복원.
 * 해시 기반이면 URL에서 직접, 서버 기반이면 API 호출.
 */
export async function resolveShareLink(type: ShareType, hashOrId: string): Promise<SharePayload | null> {
  // 해시 기반
  if (hashOrId.startsWith('{') || hashOrId.startsWith('ey')) {
    try {
      return decompressPayload(decodeURIComponent(hashOrId));
    } catch { return null; }
  }

  // 서버 기반
  try {
    const res = await fetch(`/api/share/${hashOrId}`);
    if (res.ok) return await res.json();
  } catch { /* */ }
  return null;
}

/** 클립보드에 공유 링크 복사 */
export async function copyShareLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

// ── 압축/해제 (base64 JSON) ──

function compressPayload(payload: SharePayload): string {
  const json = JSON.stringify({
    t: payload.type,
    n: payload.title,
    c: payload.content,
    m: payload.meta,
  });
  return btoa(unescape(encodeURIComponent(json)));
}

function decompressPayload(compressed: string): SharePayload {
  const json = decodeURIComponent(escape(atob(compressed)));
  const parsed = JSON.parse(json);
  return {
    type: parsed.t,
    title: parsed.n,
    content: parsed.c,
    meta: parsed.m,
  };
}

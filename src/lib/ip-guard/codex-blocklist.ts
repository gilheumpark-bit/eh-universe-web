/**
 * Codex Brand Blocklist — 작가가 직접 관리하는 동적 금지 브랜드 사전 (2026-04-23 신설).
 *
 * 정적 `BRAND_BLOCKLIST`(brand-blocklist.ts)는 **전역 씨앗**.
 * 여기 정의된 구조는 작가가 프로젝트별 Codex에서 직접 추가·수정하는 **동적 엔트리**.
 *
 * 데이터 소스 (현재·계획):
 *   - **현재:** localStorage `loreguard:ip-guard:codex-blocklist:{projectId}` — 오프라인 우선, 즉시 동작.
 *   - **계획:** Firestore 미러링 (`users/{uid}/projects/{projectId}/codex/brand-blocklist`) — 후속 세션.
 *
 * 실구현 API: `loadCodexBrandBlocklist`, `upsertCodexBrandEntry`, `removeCodexBrandEntry`.
 */

import { BRAND_BLOCKLIST, type BrandEntry, type BrandCategory, type BrandSeverity } from './brand-blocklist';

// ============================================================
// PART 1 — Types
// ============================================================

/**
 * 작가가 Codex에 직접 추가한 동적 엔트리.
 * 정적 `BrandEntry`를 확장 — 소유 프로젝트·활성 여부 등 관리 메타 포함.
 */
export interface CodexBrandEntry extends BrandEntry {
  /** Codex 내 고유 ID — 수정·삭제 키 */
  readonly codexId: string;
  /** 소유 프로젝트 */
  readonly projectId: string;
  /** 작성자 UID (감사용) */
  readonly createdBy: string;
  /** 추가 시각 (ISO) */
  readonly createdAt: string;
  /** 활성 여부 — false면 스캔에서 제외 (삭제 없이 비활성) */
  readonly active: boolean;
  /** 작가 메모 (왜 등록했는지) */
  readonly note?: string;
}

export interface CodexBlocklistLoadOptions {
  readonly projectId: string;
  readonly includeInactive?: boolean;
}

// ============================================================
// PART 2 — 병합 유틸
// ============================================================

/**
 * 정적 블록리스트 + 작가 동적 엔트리를 하나의 리스트로 병합.
 * 동일 canonical이 있으면 **Codex 엔트리가 우선** (작가가 severity 조정 가능).
 */
export function mergeBlocklists(
  staticList: readonly BrandEntry[],
  codexList: readonly CodexBrandEntry[],
): BrandEntry[] {
  const byCanonical = new Map<string, BrandEntry>();
  for (const e of staticList) {
    byCanonical.set(e.canonical.toLowerCase(), e);
  }
  for (const e of codexList) {
    if (!e.active) continue;
    // Codex 엔트리를 BrandEntry로 좁혀서 저장 (codexId 등은 매칭 로직 무관)
    const plain: BrandEntry = {
      canonical: e.canonical,
      category: e.category,
      severity: e.severity,
      aliases: e.aliases,
      owner: e.owner,
    };
    byCanonical.set(e.canonical.toLowerCase(), plain);
  }
  return Array.from(byCanonical.values());
}

/** 정적 + 기본 빈 동적 리스트 — 작가가 등록 전까지 fallback */
export function defaultMergedBlocklist(): BrandEntry[] {
  return mergeBlocklists(BRAND_BLOCKLIST, []);
}

// ============================================================
// PART 3 — 로더 (localStorage 실구현)
// ============================================================

const STORAGE_PREFIX = 'loreguard:ip-guard:codex-blocklist:';

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

function safeParse(raw: string | null): readonly CodexBrandEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 최소 필드 검증 — 구조 깨진 엔트리는 제외
    return parsed.filter((e): e is CodexBrandEntry =>
      e && typeof e === 'object' &&
      typeof e.canonical === 'string' &&
      typeof e.codexId === 'string' &&
      typeof e.projectId === 'string' &&
      Array.isArray(e.aliases)
    );
  } catch {
    return [];
  }
}

/**
 * Codex 금지 브랜드 로더.
 *
 * 브라우저: localStorage 직독 (동기지만 Promise 인터페이스 유지 — 추후 Firestore
 * 비동기 전환 시 호출 측 수정 불필요).
 * 서버(SSR·Edge): 빈 배열.
 */
export async function loadCodexBrandBlocklist(
  options: CodexBlocklistLoadOptions,
): Promise<readonly CodexBrandEntry[]> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(storageKey(options.projectId));
  const entries = safeParse(raw);
  return options.includeInactive ? entries : entries.filter(e => e.active);
}

/** 동기 로더 — SSR 무시, 브라우저 전용. UI 초기 렌더에 유용. */
export function loadCodexBrandBlocklistSync(projectId: string, includeInactive = false): readonly CodexBrandEntry[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(storageKey(projectId));
  const entries = safeParse(raw);
  return includeInactive ? entries : entries.filter(e => e.active);
}

/**
 * 엔트리 추가·수정 (codexId 기준 upsert). 브라우저 전용.
 * 실패 시 false 반환 (localStorage 미가용·quota 초과 등).
 */
export function upsertCodexBrandEntry(entry: CodexBrandEntry): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const key = storageKey(entry.projectId);
    const current = safeParse(localStorage.getItem(key));
    const idx = current.findIndex(e => e.codexId === entry.codexId);
    const next = idx >= 0
      ? current.map((e, i) => (i === idx ? entry : e))
      : [...current, entry];
    localStorage.setItem(key, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/** codexId로 엔트리 삭제. 없으면 no-op(true 반환). */
export function removeCodexBrandEntry(projectId: string, codexId: string): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const key = storageKey(projectId);
    const current = safeParse(localStorage.getItem(key));
    const next = current.filter(e => e.codexId !== codexId);
    localStorage.setItem(key, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 4 — 감사 유틸
// ============================================================

/** Codex 엔트리 개수 + 활성·심각도 분포 */
export function auditCodexBlocklist(list: readonly CodexBrandEntry[]): {
  total: number;
  active: number;
  byCategory: Partial<Record<BrandCategory, number>>;
  bySeverity: Partial<Record<BrandSeverity, number>>;
} {
  const byCategory: Partial<Record<BrandCategory, number>> = {};
  const bySeverity: Partial<Record<BrandSeverity, number>> = {};
  let active = 0;
  for (const e of list) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
    if (e.active) active += 1;
  }
  return {
    total: list.length,
    active,
    byCategory,
    bySeverity,
  };
}

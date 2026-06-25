// ============================================================
// recents — 최근 항목 store (탭·컨텍스트·원고 편집)
// 순수 TS · React/DOM 직접 호출 0 · localStorage 추상화 허용.
// 절대금지 8파일 import 0 · 신규/기존 desktop 모듈 상호 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입·상수·기본값 정의
// ============================================================

/** 최근 항목 종류 — 탭 열람·컨텍스트 블록 조회·원고 편집 발생 시점 기록 */
export type RecentKind = 'tab' | 'context' | 'manuscript-edit';

export interface RecentEntry {
  /** 식별자 — 동일 id 재push 시 최상단으로 끌어올림 */
  id: string;
  kind: RecentKind;
  /** 사용자 표기용 라벨 */
  label: string;
  /** epoch ms — 호출자가 주입한 now (테스트 결정성) */
  at: number;
}

/** localStorage 키 */
export const RECENTS_KEY = 'noa_desktop_recents_v1';
/** 최대 보관 개수 — 초과 시 오래된 항목 절단 */
export const MAX_RECENTS = 20;

const VALID_KINDS: ReadonlySet<RecentKind> = new Set<RecentKind>([
  'tab',
  'context',
  'manuscript-edit',
]);

// ============================================================
// PART 2 — 내부 유틸 (정규화·가드)
// ============================================================

/** 단일 엔트리 정규화 — 비정상 입력 제거. 실패 시 null. */
function normalizeEntry(raw: unknown): RecentEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<RecentEntry>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const label = typeof r.label === 'string' ? r.label.trim() : '';
  const kind = r.kind as RecentKind | undefined;
  const at = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : NaN;
  if (!id || !label || !kind || !VALID_KINDS.has(kind) || !Number.isFinite(at)) {
    return null;
  }
  return { id, kind, label, at };
}

/** 리스트 정규화 — 비배열·이상 항목 필터. 항상 새 배열 반환. */
function normalizeList(raw: unknown): RecentEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentEntry[] = [];
  for (const item of raw) {
    const ne = normalizeEntry(item);
    if (ne) out.push(ne);
    if (out.length >= MAX_RECENTS) break;
  }
  return out;
}

// ============================================================
// PART 3 — 공개 API (load/save/push/clear)
// ============================================================

/** localStorage 로드 — 브라우저 외부·손상 JSON·이상 입력 모두 [] 반환. */
export function loadRecents(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    return normalizeList(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** localStorage 저장 — 브라우저 외부·quota 초과 시 무시. 정규화 후 저장. */
export function saveRecents(list: RecentEntry[] | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizeList(list);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(normalized));
  } catch {
    /* quota/private mode — 무시 */
  }
}

/**
 * 최근 항목 추가/갱신 — 순수 함수.
 * - 동일 id 존재 시 기존 항목 제거 후 최상단 추가 (끌어올림).
 * - 결과 길이 MAX_RECENTS 초과 시 꼬리 절단.
 * - 입력 엔트리가 비정상이면 원본 리스트(정규화)만 반환.
 */
export function pushRecent(
  list: RecentEntry[] | null | undefined,
  entry: RecentEntry | null | undefined,
): RecentEntry[] {
  const base = normalizeList(list);
  const ne = normalizeEntry(entry);
  if (!ne) return base;
  const filtered = base.filter((e) => e.id !== ne.id);
  const next = [ne, ...filtered];
  if (next.length > MAX_RECENTS) next.length = MAX_RECENTS;
  return next;
}

/** localStorage 항목 삭제 — 브라우저 외부 시 noop. */
export function clearRecents(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    /* 무시 */
  }
}

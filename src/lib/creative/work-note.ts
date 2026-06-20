// ============================================================
// work-note — 작업노트/대시보드 (09_보조 chg_068 흡수)
// 한국 웹소설 창작 작업노트를 단계(plan/draft/revise/publish)별로
// 집계하여 대시보드·요약 문자열을 산출하는 결정론적 휴리스틱.
// 순수 TS. React/DOM/fetch/LLM 의존 0. 현재시각 API 호출 0 (at은 호출자 주입).
// ============================================================

// ============================================================
// PART 1 — 타입 정의 & 단계 상수
// ============================================================

/** 작업노트 단계 — 기획/초고/퇴고/발행 4단계 */
export type WorkPhase = 'plan' | 'draft' | 'revise' | 'publish';

/** 단일 작업노트. at(타임스탬프 ms)은 호출자가 주입한다. */
export interface WorkNote {
  id: string;
  phase: WorkPhase;
  note: string;
  /** 호출자가 주입하는 작성 시각(epoch ms). 모듈 내부 생성 금지. */
  at: number;
}

/** 대시보드 — 노트 집계 결과 */
export interface Dashboard {
  totalNotes: number;
  byPhase: Record<string, number>;
  /** 가장 최근(at 최대) 노트의 단계. 노트 없으면 null. */
  lastPhase: WorkPhase | null;
}

/** 유효 단계 목록 — 순서가 요약 출력 순서를 결정한다. */
const PHASE_ORDER: readonly WorkPhase[] = ['plan', 'draft', 'revise', 'publish'];

/** 단계별 한국어 라벨 — 요약 문자열용 */
const PHASE_LABEL: Record<WorkPhase, string> = {
  plan: '기획',
  draft: '초고',
  revise: '퇴고',
  publish: '발행',
};

const VALID_PHASES: ReadonlySet<string> = new Set<string>(PHASE_ORDER);

// ============================================================
// PART 2 — 내부 유틸 (방어적 필터링)
// ============================================================

/**
 * 입력 노트 배열에서 유효한 항목만 추려낸다.
 * - 배열 아님 → 빈 배열
 * - null/비객체 항목 제거
 * - 잘못된 phase 제거 (VALID_PHASES 미포함)
 * - at이 유한수 아님 → 0으로 정규화 (정렬 안정성 보장)
 */
function sanitizeNotes(notes: WorkNote[]): WorkNote[] {
  if (!Array.isArray(notes)) return [];
  const out: WorkNote[] = [];
  for (const n of notes) {
    if (!n || typeof n !== 'object') continue;
    if (!VALID_PHASES.has((n as WorkNote).phase)) continue;
    const at = Number((n as WorkNote).at);
    out.push({
      id: typeof n.id === 'string' ? n.id : '',
      phase: n.phase,
      note: typeof n.note === 'string' ? n.note : '',
      at: Number.isFinite(at) ? at : 0,
    });
  }
  return out;
}

// ============================================================
// PART 3 — 공개 API: buildDashboard / summarizeNotes
// ============================================================

/**
 * 노트 배열 → 대시보드 집계.
 * 빈 배열·잘못된 phase·null 안전. lastPhase는 at 최대 노트의 단계.
 */
export function buildDashboard(notes: WorkNote[]): Dashboard {
  const clean = sanitizeNotes(notes);

  // byPhase는 전 단계 0으로 초기화하여 키 누락 방지 (소비측 안정성)
  const byPhase: Record<string, number> = {};
  for (const p of PHASE_ORDER) byPhase[p] = 0;

  let lastPhase: WorkPhase | null = null;
  let lastAt = -Infinity;
  for (const n of clean) {
    byPhase[n.phase] += 1;
    if (n.at > lastAt) {
      lastAt = n.at;
      lastPhase = n.phase;
    }
  }

  return { totalNotes: clean.length, byPhase, lastPhase };
}

/**
 * 노트 배열 → 단계별 요약 문자열.
 * "기획 2건 · 초고 1건 · 퇴고 0건 · 발행 0건" 형태.
 * 빈 입력 시 안내 문자열 반환.
 */
export function summarizeNotes(notes: WorkNote[]): string {
  const { byPhase, totalNotes } = buildDashboard(notes);
  if (totalNotes === 0) return '작업노트 없음';
  return PHASE_ORDER
    .map((p) => `${PHASE_LABEL[p]} ${byPhase[p]}건`)
    .join(' · ');
}

// ============================================================
// PART 4 — attachJournal: 작품 단위 누적 (init/draft/refine)
// ============================================================
//
// rank 17 — Studio ↔ 과정기록 work-note 인라인 동기화.
// 스토리지: localStorage `noa.creative.work-note.journal`
// 구조: { [workId]: Array<{ kind: 'init'|'draft'|'refine', at: number }> }
//
// 사상:
//  - studio 가 원고 생성/퇴고할 때마다 `attachJournal(workId, kind)` 호출
//  - 과정기록 UI 가 `summarizeJournalWeek(workId)` 로 "이번 주 N건" 조회
//  - 모든 timestamp(at) 은 호출자 주입. 모듈 내부 Date.now() 호출 0 (테스트 친화)
//
// [C] 안전성: SSR/private browsing 의 localStorage 미가용 모두 silent fallback
// [G] 성능: workId 별 entry 만 read/write (전체 walk X)
// [K] 간결성: 순수 함수 + storage adapter 1개

/** journal 이벤트 종류 — 초기 등록(init) / 초고(draft) / 퇴고(refine) */
export type JournalKind = 'init' | 'draft' | 'refine';

/** 단일 journal 항목 — work-note 와 다른 경량 스키마 (kind+at 만) */
export interface JournalEntry {
  kind: JournalKind;
  at: number;
}

/** journal week 요약 — 지난 7일 카운트 */
export interface JournalWeekSummary {
  init: number;
  draft: number;
  refine: number;
  /** 합계 — 모든 kind */
  total: number;
}

/** 유효 kind set — 미지 kind 차단 */
const VALID_KINDS: ReadonlySet<string> = new Set<string>(['init', 'draft', 'refine']);

/** journal localStorage 키 — 단일 통합 키 */
export const JOURNAL_STORAGE_KEY = 'noa.creative.work-note.journal';

/** 7일 (ms) */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * localStorage 안전 read 어댑터.
 * SSR / private browsing / quota 초과 모두 빈 객체로 fallback.
 */
function readJournalStore(): Record<string, JournalEntry[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage?.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, JournalEntry[]>;
  } catch {
    return {};
  }
}

/** localStorage 안전 write 어댑터. 실패 시 silent. */
function writeJournalStore(store: Record<string, JournalEntry[]>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota 초과 / private browsing — silent */
  }
}

/** workId 별 entry 배열을 sanitize. 잘못된 kind/at 제거. */
function sanitizeEntries(entries: unknown): JournalEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: JournalEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const kind = (e as JournalEntry).kind;
    if (!VALID_KINDS.has(kind)) continue;
    const at = Number((e as JournalEntry).at);
    if (!Number.isFinite(at)) continue;
    out.push({ kind, at });
  }
  return out;
}

/**
 * workId 에 journal entry 1건을 누적한다.
 *
 * - workId 빈문자/null → no-op (silent)
 * - kind 무효 → no-op (silent)
 * - at 미주입 시 caller 가 Date.now() 주입해야 함 (모듈 내부 시계 호출 0)
 * - localStorage 미가용 환경에선 silent fallback
 *
 * @returns 누적 성공 여부 (false = SSR/무효 입력/storage 실패)
 */
export function attachJournal(workId: string, kind: JournalKind, at: number): boolean {
  if (typeof workId !== 'string' || workId.length === 0) return false;
  if (!VALID_KINDS.has(kind)) return false;
  if (!Number.isFinite(at)) return false;
  if (typeof window === 'undefined') return false;

  const store = readJournalStore();
  const prev = sanitizeEntries(store[workId]);
  prev.push({ kind, at });
  store[workId] = prev;
  writeJournalStore(store);
  return true;
}

/**
 * workId 의 지난 7일 journal 카운트를 집계한다.
 *
 * - workId 빈문자/null → 0 dashboard
 * - now 기준 (at >= now - WEEK_MS) 만 카운트
 * - SSR / 미가용 → 0 dashboard
 *
 * @param workId 대상 작품 ID
 * @param now 기준 시각 (epoch ms). 호출자 주입 — 모듈 내부 Date.now() 호출 0.
 */
export function summarizeJournalWeek(workId: string, now: number): JournalWeekSummary {
  const empty: JournalWeekSummary = { init: 0, draft: 0, refine: 0, total: 0 };
  if (typeof workId !== 'string' || workId.length === 0) return empty;
  if (!Number.isFinite(now)) return empty;

  const store = readJournalStore();
  const entries = sanitizeEntries(store[workId]);
  const cutoff = now - WEEK_MS;

  let init = 0, draft = 0, refine = 0;
  for (const e of entries) {
    if (e.at < cutoff) continue;
    if (e.kind === 'init') init += 1;
    else if (e.kind === 'draft') draft += 1;
    else if (e.kind === 'refine') refine += 1;
  }
  return { init, draft, refine, total: init + draft + refine };
}

/**
 * 4언어 요약 문자열 — "이번 주: 초고 3건 · 퇴고 1건"
 * 빈 입력은 빈 string 반환 (UI 가 그 자체로 hide 결정).
 *
 * lang: 'ko' | 'en' | 'ja' | 'zh' — 비표준 입력은 ko 로 fallback
 */
export function renderJournalWeekText(
  summary: JournalWeekSummary,
  lang: 'ko' | 'en' | 'ja' | 'zh' = 'ko',
): string {
  if (!summary || summary.total === 0) return '';
  const labels: Record<'ko' | 'en' | 'ja' | 'zh', {
    prefix: string;
    init: string;
    draft: string;
    refine: string;
    unit: string;
    sep: string;
  }> = {
    ko: { prefix: '이번 주', init: '구상', draft: '초고', refine: '퇴고', unit: '건', sep: ' · ' },
    en: { prefix: 'This week', init: 'setup', draft: 'draft', refine: 'revise', unit: '', sep: ' · ' },
    ja: { prefix: '今週', init: '構想', draft: '初稿', refine: '推敲', unit: '件', sep: ' · ' },
    zh: { prefix: '本周', init: '构想', draft: '初稿', refine: '修订', unit: '件', sep: ' · ' },
  };
  const l = labels[lang] ?? labels.ko;
  const parts: string[] = [];
  if (summary.init > 0) parts.push(`${l.init} ${summary.init}${l.unit}`);
  if (summary.draft > 0) parts.push(`${l.draft} ${summary.draft}${l.unit}`);
  if (summary.refine > 0) parts.push(`${l.refine} ${summary.refine}${l.unit}`);
  if (parts.length === 0) return '';
  return `${l.prefix}: ${parts.join(l.sep)}`;
}

// ============================================================
// PART 1 — Types & Policy Table (대화 메모리 탭 차등 하이브리드)
//
// [N3-memory-hybrid — 2026-06-11]
// heavy(집필·세계관·플롯) = full 이력 + 장기 요약 1블록
// light(기타 채팅)       = sliding window(최근 20) + 이전 구간 요약 1블록
//
// 토큰 한계 역할 분담 (이중 적용 충돌 방지):
// - 본 모듈 = 상류 정책 (어떤 메시지를 보낼지 결정)
// - 요약 블록은 messages 배열이 아니라 systemInstruction 끝에 붙인다
//   → token-utils.truncateMessages(최후 안전망)는 messages만 자르므로
//     요약(장기 기억)은 컨텍스트 압박 상황에서도 살아남는다.
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';
import { logger } from '@/lib/logger';
// [특허 청구 9 — 해시연결요약] audit 체인의 해시 프리미티브 재사용 (SHA-256 + FNV 폴백)
import { canonicalJson, computeHash } from '@/lib/noa/audit/chain';

/** ai-providers.ChatMsg 와 동일 shape — 순환 의존 회피 위해 직접 정의 (token-utils 패턴) */
export interface MemoryMsg {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type MemoryTier = 'heavy' | 'light';

export interface TabMemoryPolicy {
  tier: MemoryTier;
  /** light: 최근 N개 유지. heavy: Infinity (full) */
  windowSize: number;
}

/**
 * heavy 탭 = 집필·세계관·플롯(연출).
 * - 'writing'      : TabAssistant 집필 탭 (NOW)
 * - 'writing-chat' : useWritingChat 전용 네임스페이스 (TabAssistant 'writing'과 이력이
 *                    분리된 별도 대화이므로 요약 store 충돌 방지를 위해 키 분리)
 * - 'world'        : 세계관 (NOL)
 * - 'direction'    : 플롯·장면 연출 (NOP)
 * - 'plot'         : 플롯 별칭 (loreguard 계열 호환)
 */
const HEAVY_TABS: ReadonlySet<string> = new Set(['writing', 'writing-chat', 'world', 'direction', 'plot']);

/** light 탭 sliding window 크기 */
export const LIGHT_WINDOW_SIZE = 20;

/** 요약 디바운스 — 마지막 요약 이후 사용자 턴 10회 누적마다 1회만 호출 */
export const SUMMARY_TURN_INTERVAL = 10;

/** 프로젝트가 아직 정해지지 않은 화면의 임시 격리 범위. */
const UNBOUND_PROJECT_SCOPE = 'no-project';

function normalizeProjectScopeId(projectId?: string | null): string {
  const safe = projectId?.trim();
  return safe ? encodeURIComponent(safe) : UNBOUND_PROJECT_SCOPE;
}

function getPolicyTabName(tab: string): string {
  if (!tab.startsWith('project:')) return tab;
  const parts = tab.split(':');
  return parts.length >= 3 ? parts.slice(2).join(':') : tab;
}

/**
 * 노아 대화/요약 저장 키를 프로젝트 단위로 격리한다.
 * 같은 탭이라도 프로젝트가 다르면 별도 요약 체인을 사용해야 한다.
 */
export function buildProjectScopedMemoryKey(baseTab: string, projectId?: string | null): string {
  return `project:${normalizeProjectScopeId(projectId)}:${baseTab || 'unknown'}`;
}

/** 탭 → 메모리 정책. 미등록 탭은 light 기본. */
export function getTabPolicy(tab: string): TabMemoryPolicy {
  const policyTab = getPolicyTabName(tab);
  return HEAVY_TABS.has(policyTab)
    ? { tier: 'heavy', windowSize: Number.POSITIVE_INFINITY }
    : { tier: 'light', windowSize: LIGHT_WINDOW_SIZE };
}

// IDENTITY_SEAL: PART-1 | role=policy table | inputs=tab | outputs=TabMemoryPolicy

// ============================================================
// PART 2 — getMemoryWindow (순수함수)
// ============================================================

export interface ChatMemoryWindow {
  /** API로 보낼 메시지 (heavy=full / light=최근 N) */
  messages: MemoryMsg[];
  /** systemInstruction 끝에 이어붙일 요약 블록 ('' = 요약 없음) */
  summaryBlock: string;
  tier: MemoryTier;
  /** light window로 잘려나간 이전 구간 메시지 수 */
  droppedCount: number;
}

/**
 * 탭 정책에 따른 대화 메모리 window 계산 — 순수함수 (side effect 0).
 * @param summary 사전 계산된 이전 구간 요약 (없으면 null/undefined → 블록 '')
 */
export function getMemoryWindow(
  tab: string,
  messages: MemoryMsg[],
  summary?: string | null,
): ChatMemoryWindow {
  const policy = getTabPolicy(tab);
  const safe = Array.isArray(messages) ? messages : [];
  const trimmedSummary = summary?.trim();
  const summaryBlock = trimmedSummary
    ? `\n\n[이전 대화 요약 / Prior conversation summary]\n${trimmedSummary}`
    : '';

  if (policy.tier === 'heavy') {
    return { messages: safe.slice(), summaryBlock, tier: 'heavy', droppedCount: 0 };
  }
  const droppedCount = Math.max(0, safe.length - policy.windowSize);
  return {
    messages: safe.slice(-policy.windowSize),
    summaryBlock,
    tier: 'light',
    droppedCount,
  };
}

// IDENTITY_SEAL: PART-2 | role=pure window | inputs=tab,messages,summary | outputs=ChatMemoryWindow

// ============================================================
// PART 3 — 요약 Store (localStorage persist · SSR-safe)
// ============================================================

const STORE_PREFIX = 'noa_chat_memory_summary_v1:';

export interface StoredSummary {
  summary: string;
  /** 이 요약이 커버한 이전 구간의 사용자 턴 수 (디바운스 기준점) */
  coveredTurns: number;
  updatedAt: number;
  /**
   * [특허 청구 9 — 해시연결요약] 직전 요약 블록의 해시.
   * 요약 n+1이 요약 n의 해시를 참조 → 변조 시 재계산 해시와 불일치로 검출.
   * additive 필드 (옵셔널) — 기존 소비처(summary 문자열만 사용)는 무파괴.
   * '' = genesis(직전 요약 없음) / undefined = legacy 레코드(부착 이전 저장본).
   */
  prevSummaryHash?: string;
}

/**
 * [특허 청구 9 — 해시연결요약] 요약 블록의 체인 해시 계산.
 * audit/chain.ts의 canonicalJson(키 정렬 결정론) + computeHash(SHA-256·FNV 폴백) 재사용.
 * prevSummaryHash까지 해시 입력에 포함 → 중간 블록 변조 시 후속 전체 링크가 깨진다.
 */
export async function computeSummaryHash(s: StoredSummary): Promise<string> {
  return computeHash(
    canonicalJson({
      summary: s.summary,
      coveredTurns: s.coveredTurns,
      updatedAt: s.updatedAt,
      prevSummaryHash: s.prevSummaryHash ?? '',
    }),
  );
}

/**
 * [특허 청구 9] 인접 요약 블록 링크 검증 — prev 재계산 해시 === next.prevSummaryHash.
 * next에 해시 미부착(legacy/genesis) 시 false (검증 불가 = 불일치 취급 — 보수적).
 */
export async function verifySummaryLink(
  prev: StoredSummary,
  next: StoredSummary,
): Promise<boolean> {
  if (!next.prevSummaryHash) return false;
  return (await computeSummaryHash(prev)) === next.prevSummaryHash;
}

export function loadStoredSummary(tab: string): StoredSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${STORE_PREFIX}${tab}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSummary;
    if (typeof parsed?.summary !== 'string' || !parsed.summary) return null;
    return {
      summary: parsed.summary,
      coveredTurns: typeof parsed.coveredTurns === 'number' ? parsed.coveredTurns : 0,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      // [청구 9] 체인 해시 보존 — 누락 시 재로드에서 링크가 끊기므로 round-trip 필수
      ...(typeof parsed.prevSummaryHash === 'string'
        ? { prevSummaryHash: parsed.prevSummaryHash }
        : {}),
    };
  } catch {
    return null;
  }
}

function saveStoredSummary(tab: string, data: StoredSummary): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORE_PREFIX}${tab}`, JSON.stringify(data));
  } catch {
    /* quota/private mode — 요약 미저장은 non-blocking */
  }
}

/** 대화 클리어 시 호출 — 이전 대화 요약이 새 대화로 누수되는 것 차단 */
export function clearStoredSummary(tab: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORE_PREFIX}${tab}`);
  } catch {
    /* non-blocking */
  }
}

// IDENTITY_SEAL: PART-3 | role=summary store | inputs=tab | outputs=StoredSummary|null

// ============================================================
// PART 4 — 백그라운드 요약 스케줄러 (디바운스 + 무요약 폴백)
// ============================================================

/** 탭별 in-flight 가드 — 동시 중복 요약 호출 차단 */
const inFlight = new Set<string>();

function countUserTurns(msgs: MemoryMsg[]): number {
  let n = 0;
  for (const m of msgs) if (m.role === 'user') n++;
  return n;
}

/** 구셸(episode-summarizer) 입력 상한 — 내부 slice(0, 3000)와 정합 */
const SUMMARY_INPUT_CAP = 3000;

/**
 * 이전 구간(최근 LIGHT_WINDOW_SIZE 제외) 요약을 백그라운드로 갱신.
 * - fire-and-forget — 대화 흐름을 절대 차단하지 않는다.
 * - 디바운스: 첫 overflow 시 1회 → 이후 사용자 턴 SUMMARY_TURN_INTERVAL(10)회 누적마다 1회.
 * - 실패(null/throw) 시 무요약 폴백 — 기존 요약 유지, 에러 전파 X.
 * - rolling summary: 직전 요약 + 이전 구간 최신 내용을 합쳐 재요약 (요약 정체 방지).
 * - heavy 탭도 수행 — full 이력이 truncateMessages(최후 안전망)에 잘릴 때의 장기 기억 보존.
 */
export function maybeScheduleSummary(
  tab: string,
  messages: MemoryMsg[],
  language: AppLanguage,
): void {
  if (typeof window === 'undefined') return;
  const safe = Array.isArray(messages) ? messages : [];
  const older = safe.slice(0, Math.max(0, safe.length - LIGHT_WINDOW_SIZE));
  if (older.length === 0) return;

  const olderTurns = countUserTurns(older);
  if (olderTurns === 0) return;

  const stored = loadStoredSummary(tab);
  const covered = stored?.coveredTurns ?? 0;
  const due = covered === 0 ? olderTurns >= 1 : olderTurns - covered >= SUMMARY_TURN_INTERVAL;
  if (!due || inFlight.has(tab)) return;

  inFlight.add(tab);
  void (async () => {
    try {
      const prevBlock = stored?.summary ? `[이전 요약]\n${stored.summary}\n\n` : '';
      const olderText = older
        .map((m) => `${m.role === 'user' ? 'USER' : 'AI'}: ${m.content}`)
        .join('\n');
      // 직전 요약을 머리에 두고, 이전 구간의 "최신" 내용 tail을 붙인다
      // (episode-summarizer는 앞 3000자만 읽으므로 tail로 잘라 요약이 전진하게 함)
      const tailBudget = Math.max(0, SUMMARY_INPUT_CAP - prevBlock.length);
      const transcript = prevBlock + olderText.slice(-tailBudget);

      // 구셸 요약 모듈 재사용 — detailed 500자 · temperature 0.3 · 실패 시 null
      const { generateDetailedSummary } = await import('@/engine/episode-summarizer');
      const summary = await generateDetailedSummary(transcript, language);
      if (summary) {
        // [특허 청구 9 — 해시연결요약] 새 요약 블록에 직전 블록 해시 부착.
        // computeHash는 async지만 이 경로는 이미 백그라운드 async IIFE(fire-and-forget)
        // 내부이므로 await 추가가 기존 sync 호출 흐름(대화 진행)을 깨지 않음 — 무파괴 선택.
        const prevSummaryHash = stored ? await computeSummaryHash(stored) : '';
        saveStoredSummary(tab, {
          summary,
          coveredTurns: olderTurns,
          updatedAt: Date.now(),
          prevSummaryHash,
        });
      }
      // summary === null → 무요약 폴백 (기존 요약 유지)
    } catch (err) {
      logger.warn('ChatMemoryPolicy', 'background summary failed (non-blocking)', err);
    } finally {
      inFlight.delete(tab);
    }
  })();
}

// IDENTITY_SEAL: PART-4 | role=debounced background summarizer | inputs=tab,messages,language | outputs=void (store side effect)

// ============================================================
// PART 5 — 통합 진입점
// ============================================================

/**
 * 호출부 단일 진입점: 저장된 요약 로드 → 순수 window 계산 → 백그라운드 요약 스케줄.
 * SSR에서는 store 미접근 + 스케줄 no-op (순수 window만 동작).
 */
export function applyMemoryPolicy(
  tab: string,
  messages: MemoryMsg[],
  language: AppLanguage,
): ChatMemoryWindow {
  const stored = loadStoredSummary(tab);
  maybeScheduleSummary(tab, messages, language);
  return getMemoryWindow(tab, messages, stored?.summary ?? null);
}

// IDENTITY_SEAL: PART-5 | role=integration entry | inputs=tab,messages,language | outputs=ChatMemoryWindow

// ============================================================
// PART 1 — Public journal API (Spec Part 5/6)
// ============================================================
//
// append / read / verify 공용 진입. 하위 모듈 조립:
//   - hash: contentHash 계산
//   - hlc: clock tick
//   - writer-queue: serialize
//   - atomic-write: tier routing + retry

import type {
  JournalEntry,
  JournalPayload,
  JournalAuthor,
  JournalEntryType,
  AppendResult,
  HLC,
  VerifyResult,
} from './types';
import { CURRENT_JOURNAL_VERSION, GENESIS } from './types';
import { hashPayload, verifyChain as verifyChainImpl } from './hash';
import { tickLocal, ulid, getNodeId, zeroHLC } from './hlc';
import { getDefaultWriterQueue } from './writer-queue';
import { performAtomicAppend } from './atomic-write';
import { routerGetTip, routerListEntries } from './storage-router';

// ============================================================
// PART 2 — HLC state (tab 수준 단일)
// ============================================================

let currentHLC: HLC = zeroHLC();

function advanceHLC(): HLC {
  currentHLC = tickLocal(currentHLC);
  return currentHLC;
}

export function getCurrentHLC(): HLC {
  return { ...currentHLC };
}

export function seedHLCFromTip(hlc: HLC): void {
  // physical/logical이 더 큰 값으로 세팅(체인 시드)
  if (hlc.physical > currentHLC.physical || (hlc.physical === currentHLC.physical && hlc.logical > currentHLC.logical)) {
    currentHLC = { physical: hlc.physical, logical: hlc.logical, nodeId: currentHLC.nodeId };
  }
}

// ============================================================
// PART 3 — session/tab identity
// ============================================================

const SESSION_KEY = 'noa_studio_session';
function resolveSessionId(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = localStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const fresh = ulid();
      localStorage.setItem(SESSION_KEY, fresh);
      return fresh;
    }
  } catch { /* private mode */ }
  return 'fallback-session';
}

// ============================================================
// PART 4 — appendEntry
// ============================================================

export interface AppendOptions {
  entryType: JournalEntryType;
  payload: JournalPayload;
  createdBy: JournalAuthor;
  /** 특정 projectId 할당 (null = 전역 엔트리) */
  projectId?: string | null;
  /** parentHash 강제 지정 (migration용). 생략 시 현재 tip 기반. */
  parentHash?: string;
}

/**
 * 새 엔트리 조립 + 저장. 단일 WriterQueue 통과로 race 방지.
 * 내부적으로 tip 조회 → parentHash 확정 → clock tick → hash → append.
 */
export async function appendEntry(options: AppendOptions): Promise<AppendResult> {
  const queue = getDefaultWriterQueue();
  return queue.enqueue<AppendResult>(async () => {
    const parentHash = options.parentHash ?? await resolveParentHash();
    const contentHash = await hashPayload(options.payload);
    const clock = advanceHLC();
    const entry: JournalEntry = {
      id: ulid(clock.physical),
      clock,
      sessionId: resolveSessionId(),
      tabId: getNodeId(),
      projectId: options.projectId ?? null,
      entryType: options.entryType,
      parentHash,
      contentHash,
      payload: options.payload,
      createdBy: options.createdBy,
      journalVersion: CURRENT_JOURNAL_VERSION,
    };
    return performAtomicAppend(entry);
  });
}

async function resolveParentHash(): Promise<string> {
  const tip = await routerGetTip();
  if (!tip.tipId) return GENESIS;
  const entries = await routerListEntries({ fromId: tip.tipId, toId: tip.tipId });
  const latest = entries.entries[0];
  if (latest) return latest.contentHash;
  return GENESIS;
}

// ============================================================
// PART 5 — readAll / verify
// ============================================================

export async function readAllEntries(): Promise<JournalEntry[]> {
  const { entries } = await routerListEntries();
  return entries;
}

export async function verifyJournal(): Promise<VerifyResult> {
  const entries = await readAllEntries();
  const r = await verifyChainImpl(entries);
  return {
    ok: r.ok,
    breakAt: r.breakAt,
    reason: r.reason,
    scanned: r.scanned,
  };
}

// ============================================================
// PART 6 — Init entry (Spec 7.1 Step 3)
// ============================================================

/**
 * journal이 비어 있을 때 호출. 빈 Project[] init 엔트리를 GENESIS chain으로 기록.
 */
export async function appendInitEntry(): Promise<AppendResult> {
  return appendEntry({
    entryType: 'init',
    payload: { schemaVersion: 1, projectsEmpty: true },
    createdBy: 'system',
    projectId: null,
    parentHash: GENESIS,
  });
}

// ============================================================
// PART 7 — Test helpers
// ============================================================

export function resetJournalHLCForTests(): void {
  currentHLC = zeroHLC();
}

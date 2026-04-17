// ============================================================
// Mobile Sketch Bridge — 데스크톱 ↔ 모바일 양방향 동기화
// ============================================================
// 동일 브라우저 localStorage 기반 양방향 브릿지.
// 다른 기기 sync는 추후 Firestore/Supabase로 확장.
// ============================================================

import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Types
// ============================================================

export interface MobileSketchMemo {
  id: string;
  title: string;
  content: string;
  type: 'world' | 'character' | 'plot';
  createdAt: number;
  updatedAt: number;
  /** 데스크톱에서 push된 경우 출처 프로젝트 id */
  sourceProjectId?: string;
  /** 데스크톱에서 push된 경우 출처 세션 id */
  sourceSessionId?: string;
}

export interface MobileSketchData {
  worldMemos: MobileSketchMemo[];
  characters: MobileSketchMemo[];
  plots: MobileSketchMemo[];
  lastSyncedAt?: number;
}

const STORAGE_KEY = 'noa_mobile_sketch';

// ============================================================
// PART 2 — Read / Write
// ============================================================

/**
 * 현재 브라우저의 모바일 스케치 전체 로드.
 * 없거나 파싱 실패 시 빈 구조 반환.
 */
export function loadMobileSketch(): MobileSketchData {
  if (typeof window === 'undefined') {
    return { worldMemos: [], characters: [], plots: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { worldMemos: [], characters: [], plots: [] };
    const parsed = JSON.parse(raw) as Partial<MobileSketchData>;
    return {
      worldMemos: Array.isArray(parsed.worldMemos) ? parsed.worldMemos : [],
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      plots: Array.isArray(parsed.plots) ? parsed.plots : [],
      lastSyncedAt: parsed.lastSyncedAt,
    };
  } catch (err) {
    logger.warn('MobileSketchBridge', 'load failed', err);
    return { worldMemos: [], characters: [], plots: [] };
  }
}

/** 스케치 전체 저장 (quota 초과 시 false) */
export function saveMobileSketch(data: MobileSketchData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    logger.warn('MobileSketchBridge', 'save failed (quota?)', err);
    return false;
  }
}

// ============================================================
// PART 3 — Desktop → Mobile Push
// ============================================================

export interface DesktopPushInput {
  projectId?: string;
  sessionId?: string;
  worldItems?: Array<{ id?: string; title: string; content: string }>;
  characters?: Array<{ id?: string; name: string; description: string }>;
  plots?: Array<{ id?: string; title: string; summary: string }>;
  /** 기존 모바일 스케치를 덮어쓸지 (기본 false, merge) */
  replace?: boolean;
}

/**
 * 데스크톱 스튜디오의 세계관/캐릭터/플롯을 모바일 스케치로 push.
 * merge 모드: 기존 것 유지 + 새 메모 추가 (id 중복은 업데이트)
 */
export function pushDesktopToMobile(input: DesktopPushInput): { added: number; updated: number } {
  const now = Date.now();
  const current = input.replace
    ? { worldMemos: [], characters: [], plots: [] }
    : loadMobileSketch();

  let added = 0;
  let updated = 0;

  const mergeInto = (list: MobileSketchMemo[], items: Array<{ id?: string; title?: string; name?: string; content?: string; description?: string; summary?: string }>, type: MobileSketchMemo['type']) => {
    for (const item of items) {
      const id = item.id ?? `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`;
      const title = item.title ?? item.name ?? `Untitled ${type}`;
      const content = item.content ?? item.description ?? item.summary ?? '';
      const existingIdx = list.findIndex(m => m.id === id);
      const memo: MobileSketchMemo = {
        id,
        title,
        content,
        type,
        createdAt: existingIdx >= 0 ? list[existingIdx].createdAt : now,
        updatedAt: now,
        sourceProjectId: input.projectId,
        sourceSessionId: input.sessionId,
      };
      if (existingIdx >= 0) {
        list[existingIdx] = memo;
        updated++;
      } else {
        list.push(memo);
        added++;
      }
    }
  };

  if (input.worldItems) mergeInto(current.worldMemos, input.worldItems, 'world');
  if (input.characters) mergeInto(current.characters, input.characters, 'character');
  if (input.plots) mergeInto(current.plots, input.plots, 'plot');

  current.lastSyncedAt = now;
  saveMobileSketch(current);

  // 모바일 화면에 새로 고침 알림 (같은 탭 다른 컴포넌트용)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:mobile-sketch-updated', {
      detail: { added, updated, source: 'desktop-push' },
    }));
  }

  return { added, updated };
}

// ============================================================
// PART 4 — Mobile → Desktop (기존 MobileSketchImportBanner와 연결)
// ============================================================

/**
 * 모바일 스케치가 있는지 빠르게 체크 (배너 표시 여부용).
 */
export function hasMobileSketchData(): boolean {
  const data = loadMobileSketch();
  return data.worldMemos.length > 0 || data.characters.length > 0 || data.plots.length > 0;
}

/**
 * 모바일 스케치 요약 (데스크톱 배너/툴바 표시용).
 */
export function summarizeMobileSketch(): { total: number; world: number; characters: number; plots: number; lastSyncedAt?: number } {
  const d = loadMobileSketch();
  return {
    total: d.worldMemos.length + d.characters.length + d.plots.length,
    world: d.worldMemos.length,
    characters: d.characters.length,
    plots: d.plots.length,
    lastSyncedAt: d.lastSyncedAt,
  };
}

/**
 * 모바일 스케치 초기화 (데스크톱 pull 후 정리 용).
 */
export function clearMobileSketch(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('noa:mobile-sketch-updated', {
      detail: { cleared: true },
    }));
  } catch (err) {
    logger.warn('MobileSketchBridge', 'clear failed', err);
  }
}

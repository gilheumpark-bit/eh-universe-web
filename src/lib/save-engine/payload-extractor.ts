// ============================================================
// payload-extractor — M1.5.3 탭별 Shadow 쓰기 페이로드 추출
// ============================================================
//
// Primary 저장은 전체 Project[] 스냅샷 하나로 모든 탭을 cover한다.
// Shadow 쓰기는 "어느 탭이 바뀌었는가" 를 구분해야 교차 오염이 없다.
// 이 모듈은 주어진 projects + (sessionId, episode?) 으로부터 각 탭의
// 관련 필드만 추출한다. 해시는 추출된 payload만으로 계산한다.
//
// [원칙 1] 순수 함수. 입력 projects 불변 — 읽기만.
// [원칙 2] null-safe. 비정상 입력(빈 배열/미존재 id/누락 config) 에서 throw 없음.
// [원칙 3] Canonical 비교 가능성. 반환값은 JSON.stringify/canonicalJson 가능 모양.
// [원칙 4] 해시 독립성. Rulebook 편집이 Character 해시 바꾸지 않음.
// [원칙 5] 최소 복사. 가능한 한 참조 공유 (shadow 경로는 snapshot 이므로 OK).
//
// [C] 모든 옵셔널 필드 접근은 옵셔널 체인 + null 가드.
// [G] 단일 loop. projects/sessions 탐색 1회.
// [K] extractor 5개 + 유틸 2개 — 모두 20줄 이하.
//
// @module lib/save-engine/payload-extractor

// ============================================================
// PART 1 — Imports & types
// ============================================================

import type {
  Project,
  ChatSession,
  EpisodeManuscript,
  SceneDirectionData,
  Character,
  CharRelation,
  WorldSimData,
  SimulatorRef,
  StyleProfile,
  EpisodeSceneSheet,
} from '@/lib/studio-types';

/**
 * 탭별 Shadow 쓰기에 사용되는 payload 타입 — 전부 canonical JSON 직렬화 가능.
 *
 * 각 payload 는 "해당 탭 편집 시에만 바뀌는 필드"만 포함하도록 설계되어
 * 탭 간 해시가 교차 오염되지 않는다.
 */
export interface ManuscriptPayload {
  /** 식별용 — 세션/에피소드 좌표. 해시에 포함됨 (다른 세션/에피소드는 다른 해시). */
  sessionId: string;
  episode: number | null;
  /** EpisodeManuscript — 없으면 null. */
  manuscript: EpisodeManuscript | null;
}

export interface SceneDirectionPayload {
  sessionId: string;
  /** config.sceneDirection — 없으면 null. */
  sceneDirection: SceneDirectionData | null;
  /** config.episodeSceneSheets — 없으면 빈 배열. Rulebook/SceneSheet 를 함께 다룸. */
  episodeSceneSheets: EpisodeSceneSheet[];
}

export interface CharacterPayload {
  sessionId: string;
  characters: Character[];
  charRelations: CharRelation[];
}

export interface WorldSimPayload {
  sessionId: string;
  worldSimData: WorldSimData | null;
  simulatorRef: SimulatorRef | null;
  /**
   * StoryConfig의 worldbuilding 계열 스칼라 필드 (corePremise/powerStructure/...).
   * World 탭 편집 시 같이 바뀔 수 있어 묶어서 해싱.
   */
  worldFields: WorldFieldSnapshot;
}

export interface StylePayload {
  sessionId: string;
  styleProfile: StyleProfile | null;
}

/** World 탭에서 다루는 스칼라 필드 snapshot — string? 만 모아서 해시. */
export interface WorldFieldSnapshot {
  corePremise: string;
  powerStructure: string;
  currentConflict: string;
  worldHistory: string;
  socialSystem: string;
  economy: string;
  magicTechSystem: string;
  factionRelations: string;
  survivalEnvironment: string;
  culture: string;
  religion: string;
  education: string;
  lawOrder: string;
  taboo: string;
  dailyLife: string;
  travelComm: string;
  truthVsBeliefs: string;
}

/** 식별 안 된 경우 기본 payload — 해시가 상수가 되어 Shadow 엔트리 0 유도. */
const EMPTY_SENTINEL = '__shadow_empty_session__' as const;

// ============================================================
// PART 2 — Helpers
// ============================================================

/**
 * sessionId로 ChatSession 찾기. 미존재 시 null.
 * projects 전체 순회 (O(N*M)) — 실제로는 N≤50, M≤50 수준이라 무관.
 */
function findSession(projects: Project[], sessionId: string | null): ChatSession | null {
  if (!sessionId) return null;
  if (!Array.isArray(projects)) return null;
  for (const p of projects) {
    if (!p || !Array.isArray(p.sessions)) continue;
    for (const s of p.sessions) {
      if (s && s.id === sessionId) return s;
    }
  }
  return null;
}

/** 옵셔널 string → 빈 문자열. Canonical 비교 안정성. */
function s(v: string | undefined | null): string {
  return typeof v === 'string' ? v : '';
}

// ============================================================
// PART 3 — Extractors (5 operations)
// ============================================================

/**
 * Writing 탭 — 특정 세션의 특정 에피소드 원고.
 * episode 미지정 시 config.episode 를 기준 에피소드로 사용.
 * 에피소드 미존재 시 manuscript=null (해시는 sessionId+episode 으로 안정).
 */
export function extractManuscript(
  projects: Project[],
  sessionId: string | null,
  episode?: number,
): ManuscriptPayload {
  const sid = sessionId ?? EMPTY_SENTINEL;
  const session = findSession(projects, sessionId);
  if (!session) {
    return { sessionId: sid, episode: episode ?? null, manuscript: null };
  }
  const targetEp = episode ?? session.config?.episode ?? null;
  const manuscripts = session.config?.manuscripts ?? [];
  const manuscript =
    targetEp == null
      ? null
      : manuscripts.find((m) => m && m.episode === targetEp) ?? null;
  return { sessionId: session.id, episode: targetEp, manuscript };
}

/**
 * Rulebook/SceneSheet 탭 — sceneDirection + episodeSceneSheets.
 * 두 필드는 편집 UI 상 인접해 하나의 operation 으로 묶는다.
 */
export function extractSceneDirection(
  projects: Project[],
  sessionId: string | null,
): SceneDirectionPayload {
  const sid = sessionId ?? EMPTY_SENTINEL;
  const session = findSession(projects, sessionId);
  if (!session) {
    return { sessionId: sid, sceneDirection: null, episodeSceneSheets: [] };
  }
  return {
    sessionId: session.id,
    sceneDirection: session.config?.sceneDirection ?? null,
    episodeSceneSheets: Array.isArray(session.config?.episodeSceneSheets)
      ? session.config.episodeSceneSheets
      : [],
  };
}

/**
 * Character 탭 — characters[] + charRelations[].
 * 캐릭터 관계는 캐릭터 편집 맥락이라 함께 해싱.
 */
export function extractCharacters(
  projects: Project[],
  sessionId: string | null,
): CharacterPayload {
  const sid = sessionId ?? EMPTY_SENTINEL;
  const session = findSession(projects, sessionId);
  if (!session) {
    return { sessionId: sid, characters: [], charRelations: [] };
  }
  return {
    sessionId: session.id,
    characters: Array.isArray(session.config?.characters) ? session.config.characters : [],
    charRelations: Array.isArray(session.config?.charRelations) ? session.config.charRelations : [],
  };
}

/**
 * World/Planning 탭 — worldSimData + simulatorRef + worldbuilding 스칼라 필드.
 * 스칼라 필드들은 WorldFieldSnapshot 으로 묶어 canonical 안정화.
 */
export function extractWorldSim(
  projects: Project[],
  sessionId: string | null,
): WorldSimPayload {
  const sid = sessionId ?? EMPTY_SENTINEL;
  const session = findSession(projects, sessionId);
  const worldFields = buildWorldFieldSnapshot(session?.config);
  if (!session) {
    return { sessionId: sid, worldSimData: null, simulatorRef: null, worldFields };
  }
  return {
    sessionId: session.id,
    worldSimData: session.config?.worldSimData ?? null,
    simulatorRef: session.config?.simulatorRef ?? null,
    worldFields,
  };
}

/** Style 탭 — styleProfile 만. 단일 구조체이므로 여기서는 포장만. */
export function extractStyle(
  projects: Project[],
  sessionId: string | null,
): StylePayload {
  const sid = sessionId ?? EMPTY_SENTINEL;
  const session = findSession(projects, sessionId);
  if (!session) {
    return { sessionId: sid, styleProfile: null };
  }
  return { sessionId: session.id, styleProfile: session.config?.styleProfile ?? null };
}

// ============================================================
// PART 4 — Worldbuilding scalar snapshot
// ============================================================

/**
 * WorldFieldSnapshot 빌더. 모든 필드를 string (빈 값은 '') 로 정규화 — canonical 안정.
 * config 미존재 시 모든 필드 ''.
 */
function buildWorldFieldSnapshot(
  config: Project['sessions'][number]['config'] | undefined,
): WorldFieldSnapshot {
  // 필드 순서는 타입 정의 순서 유지. canonical JSON 은 key 정렬하므로 순서 무관하지만
  // 가독성 + canonical 예측 가능성 유지.
  return {
    corePremise: s(config?.corePremise),
    powerStructure: s(config?.powerStructure),
    currentConflict: s(config?.currentConflict),
    worldHistory: s(config?.worldHistory),
    socialSystem: s(config?.socialSystem),
    economy: s(config?.economy),
    magicTechSystem: s(config?.magicTechSystem),
    factionRelations: s(config?.factionRelations),
    survivalEnvironment: s(config?.survivalEnvironment),
    culture: s(config?.culture),
    religion: s(config?.religion),
    education: s(config?.education),
    lawOrder: s(config?.lawOrder),
    taboo: s(config?.taboo),
    dailyLife: s(config?.dailyLife),
    travelComm: s(config?.travelComm),
    truthVsBeliefs: s(config?.truthVsBeliefs),
  };
}

// IDENTITY_SEAL: PART-1..4 | role=payload-extractor | inputs=projects+sessionId | outputs=5 payload types

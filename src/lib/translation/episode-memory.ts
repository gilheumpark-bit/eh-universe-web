import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — 타입
// ============================================================
//
// Episode Memory Graph — 번역 시리즈 전체에 걸쳐 동일 용어가
// 일관된 번역으로 유지되도록 하는 가벼운 그래프 저장소.
//
// 사용 흐름:
//   1) 에피소드 번역 직전: getOrCreateGraph(projectId) → buildMemoryPromptHint() → 시스템 프롬프트 주입
//   2) 새 번역 시도 시:    detectTermDrift() → canonical 과 다르면 경고 (UI 노출용)
//   3) 번역 완료 시:        updateMemoryFromTranslation() → saveGraphLocal()
//
// 저장 위치: localStorage `noa_episode_memory_<projectId>`
// 실패 가드: storage 미가용/quota exceed 시 false 반환, 호출자는 무시 가능
//

export interface TermNode {
  sourceTerm: string;
  translations: Array<{ target: string; episode: number; count: number }>;
  /** 가장 많이 사용된 번역. 동률 시 첫 등장이 우선 */
  canonicalTarget: string;
  /** 0(완벽 일관) ~ 1(심각 드리프트). 1 - canonical 점유율 */
  driftScore: number;
  /** 이 용어가 마지막으로 발견된 에피소드 번호 */
  lastSeen: number;
}

export interface EpisodeMemoryGraph {
  projectId: string;
  /** 일반 용어(스킬·아이템·고유명사 등) */
  terms: Record<string, TermNode>;
  /** 캐릭터 이름·호칭 */
  characters: Record<string, TermNode>;
  /** Date.now() — 마지막 업데이트 시각 */
  lastUpdated: number;
  /** 지금까지 본 가장 큰 에피소드 번호 */
  episodeCount: number;
}

export interface TermDriftWarning {
  source: string;
  /** 기존 정착된 번역 */
  canonicalTarget: string;
  /** 이번에 시도된 번역 */
  attemptedTarget: string;
  /** historyCount 3+ 이면 'block' (강력 경고), 미만이면 'warn' */
  severity: 'warn' | 'block';
  /** canonical 이 등장한 누적 횟수 */
  historyCount: number;
}

// ============================================================
// PART 2 — 그래프 빌더 / 업데이트
// ============================================================

export function createEmptyGraph(projectId: string): EpisodeMemoryGraph {
  return {
    projectId: projectId || 'anonymous',
    terms: {},
    characters: {},
    lastUpdated: Date.now(),
    episodeCount: 0,
  };
}

/**
 * 번역 완료된 용어 쌍으로 그래프 업데이트.
 * @param isCharacter true면 characters 맵에, false면 terms 맵에 기록
 *
 * 불변성: 입력 graph 는 변경하지 않고 새 객체 반환.
 *         단, 내부 translations 배열은 얕은 복사 후 mutate (성능을 위한 절충).
 */
export function updateMemoryFromTranslation(
  graph: EpisodeMemoryGraph,
  pairs: Array<{ source: string; target: string; episodeNo: number; isCharacter?: boolean }>,
): EpisodeMemoryGraph {
  // [C] graph null/undefined 가드
  if (!graph) return createEmptyGraph('anonymous');
  if (!Array.isArray(pairs) || pairs.length === 0) return graph;

  const next: EpisodeMemoryGraph = {
    ...graph,
    terms: { ...graph.terms },
    characters: { ...graph.characters },
    lastUpdated: Date.now(),
  };

  for (const pair of pairs) {
    if (!pair || !pair.source || !pair.target) continue;
    const bucket = pair.isCharacter ? next.characters : next.terms;
    const existing = bucket[pair.source];
    const epNo = Number.isFinite(pair.episodeNo) ? pair.episodeNo : 0;

    if (!existing) {
      bucket[pair.source] = {
        sourceTerm: pair.source,
        translations: [{ target: pair.target, episode: epNo, count: 1 }],
        canonicalTarget: pair.target,
        driftScore: 0,
        lastSeen: epNo,
      };
    } else {
      // 기존 entry 의 translations 배열을 새 배열로 (얕은 mutate 회피)
      const updatedTranslations = existing.translations.map(t => ({ ...t }));
      const found = updatedTranslations.find(t => t.target === pair.target);
      if (found) {
        found.count += 1;
        if (epNo > found.episode) found.episode = epNo;
      } else {
        updatedTranslations.push({ target: pair.target, episode: epNo, count: 1 });
      }
      bucket[pair.source] = {
        ...existing,
        translations: updatedTranslations,
        lastSeen: Math.max(existing.lastSeen, epNo),
        canonicalTarget: pickCanonical(updatedTranslations),
        driftScore: computeDriftScore(updatedTranslations),
      };
    }
  }

  // episodeCount 갱신 — 보아 온 가장 큰 에피소드 번호
  const maxEp = pairs.reduce(
    (m, p) => (Number.isFinite(p.episodeNo) ? Math.max(m, p.episodeNo) : m),
    graph.episodeCount,
  );
  next.episodeCount = maxEp;

  return next;
}

function pickCanonical(translations: Array<{ target: string; count: number }>): string {
  if (!translations || translations.length === 0) return '';
  // [G] count 최대 — 동률 시 reduce 의 첫 best 유지 (안정성)
  return translations.reduce(
    (best, curr) => (curr.count > best.count ? curr : best),
    translations[0],
  ).target;
}

function computeDriftScore(translations: Array<{ count: number }>): number {
  if (!translations || translations.length <= 1) return 0;
  let total = 0;
  let max = 0;
  // [G] 단일 패스 — sum/max 동시 계산 (reduce 2회 회피)
  for (const t of translations) {
    total += t.count;
    if (t.count > max) max = t.count;
  }
  // 1 - canonical 점유율 → 0=완벽, 1=극심 드리프트
  return total > 0 ? 1 - max / total : 0;
}

// ============================================================
// PART 3 — 드리프트 감지 (번역 시작 전 호출)
// ============================================================

/**
 * 새 번역 시도가 기존 canonical 과 다르면 경고 반환.
 * historyCount 3+ 이면 'block' (강력 경고), 미만이면 'warn'.
 *
 * 호출자는 'block' 경고를 받으면 사용자에게 명확히 노출하고,
 * 'warn' 은 조용히 표시할 수 있다.
 */
export function detectTermDrift(
  graph: EpisodeMemoryGraph | null | undefined,
  newTranslations: Array<{ source: string; target: string; isCharacter?: boolean }>,
): TermDriftWarning[] {
  // [C] graph null 가드 — 첫 에피소드 등 그래프가 비어 있을 때
  if (!graph) return [];
  if (!Array.isArray(newTranslations) || newTranslations.length === 0) return [];

  const warnings: TermDriftWarning[] = [];
  for (const pair of newTranslations) {
    if (!pair || !pair.source || !pair.target) continue;
    const bucket = pair.isCharacter ? graph.characters : graph.terms;
    const node = bucket[pair.source];
    if (!node) continue;
    if (node.canonicalTarget === pair.target) continue;

    // [G] reduce 한 번에 canonical 등장 횟수 합산
    const historyCount = node.translations.reduce(
      (sum, t) => (t.target === node.canonicalTarget ? sum + t.count : sum),
      0,
    );

    warnings.push({
      source: pair.source,
      canonicalTarget: node.canonicalTarget,
      attemptedTarget: pair.target,
      severity: historyCount >= 3 ? 'block' : 'warn',
      historyCount,
    });
  }
  return warnings;
}

// ============================================================
// PART 4 — 저장/로드 (localStorage)
// ============================================================

const STORAGE_KEY_PREFIX = 'noa_episode_memory_';

/**
 * 프로젝트별 그래프 localStorage 저장. 실패 시 false 반환.
 * [C] window/localStorage 미가용, quota exceed, JSON.stringify 실패 모두 silent fallback.
 */
export function saveGraphLocal(graph: EpisodeMemoryGraph): boolean {
  if (!graph || !graph.projectId) return false;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    const payload = JSON.stringify(graph);
    localStorage.setItem(STORAGE_KEY_PREFIX + graph.projectId, payload);
    return true;
  } catch (err) {
    // QuotaExceededError, SecurityError 등 — 호출자 흐름 방해 없이 경고만
    logger.warn('EpisodeMemory', 'saveGraphLocal failed — localStorage quota?', err);
    return false;
  }
}

/**
 * 프로젝트별 그래프 localStorage 로드. 없거나 손상되면 null 반환.
 */
export function loadGraphLocal(projectId: string): EpisodeMemoryGraph | null {
  if (!projectId) return null;
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + projectId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EpisodeMemoryGraph> | null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.projectId === projectId &&
      parsed.terms &&
      parsed.characters
    ) {
      return parsed as EpisodeMemoryGraph;
    }
    return null;
  } catch (err) {
    logger.warn('EpisodeMemory', 'loadGraphLocal JSON parse failed', err);
    return null;
  }
}

/**
 * 그래프 로드 시도 → 없으면 빈 그래프. 호출 측이 null 처리 안 해도 안전.
 */
export function getOrCreateGraph(projectId: string): EpisodeMemoryGraph {
  if (!projectId) return createEmptyGraph('anonymous');
  return loadGraphLocal(projectId) ?? createEmptyGraph(projectId);
}

// ============================================================
// PART 5 — 프롬프트 힌트 생성
// ============================================================

const DEFAULT_MAX_TERMS = 30;
const DEFAULT_MAX_CHARS = 10;

/**
 * canonical 번역 매핑을 프롬프트 힌트 문자열로 변환.
 * - top maxChars 캐릭터 (lastSeen 최신 우선)
 * - top maxTerms 일반 용어 (driftScore 높은 항목 우선, 같으면 lastSeen 최신)
 *
 * 반환 형식 (최대 ~40줄):
 *   [CHARACTER NAME MEMORY]
 *   - "민아" → "Mina" (ep.5, drift=0.00)
 *   ...
 *
 *   [TERM MEMORY]
 *   - "그림자 왕" → "Shadow King" (ep.7, drift=0.25)
 *   ...
 *
 * 빈 그래프면 빈 문자열 반환 — 호출자는 그대로 ragBlock 에 합쳐도 안전.
 */
export function buildMemoryPromptHint(
  graph: EpisodeMemoryGraph | null | undefined,
  maxTerms = DEFAULT_MAX_TERMS,
  maxChars = DEFAULT_MAX_CHARS,
): string {
  // [C] graph null 가드
  if (!graph) return '';

  const toLine = (n: TermNode): string =>
    `- "${n.sourceTerm}" → "${n.canonicalTarget}" (ep.${n.lastSeen}, drift=${n.driftScore.toFixed(2)})`;

  // [G] Object.values + slice — terms 30 / characters 10 제한으로 출력 폭증 차단
  const charLines = Object.values(graph.characters)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, Math.max(0, maxChars))
    .map(toLine);

  const termLines = Object.values(graph.terms)
    .sort((a, b) => {
      // drift 높은 항목 우선 — 일관성 유지가 가장 시급
      if (a.driftScore !== b.driftScore) return b.driftScore - a.driftScore;
      // 동률: lastSeen 최신
      return b.lastSeen - a.lastSeen;
    })
    .slice(0, Math.max(0, maxTerms))
    .map(toLine);

  const parts: string[] = [];
  if (charLines.length > 0) {
    parts.push(`[CHARACTER NAME MEMORY — keep these mappings consistent]\n${charLines.join('\n')}`);
  }
  if (termLines.length > 0) {
    parts.push(`[TERM MEMORY — prefer these target terms when they appear]\n${termLines.join('\n')}`);
  }
  return parts.join('\n\n');
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TermNode,EpisodeMemoryGraph,TermDriftWarning
// IDENTITY_SEAL: PART-2 | role=GraphBuilder | inputs=graph,pairs | outputs=EpisodeMemoryGraph
// IDENTITY_SEAL: PART-3 | role=DriftDetector | inputs=graph,newPairs | outputs=TermDriftWarning[]
// IDENTITY_SEAL: PART-4 | role=PersistenceAdapter | inputs=graph,projectId | outputs=boolean,EpisodeMemoryGraph|null
// IDENTITY_SEAL: PART-5 | role=PromptHintBuilder | inputs=graph,limits | outputs=string

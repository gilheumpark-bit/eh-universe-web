// ============================================================
// PART 0 — TYPES
// ============================================================

import type { Character, EpisodeManuscript } from '@/lib/studio-types';

/** 에피소드 단위 캐릭터 상태 스냅샷 */
export interface CharacterSnapshot {
  name: string;
  /** 등장 여부 */
  present: boolean;
  /** 상태 키워드 (부상/감정/위치 등) */
  stateFlags: string[];
  /** 해당 에피소드에서 대화한 횟수 */
  dialogueCount: number;
}

/** 에피소드 단위 맥락 스냅샷 */
export interface EpisodeSnapshot {
  episode: number;
  title: string;
  /** 등장 캐릭터 상태 목록 */
  characters: CharacterSnapshot[];
  /** 미해결 복선/떡밥 키워드 */
  openThreads: string[];
  /** 해결된 복선 */
  resolvedThreads: string[];
  /** 장소 */
  location: string;
  /** 주요 사건 요약 */
  eventSummary: string;
  /** 맥락 일관성 점수 (0~100) */
  continuityScore: number;
  /** 이탈 경고 목록 */
  warnings: ContinuityWarning[];
}

export interface ContinuityWarning {
  type: 'character_state' | 'location_jump' | 'thread_forgotten' | 'tone_shift' | 'timeline';
  message: { ko: string; en: string };
  severity: 'info' | 'warn' | 'danger';
  episode: number;
  /** 자동 수정 제안 (있으면 사용자에게 표시) */
  suggestion?: { ko: string; en: string };
}

export interface ContinuityReport {
  windowSize: number;
  episodes: EpisodeSnapshot[];
  overallScore: number;
  totalWarnings: number;
  threadStatus: { open: number; resolved: number };
}

// ============================================================
// PART 1 — TEXT EXTRACTION HELPERS
// ============================================================

const KOREAN_NAME_RE = /(?:^|[\s"'\u201C\u2018])([가-힣]{2,4})(?:이|가|은|는|을|를|의|에게|한테|라고|라며|도|만|까지)/gm;
const THREAD_PLANT_RE = /(?:떡밥|복선|의문|비밀|수수께끼|미스터리|단서)/gi;
const THREAD_RESOLVE_RE = /(?:밝혀|드러나|해결|정체|진실|알게)/gi;

/** Levenshtein distance 1 check for English name fuzzy matching */
function editDistance1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let diff = 0;
  for (let i = 0, j = 0; i < a.length && j < b.length; i++, j++) {
    if (a[i] !== b[j]) {
      diff++;
      if (diff > 1) return false;
      if (a.length > b.length) j--;
      else if (b.length > a.length) i--;
    }
  }
  return diff <= 1;
}

export function extractNamesFromText(text: string, knownNames: Set<string>): Set<string> {
  const found = new Set<string>();
  if (!text) return found;

  for (const name of knownNames) {
    if (text.includes(name)) {
      found.add(name);
      continue;
    }
    // English name fuzzy matching: Levenshtein distance 1
    const isEnglish = /^[A-Za-z]/.test(name);
    if (isEnglish) {
      const words = text.match(/[A-Za-z]+/g) || [];
      for (const word of words) {
        if (editDistance1(name.toLowerCase(), word.toLowerCase())) {
          found.add(name);
          break;
        }
      }
    }
  }

  let match: RegExpExecArray | null = null;
  KOREAN_NAME_RE.lastIndex = 0;
  try {
    while ((match = KOREAN_NAME_RE.exec(text)) !== null) {
      const candidate = match[1];
      if (candidate && candidate.length >= 2 && candidate.length <= 4) {
        found.add(candidate);
      }
    }
  } finally {
    KOREAN_NAME_RE.lastIndex = 0;
  }

  return found;
}

function countDialogue(text: string, name: string): number {
  if (!text || !name) return 0;
  const patterns = [
    new RegExp(`${name}[이가은는]?\\s*(?:말했|대답했|외쳤|중얼|속삭|물었|소리쳤)`, 'g'),
    new RegExp(`"[^"]*"[^\\n]*${name}`, 'g'),
  ];
  let count = 0;
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) count += matches.length;
  }
  return count;
}

function extractLocation(text: string): string {
  if (!text) return '';
  const locationPatterns = [
    /(?:장소|배경|무대)[:\s]*([^\n,]+)/,
    /([가-힣]+(?:성|궁|탑|마을|숲|던전|도시|왕국|대륙|방|홀|광장|거리))\s*(?:에서|으로|에)/,
  ];
  for (const p of locationPatterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function extractThreads(text: string): { planted: string[]; resolved: string[] } {
  if (!text) return { planted: [], resolved: [] };

  const planted: string[] = [];
  const resolved: string[] = [];

  const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 5);

  for (const s of sentences) {
    THREAD_PLANT_RE.lastIndex = 0;
    if (THREAD_PLANT_RE.test(s)) {
      planted.push(s.trim().slice(0, 40));
    }
    THREAD_RESOLVE_RE.lastIndex = 0;
    if (THREAD_RESOLVE_RE.test(s)) {
      resolved.push(s.trim().slice(0, 40));
    }
  }

  return { planted, resolved };
}

/**
 * Find matching open thread for a resolved thread using n-gram index.
 * Replaces O(n⁴) sliding-window scan with O(n) hash lookup.
 */
const NGRAM_SIZE = 6;

function buildNgramSet(text: string): Set<string> {
  const ngrams = new Set<string>();
  for (let i = 0; i <= text.length - NGRAM_SIZE; i++) {
    ngrams.add(text.slice(i, i + NGRAM_SIZE));
  }
  return ngrams;
}

function findMatchingThread(openThreads: string[], resolved: string): number {
  // Exact match first (fast path)
  const exactIdx = openThreads.indexOf(resolved);
  if (exactIdx >= 0) return exactIdx;

  // Substring containment check
  for (let i = 0; i < openThreads.length; i++) {
    const open = openThreads[i];
    if (resolved.length >= NGRAM_SIZE && open.includes(resolved)) return i;
    if (open.length >= NGRAM_SIZE && resolved.includes(open)) return i;
  }

  // N-gram overlap fallback: build ngrams for resolved once, check against each open thread
  if (resolved.length >= NGRAM_SIZE) {
    const resolvedNgrams = buildNgramSet(resolved);
    for (let i = 0; i < openThreads.length; i++) {
      const open = openThreads[i];
      if (open.length < NGRAM_SIZE) continue;
      const openNgrams = buildNgramSet(open);
      // Check if any n-gram overlaps
      for (const ng of resolvedNgrams) {
        if (openNgrams.has(ng)) return i;
      }
    }
  }

  return -1;
}

// ============================================================
// PART 2 — CONTINUITY ANALYSIS
// ============================================================

function analyzeEpisodePair(
  prev: EpisodeSnapshot | null,
  curr: EpisodeSnapshot,
  episode: number,
): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  if (!prev) return warnings;

  // 캐릭터 상태 불일치 체크
  const prevChars = new Map(prev.characters.map(c => [c.name, c]));
  for (const cc of curr.characters) {
    const pc = prevChars.get(cc.name);
    if (!pc) continue;

    // 이전 화에서 부상 플래그가 있는데 현재 화에서 사라짐
    const prevInjured = pc.stateFlags.some(f => f.includes('부상') || f.includes('상처'));
    const currInjured = cc.stateFlags.some(f => f.includes('부상') || f.includes('상처'));
    if (prevInjured && !currInjured && cc.present) {
      warnings.push({
        type: 'character_state',
        message: {
          ko: `${cc.name}: ${episode - 1}화에서 부상 상태였으나 ${episode}화에서 언급 없음`,
          en: `${cc.name}: injured in ep.${episode - 1} but no mention in ep.${episode}`,
        },
        suggestion: {
          ko: `"${cc.name}은(는) 아직 상처가 아물지 않아..." 등의 상태 묘사를 초반에 추가하세요.`,
          en: `Add a status description like "${cc.name}'s wound hadn't fully healed..." early in the episode.`,
        },
        severity: 'warn',
        episode,
      });
    }
  }

  // 장소 급변 체크
  if (prev.location && curr.location && prev.location !== curr.location) {
    const hasTransition = curr.eventSummary.includes('이동') || curr.eventSummary.includes('도착');
    if (!hasTransition) {
      warnings.push({
        type: 'location_jump',
        message: {
          ko: `장소 변경(${prev.location} → ${curr.location}) 이동 묘사 없음`,
          en: `Location change (${prev.location} → ${curr.location}) without transition`,
        },
        suggestion: {
          ko: `"${prev.location}을(를) 떠나 ${curr.location}(으)로 향했다" 등 이동 장면을 삽입하세요.`,
          en: `Insert a transition scene: "They left ${prev.location} and headed to ${curr.location}."`,
        },
        severity: 'info',
        episode,
      });
    }
  }

  // 장기 미해결 복선 체크
  if (prev.openThreads.length > 5) {
    const oldest = prev.openThreads.slice(0, 2).join(', ');
    warnings.push({
      type: 'thread_forgotten',
      message: {
        ko: `미해결 떡밥 ${prev.openThreads.length}개 누적 — 회수 필요`,
        en: `${prev.openThreads.length} unresolved threads accumulated`,
      },
      suggestion: {
        ko: `오래된 복선부터 회수하세요: ${oldest}`,
        en: `Resolve oldest threads first: ${oldest}`,
      },
      severity: prev.openThreads.length > 8 ? 'danger' : 'warn',
      episode,
    });
  }

  return warnings;
}

// ============================================================
// PART 3 — MAIN: buildContinuityReport
// ============================================================

/**
 * 원고 배열에서 맥락 추적 리포트를 생성.
 * windowSize = 분석 범위 (화 단위). 기본 5, 조절 가능 3~25.
 * currentEpisode = 현재 에피소드 번호.
 */
export function buildContinuityReport(
  manuscripts: EpisodeManuscript[],
  characters: Character[],
  currentEpisode: number,
  windowSize: number = 5,
): ContinuityReport {
  const clampedWindow = Math.max(3, Math.min(25, windowSize));
  const startEp = Math.max(1, currentEpisode - clampedWindow + 1);

  const knownNames = new Set(characters.map(c => c.name));
  const allOpenThreads: string[] = [];
  const allResolvedThreads: string[] = [];
  const episodes: EpisodeSnapshot[] = [];
  let prevSnapshot: EpisodeSnapshot | null = null;

  for (let ep = startEp; ep <= currentEpisode; ep++) {
    const ms = manuscripts.find(m => m.episode === ep);
    const text = ms?.content ?? '';

    const presentNames = extractNamesFromText(text, knownNames);
    const charSnapshots: CharacterSnapshot[] = characters.map(c => {
      const present = presentNames.has(c.name);
      const dialogueCount = present ? countDialogue(text, c.name) : 0;

      const stateFlags: string[] = [];
      if (present) {
        const sentences = text.split(/[.!?。！？\n]+/).filter(s => s.includes(c.name));
        const joined = sentences.join(' ');
        if (/부상|상처|피를|다쳤/.test(joined)) stateFlags.push('부상');
        if (/분노|격분|화가/.test(joined)) stateFlags.push('분노');
        if (/슬[퍼픔]|눈물|울[었며]/.test(joined)) stateFlags.push('슬픔');
        if (/죽|사망|전사/.test(joined)) stateFlags.push('사망');
      }
      return { name: c.name, present, stateFlags, dialogueCount };
    });

    const location = extractLocation(text);
    const threads = extractThreads(text);
    allOpenThreads.push(...threads.planted);
    for (const r of threads.resolved) {
      const idx = findMatchingThread(allOpenThreads, r);
      if (idx >= 0) allOpenThreads.splice(idx, 1);
      allResolvedThreads.push(r);
    }

    const eventSummary = text.slice(0, 100).replace(/\n/g, ' ').trim();

    const snapshot: EpisodeSnapshot = {
      episode: ep,
      title: ms?.title ?? `EP.${ep}`,
      characters: charSnapshots,
      openThreads: [...allOpenThreads],
      resolvedThreads: [...allResolvedThreads],
      location,
      eventSummary,
      continuityScore: 0,
      warnings: [],
    };

    snapshot.warnings = analyzeEpisodePair(prevSnapshot, snapshot, ep);

    // 점수 산정: 경고 없으면 100, warn=-15, danger=-30, info=-5
    const penalty = snapshot.warnings.reduce((acc, w) => {
      if (w.severity === 'danger') return acc + 30;
      if (w.severity === 'warn') return acc + 15;
      return acc + 5;
    }, 0);
    snapshot.continuityScore = Math.max(0, 100 - penalty);

    episodes.push(snapshot);
    prevSnapshot = snapshot;
  }

  const totalWarnings = episodes.reduce((acc, e) => acc + e.warnings.length, 0);
  const overallScore = episodes.length > 0
    ? Math.round(episodes.reduce((acc, e) => acc + e.continuityScore, 0) / episodes.length)
    : 100;

  return {
    windowSize: clampedWindow,
    episodes,
    overallScore,
    totalWarnings,
    threadStatus: { open: allOpenThreads.length, resolved: allResolvedThreads.length },
  };
}

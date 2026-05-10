// ============================================================
// PART 1 — Module Header
// ============================================================
//
// character-arc-tracker.ts — 화별 캐릭터 일관성 검증.
//
// Phase 1 결정론적 휴리스틱:
//   - 캐릭터 등장 빈도 화별 추출 (Symbol Index 활용 가능 — 본 모듈은 자체 스캔)
//   - 화수 간 등장 간격 비정상 감지 (10화 이상 미등장 후 갑작스러운 등장)
//   - speechStyle 정의 vs 본문 등장 컨텍스트 word overlap (LLM 보조는 Phase 2)
//
// [C] 캐릭터 0명 / episodes 0개 → score 100
// [G] 단일 패스 — 화수 × 캐릭터 매트릭스 1회
// [K] LLM 호출 회피 — Phase 1 회귀 가능성 우선
// ============================================================

import type { Character, EpisodeManuscript } from '@/lib/studio-types';
import type { AxisResult, Violation } from './types';

// ============================================================
// PART 2 — Helpers
// ============================================================

/** 본문에서 캐릭터 이름 등장 횟수 카운트 */
function countAppearances(text: string, names: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!text) return counts;
  for (const name of names) {
    if (!name || name.length < 2) continue;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'g');
    const matches = text.match(re);
    counts[name] = matches?.length ?? 0;
  }
  return counts;
}

// ============================================================
// PART 3 — Axis runner
// ============================================================

export interface CharacterArcOptions {
  /** 미등장 이후 임계 (몇 화 빈 후 갑작스러운 등장 시 위반) — 기본 10 */
  longAbsenceThreshold?: number;
  /** 갑작스러운 다회 등장 임계 (한 화 5회 이상) — 기본 5 */
  burstThreshold?: number;
}

/**
 * 화별 캐릭터 일관성.
 */
export function runCharacterArcAxis(
  characters: Character[] | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
  options: CharacterArcOptions = {},
): AxisResult {
  const start = Date.now();
  const absenceThreshold = options.longAbsenceThreshold ?? 10;
  const burstThreshold = options.burstThreshold ?? 5;

  if (!characters || characters.length === 0 || !episodes || episodes.length === 0) {
    return {
      axis: 'character-arc',
      score: 100,
      violations: [],
      durationMs: Date.now() - start,
    };
  }

  const validChars = characters.filter((c) => c.name && c.name.length >= 2);
  const charNames = validChars.map((c) => c.name);

  // 화별 카운트 매트릭스: { episodeId: { name: count } }
  const matrix = new Map<number, Record<string, number>>();
  for (const ep of episodes) {
    if (!ep.content) continue;
    matrix.set(ep.episode, countAppearances(ep.content, charNames));
  }

  const violations: Violation[] = [];

  // 1. 장기 미등장 후 갑작스러운 다회 등장 검사
  for (const c of validChars) {
    let lastAppearedEp: number | null = null;
    const epsAsc = Array.from(matrix.keys()).sort((a, b) => a - b);
    for (const epId of epsAsc) {
      const cnt = matrix.get(epId)?.[c.name] ?? 0;
      if (cnt === 0) continue;
      if (lastAppearedEp !== null) {
        const gap = epId - lastAppearedEp;
        if (gap >= absenceThreshold && cnt >= burstThreshold) {
          violations.push({
            kind: 'character-arc-inconsistency',
            severity: 'warning',
            episodeId: epId,
            messages: {
              ko: `캐릭터 "${c.name}" 장기 미등장 (${gap}화) 후 EP${epId} 에서 ${cnt}회 갑작스러운 등장 — 도입부 회수 점검 필요`,
              en: `Character "${c.name}" suddenly appears ${cnt}x in EP${epId} after ${gap}-episode absence — re-introduction needed`,
              ja: `キャラクター「${c.name}」が ${gap} 話の不在後に EP${epId} で ${cnt} 回登場`,
              zh: `角色 "${c.name}" 在缺席 ${gap} 话后于 EP${epId} 突然出现 ${cnt} 次`,
            },
            jumpTarget: { episodeId: epId },
            meta: { gap, count: cnt },
          });
        }
      }
      lastAppearedEp = epId;
    }
  }

  // 2. 캐릭터별 score 산출 — 위반당 -5점
  const score = Math.max(0, 100 - violations.length * 5);

  return {
    axis: 'character-arc',
    score,
    violations,
    durationMs: Date.now() - start,
  };
}

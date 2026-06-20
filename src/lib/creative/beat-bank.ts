// ============================================================
// beat-bank — 창작 지침 04_씬시트연출/03 (beat bank·긴장도 macro Layer 107) 흡수
// 표준 서사 비트(setup→inciting→rising→midpoint→crisis→climax→resolution)를
// 정의하고, 각 비트의 긴장도(0~100)와 연출 힌트를 매핑한다.
// 비트 시퀀스 → 긴장도 macro 곡선 변환 / 다음 표준 비트 추천 휴리스틱 제공.
// 순수 TS. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 독립 모듈.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (비트 종류·엔트리 스펙)
// ============================================================

/**
 * 표준 7비트 서사 구조.
 * setup(도입) → inciting(발단) → rising(상승) → midpoint(중간점) →
 * crisis(위기) → climax(절정) → resolution(결말).
 */
export type BeatType =
  | 'setup'
  | 'inciting'
  | 'rising'
  | 'midpoint'
  | 'crisis'
  | 'climax'
  | 'resolution';

/** 비트별 스펙: 라벨·긴장도(0~100)·연출 힌트. */
export interface BeatEntry {
  /** 한국어 라벨. */
  label: string;
  /** 긴장도 0(평온)~100(최고조). */
  tensionLevel: number;
  /** 연출 힌트 한 줄(ko). */
  hint: string;
}

// ============================================================
// PART 2 — BEAT_BANK 매핑 (7비트 × 라벨·긴장도·힌트)
// ============================================================

/**
 * 비트별 표준 스펙.
 * 긴장도는 setup(10)에서 점진 상승해 climax(100)에서 정점을 찍고
 * resolution(20)에서 이완되는 산 곡선을 그린다. midpoint(55)는 반전 지점.
 */
export const BEAT_BANK: Readonly<Record<BeatType, BeatEntry>> = Object.freeze({
  setup: {
    label: '도입',
    tensionLevel: 10,
    hint: '평온한 일상·세계관을 깔고 주인공의 결핍을 심는다.',
  },
  inciting: {
    label: '발단',
    tensionLevel: 30,
    hint: '사건이 터져 주인공을 일상 밖으로 밀어낸다. 되돌릴 수 없는 첫 균열.',
  },
  rising: {
    label: '상승',
    tensionLevel: 50,
    hint: '장애물이 누적되며 갈등이 단계적으로 커진다. 판돈을 올린다.',
  },
  midpoint: {
    label: '중간점',
    tensionLevel: 55,
    hint: '반전·진실 폭로로 판이 뒤집힌다. 주인공의 목표/방법이 재설정된다.',
  },
  crisis: {
    label: '위기',
    tensionLevel: 80,
    hint: '최악의 순간. 모든 것을 잃고 막다른 길에 몰린다. 절정 직전의 바닥.',
  },
  climax: {
    label: '절정',
    tensionLevel: 100,
    hint: '최종 대결·결단. 긴장이 정점을 찍고 핵심 질문에 답한다.',
  },
  resolution: {
    label: '결말',
    tensionLevel: 20,
    hint: '여진 정리·변화한 일상. 긴장을 이완하고 여운을 남긴다.',
  },
});

/**
 * 표준 전개 순서 (도입 → 결말).
 * suggestNextBeat 의 시퀀스 인덱싱 기준.
 */
const STANDARD_ORDER: readonly BeatType[] = Object.freeze([
  'setup',
  'inciting',
  'rising',
  'midpoint',
  'crisis',
  'climax',
  'resolution',
]);

// ============================================================
// PART 3 — 변환·추천 함수 (라벨·macro 곡선·다음 비트)
// ============================================================

/**
 * 비트 → 한국어 라벨.
 * @param b  비트 종류
 * @returns 라벨 문자열. 알 수 없는 비트면 빈 문자열.
 */
export function beatLabel(b: BeatType): string {
  const entry = BEAT_BANK[b];
  if (!entry) return '';
  return entry.label;
}

/**
 * 비트 시퀀스 → 긴장도 macro 곡선.
 * 각 비트를 해당 tensionLevel(0~100) 숫자로 매핑한 배열을 반환한다.
 * @param beats  비트 배열 (순서대로 긴장도 시퀀스 생성)
 * @returns 긴장도 숫자 배열. 알 수 없는 비트는 0으로 안전 처리. 빈/비배열 입력 → [].
 */
export function tensionMacroCurve(beats: BeatType[]): number[] {
  // 경계 방어: null/undefined/비배열
  if (!Array.isArray(beats) || beats.length === 0) return [];
  return beats.map((b) => {
    const entry = BEAT_BANK[b];
    // 알 수 없는 비트는 긴장 0 (곡선 길이는 입력 길이와 동일하게 유지)
    return entry ? entry.tensionLevel : 0;
  });
}

/**
 * 현재 비트 → 표준 전개상 다음 비트 추천.
 * STANDARD_ORDER 기준 한 칸 뒤를 반환한다.
 * @param current  현재 비트
 * @returns 다음 비트. 마지막(resolution) 또는 알 수 없는 비트면 'resolution'(종착).
 */
export function suggestNextBeat(current: BeatType): BeatType {
  const idx = STANDARD_ORDER.indexOf(current);
  // 알 수 없는 비트(-1) 또는 마지막 비트 → resolution(서사 종착)으로 안전 폴백
  if (idx < 0 || idx >= STANDARD_ORDER.length - 1) {
    return 'resolution';
  }
  return STANDARD_ORDER[idx + 1];
}

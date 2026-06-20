// ============================================================
// reader-persona-16 — 창작 지침 01_독자페르소나 (16 페르소나 매트릭스 chg_133 결정론적) 흡수
// 16종 독자 페르소나(4 연령대 × 2 성별 × 2 성향 근사)를 결정론적 매트릭스로 정의하고,
// 본문에 대한 각 페르소나의 몰입도/이탈 위험을 휴리스틱으로 추정한다.
//
// ⚠️ 이 모듈은 실제 독자 반응을 측정하지 않는다. LLM도 아니다.
//    텍스트 표면 지표(tell 빈도·대사 비율·문장 길이)와 페르소나 내성치를 곱해
//    산출하는 *시뮬레이션* 근사일 뿐이며, 실측·통계적 검증 데이터가 아니다.
//
// 순수 TS. React/DOM/fetch 의존 0. LLM 호출 0. 절대금지 8파일 import 0.
// 재사용: '@/lib/desktop/writing-stats' analyzeText (dialoguePct·avgLen 산출).
// ============================================================

import { analyzeText } from '@/lib/desktop/writing-stats';

// ============================================================
// PART 1 — 타입 정의 (연령대·성별·성향·페르소나·반응)
// ============================================================

/** 연령대 4구간 (10대/20대/30대/40대+ 근사). */
export type AgeBand = 'teen' | 'twenties' | 'thirties' | 'forties';

/** 성별 2구간 (성향 근사용 축, 절대 분류 아님). */
export type Gender = 'male' | 'female';

/**
 * 독자 성향 2구간 근사:
 * - 'fast': 빠른 전개·사이다·대사 선호 (긴 서술 인내 낮음)
 * - 'deep': 묘사·분위기·심리 서술 선호 (느린 전개 인내 높음)
 */
export type ReadingPreference = 'fast' | 'deep';

/**
 * 16 페르소나 단위.
 * tolerance: 서술 인내 계수(0~1). 높을수록 긴 문장/적은 대사/tell 많음을 잘 견딘다.
 */
export interface Persona16 {
  id: string;
  label: string;
  ageBand: AgeBand;
  gender: Gender;
  /** 성향 설명 한 줄(ko). */
  preference: string;
  /** 서술 인내 계수 0~1. 이탈 위험·몰입도 가중에 곱해진다. */
  tolerance: number;
}

/** 단일 페르소나 반응. */
export interface PersonaReaction {
  /** 몰입도 0~100 (높을수록 좋음). */
  engagement: number;
  /** 이탈 위험 여부 (몰입도가 페르소나별 임계 미만). */
  dropoutRisk: boolean;
}

/** 16 페르소나 전수 패널 반응. */
export interface PanelReaction {
  /** 16 페르소나 평균 몰입도 0~100. */
  avgEngagement: number;
  /** 이탈 위험으로 분류된 페르소나 수 (0~16). */
  dropoutCount: number;
}

// ============================================================
// PART 2 — PERSONAS_16 매트릭스 (4 연령 × 2 성별 × 2 성향 = 16)
// ============================================================

/**
 * 성향 계수 베이스라인 — 'fast'는 인내 낮음, 'deep'은 인내 높음.
 * 연령대별 미세 보정(아래)으로 16종이 서로 다른 tolerance를 갖도록 한다.
 */
const PREF_BASE: Readonly<Record<ReadingPreference, number>> = Object.freeze({
  fast: 0.35,
  deep: 0.72,
});

/** 연령대별 인내 보정치 (어릴수록 빠른 전개 선호 → 인내 낮음). */
const AGE_ADJUST: Readonly<Record<AgeBand, number>> = Object.freeze({
  teen: -0.08,
  twenties: -0.02,
  thirties: 0.04,
  forties: 0.1,
});

/** 0~1 범위로 클램프. */
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** 연령대 라벨(ko). */
const AGE_LABEL: Readonly<Record<AgeBand, string>> = Object.freeze({
  teen: '10대',
  twenties: '20대',
  thirties: '30대',
  forties: '40대+',
});

/** 성별 라벨(ko). */
const GENDER_LABEL: Readonly<Record<Gender, string>> = Object.freeze({
  male: '남성',
  female: '여성',
});

/** 성향 설명(ko). */
const PREF_DESC: Readonly<Record<ReadingPreference, string>> = Object.freeze({
  fast: '빠른 전개·사이다·대사 선호',
  deep: '묘사·분위기·심리 서술 선호',
});

/**
 * 16 페르소나 결정론적 생성.
 * 4 연령 × 2 성별 × 2 성향 = 16. 순서 고정(결정론).
 * 성별은 성향에 ±0.03 미세 가중만 주어 16종이 모두 구별되게 한다.
 */
function buildPersonas(): readonly Persona16[] {
  const ages: AgeBand[] = ['teen', 'twenties', 'thirties', 'forties'];
  const genders: Gender[] = ['female', 'male'];
  const prefs: ReadingPreference[] = ['fast', 'deep'];
  const out: Persona16[] = [];
  for (const age of ages) {
    for (const gender of genders) {
      for (const pref of prefs) {
        // 성별 미세 가중: female +0.03(분위기 인내 약간↑), male -0.03 (근사 가정, 절대 아님)
        const genderAdj = gender === 'female' ? 0.03 : -0.03;
        const tolerance = clamp01(PREF_BASE[pref] + AGE_ADJUST[age] + genderAdj);
        out.push({
          id: `${age}-${gender}-${pref}`,
          label: `${AGE_LABEL[age]} ${GENDER_LABEL[gender]}·${pref === 'fast' ? '속독' : '정독'}`,
          ageBand: age,
          gender,
          preference: PREF_DESC[pref],
          tolerance,
        });
      }
    }
  }
  return Object.freeze(out);
}

/** 16 페르소나 매트릭스 (불변). */
export const PERSONAS_16: readonly Persona16[] = buildPersonas();

// ============================================================
// PART 3 — 휴리스틱 지표 추출 (tell 빈도 등 표면 신호)
// ============================================================

/**
 * tell 신호 단어(상태 직술). 많을수록 "보여주기"가 약함 → 빠른독자 이탈↑.
 * writing-stats 의 통계와 직교하는, 페르소나 전용 표면 휴리스틱.
 */
const TELL_MARKERS: readonly string[] = Object.freeze([
  '느꼈다',
  '생각했다',
  '깨달았다',
  '알았다',
  '슬펐다',
  '기뻤다',
  '두려웠다',
  '화가 났다',
  '행복했다',
  '불안했다',
]);

/** 본문에서 tell 마커 등장 횟수 합산. 빈/누락 텍스트 안전. */
function countTellMarkers(text: string): number {
  if (!text) return 0;
  let total = 0;
  for (const marker of TELL_MARKERS) {
    // split 길이-1 = 비중첩 등장 횟수 (정규식 이스케이프 불필요한 한글 리터럴)
    total += text.split(marker).length - 1;
  }
  return total;
}

/** 표면 신호 묶음 (analyzeText 재사용 + tell 밀도). */
interface SurfaceSignals {
  /** 대사 비율 % (0~100). */
  dialoguePct: number;
  /** 평균 문장 길이(자). */
  avgLen: number;
  /** 100자당 tell 마커 밀도. */
  tellDensity: number;
  /** 전체 글자수. */
  chars: number;
}

/** 본문 → 표면 신호. 빈 문자열 안전. */
function extractSignals(text: string): SurfaceSignals {
  const safe = typeof text === 'string' ? text : '';
  const stats = analyzeText(safe);
  const tellCount = countTellMarkers(safe);
  const tellDensity = stats.chars > 0 ? (tellCount / stats.chars) * 100 : 0;
  return {
    dialoguePct: stats.dialoguePct,
    avgLen: stats.avgLen,
    tellDensity,
    chars: stats.chars,
  };
}

// ============================================================
// PART 4 — 페르소나 반응 평가 (단일 + 전수 패널)
// ============================================================

/** 몰입도 산출 시작점 (중립). */
const BASE_ENGAGEMENT = 60;
/** 이탈 위험 임계 (몰입도가 이 미만이면 dropoutRisk). */
const DROPOUT_THRESHOLD = 45;
/** 빠른독자가 견디는 평균 문장 길이 기준(자). 초과분에 패널티. */
const FAST_READER_LEN_COMFORT = 40;

/**
 * 본문 + 페르소나 → 반응.
 *
 * 휴리스틱(시뮬레이션, 실측 아님):
 *  - 대사 비율이 높을수록 모든 독자 가독성↑ (특히 fast 성향).
 *  - 긴 문장(avgLen 큼)은 인내(tolerance) 낮은 독자에게 패널티.
 *  - tell 밀도가 높을수록 몰입↓, 단 tolerance가 높으면 패널티 완화.
 *
 * @param text     평가 본문 (빈/null 안전)
 * @param persona  페르소나 (누락 시 중립 반응)
 * @returns {engagement 0~100, dropoutRisk}
 */
export function evalPersonaReaction(text: string, persona: Persona16): PersonaReaction {
  // 페르소나 누락 방어: 중립값
  if (!persona) return { engagement: BASE_ENGAGEMENT, dropoutRisk: false };

  const sig = extractSignals(text);

  // 빈 본문: 평가 불가 → 중립 몰입, 이탈 위험 없음 (0분모/판단 회피)
  if (sig.chars === 0) return { engagement: BASE_ENGAGEMENT, dropoutRisk: false };

  const tol = clamp01(persona.tolerance);

  // (1) 대사 가독성 보너스: 대사 30%를 쾌적 기준으로, fast 독자는 가중↑
  const dialogueComfort = persona.preference === PREF_DESC.fast ? 0.5 : 0.3;
  const dialogueBonus = Math.min(20, sig.dialoguePct * dialogueComfort);

  // (2) 긴 문장 패널티: 인내 낮을수록 더 크게. (avgLen-comfort) 초과분 × (1-tol)
  const lenOver = Math.max(0, sig.avgLen - FAST_READER_LEN_COMFORT);
  const lengthPenalty = lenOver * (1 - tol) * 0.6;

  // (3) tell 밀도 패널티: 밀도 × (1-tol). tolerance 높으면 tell을 잘 견딤.
  const tellPenalty = sig.tellDensity * (1 - tol) * 8;

  const raw = BASE_ENGAGEMENT + dialogueBonus - lengthPenalty - tellPenalty;
  const engagement = Math.round(clamp01(raw / 100) * 100);

  return {
    engagement,
    dropoutRisk: engagement < DROPOUT_THRESHOLD,
  };
}

/**
 * 본문 → 16 페르소나 전수 패널 반응 집계.
 *
 * @param text  평가 본문 (빈/null 안전)
 * @returns {avgEngagement 0~100, dropoutCount 0~16}
 */
export function panelReaction(text: string): PanelReaction {
  const n = PERSONAS_16.length; // 항상 16, 0분모 방어용 변수화
  if (n === 0) return { avgEngagement: 0, dropoutCount: 0 };

  let sum = 0;
  let dropoutCount = 0;
  for (const persona of PERSONAS_16) {
    const r = evalPersonaReaction(text, persona);
    sum += r.engagement;
    if (r.dropoutRisk) dropoutCount += 1;
  }

  return {
    avgEngagement: Math.round(sum / n),
    dropoutCount,
  };
}

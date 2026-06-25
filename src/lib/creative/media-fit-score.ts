// ============================================================
// media-fit-score — 창작 지침 07_IP자산화 (매체 변환 4종 산식 · E1-media-fit)
// 4 매체 적합도(웹툰·게임·영상·해외) 가중 합산 순수 함수 + StoryConfig 휴리스틱 추정.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0 (StoryConfig 는 type-only import).
//
// [산식 출처 — 사양 문서 그대로 · 발명 금지]
//   - webtoonFitScore  : _웹툰화_전용_분석표.md §1 (7축 · 합 100 · 판정 4단계 85/75/60)
//   - gameFitScore     : _게임화_전용_분석표.md §1 (8축 · 합 100 · 판정 4단계 85/75/60)
//   - dramaFitScore    : _산업별_IP_사업성_분석.md §2.3 screenFit (6축 · 합 100 · §3 임계 80)
//       ※ Layer 67 영상화 전용 분석표 파일은 READ 사양 목록에 부재.
//         제공 사양 중 유일한 영상 산식인 screenFit 축·가중치를 그대로 사용.
//         "7플랫폼" 축은 제공 문서에 정의가 없어 보류 (발명 금지).
//         캐스팅 = castableCharacters · 제작비 = productionFeasibility 축으로 사양에 존재.
//   - globalAppealScore: _산업별_IP_사업성_분석.md §2.7 globalFit (6축 · 합 100 · §3 임계 75)
//       문화리스크 = culturalRiskControl · 번역성 = translationEase 축으로 사양에 존재.
//
// [computeMediaAvg — integrated-grade 정합 메모 · 파괴 금지]
//   src/lib/creative/integrated-grade.ts 전체 READ 결과:
//   AxisScores 는 6축(world·character·scene·direction·writing·revision)이며
//   `media_avg` 라는 입력 슬롯은 현재 존재하지 않는다 (검증일 2026-06-10).
//   따라서 본 모듈은 integrated-grade.ts 를 수정하지 않고,
//   동일한 축 점수 규약(0~100 · clamp · 소수 1자리 반올림)에 정합되는
//   0~100 단일 값을 산출한다. 향후 슬롯이 신설되면 그대로 주입 가능하다.
//   4 매체 결합 가중치는 어떤 사양 문서에도 정의가 없으므로 단순 산술 평균(동가중)
//   으로 산출한다 (가중치 발명 금지).
//
// [estimate*FromConfig — 정직성 표명]
//   StoryConfig 필드 존재 여부 기반의 결정론적 휴리스틱 proxy 다. 실측·LLM 평가가
//   아니며, 자동 추정 한계로 confidence 0.55~0.65 를 반환값에 고정 표명한다.
//   휴리스틱 상수(장르 base 등)는 사양 문서의 정성 매핑 표(게임화 §2 ·
//   산업별 §1 강한/약한 신호)를 정량 proxy 로 옮긴 추정값이며 사양 정의 수치가 아니다.
// ============================================================

import type { StoryConfig } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입 · 가중치 상수 (사양 문서 수치 그대로)
// ============================================================

/** 웹툰화 7축 입력 (각 0~100). _웹툰화_전용_분석표.md §1 */
export interface WebtoonFitParts {
  /** 캐릭·장소·소품의 시각 고유성 */
  visualIdentity: number;
  /** 세로 스크롤 컷 호흡 */
  verticalScrollRhythm: number;
  /** 회차 말미 컷/질문 */
  episodeCliff: number;
  /** 반복 배경·복장·군중·효과 관리 */
  productionRepeatability: number;
  /** 말풍선 밀도와 컷 정보량 */
  dialoguePanelBalance: number;
  /** 해외 독자 이해 가능성 */
  globalReadability: number;
  /** Visual Bible·AI 자산 권리 */
  rightsAndAssetClarity: number;
}

/** 게임화 8축 입력 (각 0~100). _게임화_전용_분석표.md §1 */
export interface GameFitParts {
  /** 반복 플레이 행동 */
  coreLoop: number;
  /** 성장/해금/수집 */
  progression: number;
  /** 규칙·능력·자원·제약 */
  systemClarity: number;
  /** 적·장애물·선택지 */
  playableConflict: number;
  /** 맵/던전/지역/에피소드 분해 */
  worldModularity: number;
  /** 플레이어블/동료/보스화 가능성 */
  characterRoster: number;
  /** 제작 실현 가능성 */
  productionFeasibility: number;
  /** 권리·안전 */
  rightsAndSafety: number;
}

/** 영상화 6축 입력 (각 0~100). _산업별_IP_사업성_분석.md §2.3 screenFit */
export interface DramaFitParts {
  /** 장면성 */
  sceneStrength: number;
  /** 캐스팅 가능 캐릭터 */
  castableCharacters: number;
  /** 시즌 아크 */
  seasonArc: number;
  /** 비주얼 세트피스 */
  visualSetPieces: number;
  /** 제작비/실현 가능성 */
  productionFeasibility: number;
  /** 시청자 후킹 */
  audienceHook: number;
}

/** 해외 진출 6축 입력 (각 0~100). _산업별_IP_사업성_분석.md §2.7 globalFit */
export interface GlobalAppealParts {
  /** 보편 전제 */
  universalPremise: number;
  /** 번역성 */
  translationEase: number;
  /** 문화 리스크 통제 */
  culturalRiskControl: number;
  /** 글로벌 장르 수요 */
  genreGlobalDemand: number;
  /** 비주얼 피칭 준비도 */
  visualPitchReadiness: number;
  /** 권리·지역 명확성 */
  rightsTerritoryClarity: number;
}

/** 웹툰화 가중치 (합=100). 사양 §1 수치 그대로. */
export const WEBTOON_WEIGHTS: Readonly<Record<keyof WebtoonFitParts, number>> =
  Object.freeze({
    visualIdentity: 20,
    verticalScrollRhythm: 15,
    episodeCliff: 15,
    productionRepeatability: 15,
    dialoguePanelBalance: 10,
    globalReadability: 10,
    rightsAndAssetClarity: 15,
  });

/** 게임화 가중치 (합=100). 사양 §1 수치 그대로. */
export const GAME_WEIGHTS: Readonly<Record<keyof GameFitParts, number>> =
  Object.freeze({
    coreLoop: 20,
    progression: 15,
    systemClarity: 15,
    playableConflict: 15,
    worldModularity: 10,
    characterRoster: 10,
    productionFeasibility: 10,
    rightsAndSafety: 5,
  });

/** 영상화 가중치 (합=100). 산업별 §2.3 screenFit 수치 그대로. */
export const DRAMA_WEIGHTS: Readonly<Record<keyof DramaFitParts, number>> =
  Object.freeze({
    sceneStrength: 20,
    castableCharacters: 15,
    seasonArc: 15,
    visualSetPieces: 20,
    productionFeasibility: 15,
    audienceHook: 15,
  });

/** 해외 진출 가중치 (합=100). 산업별 §2.7 globalFit 수치 그대로. */
export const GLOBAL_WEIGHTS: Readonly<Record<keyof GlobalAppealParts, number>> =
  Object.freeze({
    universalPremise: 20,
    translationEase: 15,
    culturalRiskControl: 15,
    genreGlobalDemand: 15,
    visualPitchReadiness: 20,
    rightsTerritoryClarity: 15,
  });

/** 축 키 순서 (object 순회 의존 제거 · 결정론적). */
const WEBTOON_KEYS: ReadonlyArray<keyof WebtoonFitParts> = [
  'visualIdentity',
  'verticalScrollRhythm',
  'episodeCliff',
  'productionRepeatability',
  'dialoguePanelBalance',
  'globalReadability',
  'rightsAndAssetClarity',
];
const GAME_KEYS: ReadonlyArray<keyof GameFitParts> = [
  'coreLoop',
  'progression',
  'systemClarity',
  'playableConflict',
  'worldModularity',
  'characterRoster',
  'productionFeasibility',
  'rightsAndSafety',
];
const DRAMA_KEYS: ReadonlyArray<keyof DramaFitParts> = [
  'sceneStrength',
  'castableCharacters',
  'seasonArc',
  'visualSetPieces',
  'productionFeasibility',
  'audienceHook',
];
const GLOBAL_KEYS: ReadonlyArray<keyof GlobalAppealParts> = [
  'universalPremise',
  'translationEase',
  'culturalRiskControl',
  'genreGlobalDemand',
  'visualPitchReadiness',
  'rightsTerritoryClarity',
];

/** 산식 결과 breakdown (clamp 후 raw · 가중 기여분). */
export interface MediaFitBreakdown<K extends string> {
  raw: Readonly<Record<K, number>>;
  weighted: Readonly<Record<K, number>>;
}

/** 매체 적합도 산식 공통 결과. */
export interface MediaFitResult<K extends string> {
  /** 최종 점수 (0~100, 소수 1자리 반올림) */
  score: number;
  /** 사양 문서 판정 문구 (임계 그대로) */
  verdict: string;
  /** 축별 raw·weighted 분해 */
  breakdown: MediaFitBreakdown<K>;
}

// ============================================================
// PART 2 — 방어 유틸 · 공통 가중 합산
// ============================================================

/**
 * 점수를 0~100 범위로 보정. NaN/Infinity/null/undefined/비숫자는 0 취급.
 * (sibling 모듈 integrated-grade / ip-readiness 와 동일 규약)
 */
function clampScore(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/** 비어 있지 않은 문자열인가 (휴리스틱 신호 판정용). */
function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/** 배열 길이 (비배열 → 0). */
function listLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

/**
 * 회차 개발 상태 유도 신호: 실제 본문(content)이 있는 manuscript 가 1개 이상인가.
 *
 * [episodeState 반쪽 배선 수리 · 검증일 2026-06-11]
 *   studio-types.ts:339 의 StoryConfig.episodeState 는 선언·read(여기 481·650) 는 있으나
 *   src 전체에 *write 경로 0건* — 항상 undefined 라 `!!c.episodeState` 보너스는 영구 미발화
 *   (= 해당 매체 점수에서 보너스만큼 죽은 손실). EpisodeState 자체는 engine/types.ts 의
 *   에피소드 진행 상태(OPEN/TRANSITION_ONLY/STOP) enum 으로, 표현하려던 의미는
 *   "회차가 실제로 개발/진행되었는가"다. 그 의미를 *영속되는 가용 신호*인 manuscripts
 *   (작가가 채운 회차 본문 · useStudioAI/useTranslation 등에서 write)에서 파생한다.
 *   별도 쓰기 경로·UI 신설 없이 기존 신호로 동일 의도를 복원 — 점수 의미 변화 없음
 *   (오히려 '본문이 실제 존재'는 episodeState 보다 강한 진행 증거). 빈 content 회차는
 *   진행으로 보지 않는다.
 */
function hasDevelopedEpisode(c: Partial<StoryConfig>): boolean {
  const ms = c.manuscripts;
  return Array.isArray(ms) && ms.some((m) => hasText(m?.content));
}

/**
 * 공통 가중 합산: 각 축 clamp → (safe * weight)/100 기여 합산 → 소수 1자리.
 * 가중치 합이 100이므로 결과는 0~100.
 */
function weightedScore<K extends string>(
  src: Partial<Record<K, number>> | null | undefined,
  weights: Readonly<Record<K, number>>,
  keys: ReadonlyArray<K>,
): { score: number; raw: Record<K, number>; weighted: Record<K, number> } {
  const safeSrc: Partial<Record<K, number>> =
    src && typeof src === 'object' ? src : {};

  const raw = {} as Record<K, number>;
  const weighted = {} as Record<K, number>;
  let sum = 0;

  for (const key of keys) {
    const safe = clampScore(safeSrc[key] as number);
    const contrib = (safe * weights[key]) / 100;
    raw[key] = safe;
    weighted[key] = contrib;
    sum += contrib;
  }

  return { score: Math.round(sum * 10) / 10, raw, weighted };
}

// ============================================================
// PART 3 — 4 산식 (축·가중치·임계 = 사양 문서 그대로)
// ============================================================

/**
 * 웹툰화 적합도. _웹툰화_전용_분석표.md §1.
 * 판정: 85-100 즉시 제안 / 75-84 콘티 보강 후 / 60-74 보강 필요 / 0-59 재설계 우선.
 */
export function webtoonFitScore(
  parts: WebtoonFitParts,
): MediaFitResult<keyof WebtoonFitParts> {
  const { score, raw, weighted } = weightedScore(parts, WEBTOON_WEIGHTS, WEBTOON_KEYS);
  let verdict: string;
  if (score >= 85) verdict = '웹툰화 제안 즉시 가능';
  else if (score >= 75) verdict = '5화 웹툰형 콘티 보강 후 가능';
  else if (score >= 60) verdict = '캐릭/장소/컷 리듬 보강 필요';
  else verdict = '웹툰화보다 원고/비주얼 재설계 우선';
  return { score, verdict, breakdown: { raw, weighted } };
}

/**
 * 게임화 적합도. _게임화_전용_분석표.md §1.
 * 판정: 85-100 브리프 즉시 / 75-84 보강 후 제안 / 60-74 체계 보강 / 0-59 타 매체 우선.
 */
export function gameFitScore(
  parts: GameFitParts,
): MediaFitResult<keyof GameFitParts> {
  const { score, raw, weighted } = weightedScore(parts, GAME_WEIGHTS, GAME_KEYS);
  let verdict: string;
  if (score >= 85) verdict = '게임 IP 브리프 즉시 생성';
  else if (score >= 75) verdict = 'core loop/roster 보강 후 제안';
  else if (score >= 60) verdict = '세계관 규칙과 성장 체계 보강';
  else verdict = '게임보다 웹툰/영상 우선';
  return { score, verdict, breakdown: { raw, weighted } };
}

/**
 * 영상화 적합도. _산업별_IP_사업성_분석.md §2.3 screenFit.
 * 사양 §3 산업 선택 규칙은 단일 임계(>= 80 → 영상화 제안 병행)만 정의 —
 * 4단계 판정표는 사양에 없으므로 만들지 않는다 (발명 금지).
 */
export function dramaFitScore(
  parts: DramaFitParts,
): MediaFitResult<keyof DramaFitParts> {
  const { score, raw, weighted } = weightedScore(parts, DRAMA_WEIGHTS, DRAMA_KEYS);
  const verdict =
    score >= 80
      ? '영상화 제안 병행 가능 (screenFit ≥ 80)'
      : '영상화 제안 기준 미달 (screenFit < 80)';
  return { score, verdict, breakdown: { raw, weighted } };
}

/**
 * 해외 진출 어필. _산업별_IP_사업성_분석.md §2.7 globalFit.
 * 사양 §3 단일 임계(>= 75 → 해외 진출 패키지 생성)만 정의.
 */
export function globalAppealScore(
  parts: GlobalAppealParts,
): MediaFitResult<keyof GlobalAppealParts> {
  const { score, raw, weighted } = weightedScore(parts, GLOBAL_WEIGHTS, GLOBAL_KEYS);
  const verdict =
    score >= 75
      ? '해외 진출 패키지 생성 가능 (globalFit ≥ 75)'
      : '해외 진출 기준 미달 (globalFit < 75)';
  return { score, verdict, breakdown: { raw, weighted } };
}

// ============================================================
// PART 4 — computeMediaAvg (integrated-grade 축 점수 규약 정합 · 0~100)
// ============================================================

/** 4 매체 점수 입력 (각 0~100 — 위 4 산식의 score). */
export interface MediaFitScores {
  webtoon: number;
  game: number;
  drama: number;
  global: number;
}

const MEDIA_KEYS: ReadonlyArray<keyof MediaFitScores> = [
  'webtoon',
  'game',
  'drama',
  'global',
];

/**
 * 4 매체 점수 단순 산술 평균 (동가중 · 결합 가중치는 사양 미정의 — 발명 금지).
 *
 * integrated-grade.ts READ 결과 `media_avg` 입력 슬롯은 현재 부재(AxisScores 6축).
 * 본 함수는 그 축 점수 규약(0~100 · clamp · 소수 1자리 반올림)에 정합되는
 * 값을 반환하며, integrated-grade.ts 는 수정하지 않는다 (파괴 금지).
 *
 * @param scores 4 매체 점수. null/undefined/누락 키는 0 처리.
 */
export function computeMediaAvg(scores: MediaFitScores): number {
  const src: Partial<MediaFitScores> =
    scores && typeof scores === 'object' ? scores : {};
  let sum = 0;
  for (const key of MEDIA_KEYS) {
    sum += clampScore(src[key] as number);
  }
  return Math.round((sum / MEDIA_KEYS.length) * 10) / 10;
}

// ============================================================
// PART 5 — StoryConfig 휴리스틱 추정 (estimate*FromConfig · confidence 0.55~0.65)
// ============================================================

/** 자동 추정 confidence 하한 (정직성 표명 — LLM-free 휴리스틱 한계). */
export const ESTIMATE_CONFIDENCE_MIN = 0.55;
/** 자동 추정 confidence 상한. */
export const ESTIMATE_CONFIDENCE_MAX = 0.65;

/** 휴리스틱 추정 결과 — parts 는 추정치이며 실측 아님. */
export interface MediaEstimate<P> {
  /** 축별 추정 점수 (0~100) */
  parts: P;
  /** 자동 추정 한계 표명 (0.55~0.65 고정 범위) */
  confidence: number;
  /** 추정에 사용한 신호 목록 (감사·디버깅용) */
  basis: string[];
}

/**
 * 장르 → 게임화 coreLoop base (휴리스틱 추정 상수).
 * 게임화 §2 매핑 표의 정성 신호를 proxy 정량화한 값 — 사양 정의 수치 아님.
 */
const GAME_GENRE_BASE: Readonly<Record<string, number>> = Object.freeze({
  SYSTEM_HUNTER: 60, // 헌터/던전/등급 → 수집형·액션 RPG 강적합
  WUXIA: 60, // 무협/수련 → 액션·방치형 RPG 강적합
  FANTASY: 45,
  SF: 45,
  MODERN_FANTASY: 45,
  THRILLER: 35, // 추리 어드벤처 매핑
  HORROR: 35,
  ROMANCE: 35, // 연애 시뮬 매핑
  FANTASY_ROMANCE: 35,
  ALT_HISTORY: 30,
  LIGHT_NOVEL: 30,
});

/**
 * 장르 → 영상 제작비/실현성 base (휴리스틱 추정 상수).
 * 산업별 §1 약한 신호("제작비 과다")의 proxy — VFX·세트 비용 높은 장르일수록 낮음.
 */
const DRAMA_PRODUCTION_BASE: Readonly<Record<string, number>> = Object.freeze({
  SF: 35,
  FANTASY: 35,
  SYSTEM_HUNTER: 35,
  ALT_HISTORY: 40,
  MODERN_FANTASY: 45,
  WUXIA: 40,
  HORROR: 45,
  THRILLER: 50,
  LIGHT_NOVEL: 55,
  ROMANCE: 60, // 현대물 — 상대적 저예산 실현성
  FANTASY_ROMANCE: 45,
});

/**
 * 장르 → 글로벌 수요 base (휴리스틱 추정 상수).
 * 산업별 §1 "장르 문법 보편" 강한 신호 vs 문화 의존 약한 신호의 proxy.
 */
const GLOBAL_GENRE_BASE: Readonly<Record<string, number>> = Object.freeze({
  SYSTEM_HUNTER: 55,
  FANTASY: 55,
  SF: 55,
  THRILLER: 55,
  HORROR: 50,
  ROMANCE: 50,
  FANTASY_ROMANCE: 50,
  MODERN_FANTASY: 45,
  LIGHT_NOVEL: 40,
  WUXIA: 35, // 문화·용어 의존 큼
  ALT_HISTORY: 35, // 한국사 맥락 의존 큼
});

/** config 접근 안전 가드 — null/비객체 → 빈 객체. */
function safeConfig(config: StoryConfig | null | undefined): Partial<StoryConfig> {
  return config && typeof config === 'object' ? config : {};
}

/** 신호 적용 헬퍼: 조건 충족 시 가산 + basis 기록. */
function bonus(cond: boolean, pts: number, label: string, basis: string[]): number {
  if (!cond) return 0;
  basis.push(label);
  return pts;
}

/**
 * StoryConfig → 웹툰화 7축 휴리스틱 추정. confidence 0.60 (자동 추정 한계).
 * rightsAndAssetClarity 는 config 로 권리 검증이 불가 → 보수 고정치 30 (증명 불가 표기).
 */
export function estimateWebtoonFitFromConfig(
  config: StoryConfig | null | undefined,
): MediaEstimate<WebtoonFitParts> {
  const c = safeConfig(config);
  const basis: string[] = [];
  const chars = Array.isArray(c.characters) ? c.characters : [];
  const withAppearance = chars.filter((ch) => hasText(ch?.appearance)).length;

  const visualIdentity = clampScore(
    30 +
      Math.min(40, withAppearance * 10) +
      bonus(listLen(c.visualPromptCards) > 0, 15, 'visualPromptCards 존재', basis) +
      bonus(chars.some((ch) => hasText(ch?.symbol)), 10, '캐릭 상징 요소', basis),
  );
  if (withAppearance > 0) basis.push(`외형 기술 캐릭 ${withAppearance}명`);

  const verticalScrollRhythm = clampScore(
    30 +
      bonus(!!c.sceneDirection, 25, '씬 연출 데이터', basis) +
      bonus(listLen(c.episodeSceneSheets) > 0, 20, '에피소드 씬시트', basis) +
      bonus(c.genreMode === 'webtoon', 10, 'genreMode=webtoon', basis),
  );

  const episodeCliff = clampScore(
    30 +
      // episodeState write 경로 부재(영구 undefined) → 동일 의도를 manuscript 본문 존재로 유도
      bonus(!!c.episodeState || hasDevelopedEpisode(c), 20, '회차 개발 진행(episodeState 또는 본문)', basis) +
      bonus(listLen(c.manuscripts) > 0, 20, '원고 존재', basis) +
      bonus((c.totalEpisodes ?? 0) >= 10, 15, '10화 이상 설계', basis),
  );

  const productionRepeatability = clampScore(
    30 +
      bonus(hasText(c.setting), 20, '배경 설정', basis) +
      bonus(listLen(c.items) > 0, 15, '아이템(소품) 정의', basis) +
      bonus(hasText(c.corePremise), 10, '핵심 전제', basis),
  );

  const dialoguePanelBalance = clampScore(
    40 +
      bonus(chars.some((ch) => hasText(ch?.speechStyle)), 15, '화법 설계', basis) +
      bonus(chars.some((ch) => hasText(ch?.speechExample)), 10, '대사 예시', basis),
  );

  const globalReadability = clampScore(
    30 +
      bonus(hasText(c.synopsis), 20, '시놉시스', basis) +
      bonus(!!c.translationConfig, 15, '번역 설정', basis) +
      bonus(!!c.grammarRegion, 10, '문법 지역 설정', basis),
  );

  // 권리 정보는 StoryConfig 스키마에 없음 — 검증 불가 → 보수 고정 추정
  const rightsAndAssetClarity = 30;
  basis.push('권리 축: config 검증 불가 — 고정 30 (보수 추정)');

  return {
    parts: {
      visualIdentity,
      verticalScrollRhythm,
      episodeCliff,
      productionRepeatability,
      dialoguePanelBalance,
      globalReadability,
      rightsAndAssetClarity,
    },
    confidence: 0.6,
    basis,
  };
}

/**
 * StoryConfig → 게임화 8축 휴리스틱 추정. confidence 0.60.
 * rightsAndSafety 는 config 로 검증 불가 → 보수 고정치 30.
 */
export function estimateGameFitFromConfig(
  config: StoryConfig | null | undefined,
): MediaEstimate<GameFitParts> {
  const c = safeConfig(config);
  const basis: string[] = [];
  const chars = Array.isArray(c.characters) ? c.characters : [];
  const genre = String(c.genre ?? '');
  const genreBase = GAME_GENRE_BASE[genre] ?? 30;
  basis.push(`장르 base(${genre || '미상'})=${genreBase}`);

  const coreLoop = clampScore(
    genreBase +
      bonus(listLen(c.skills) > 0, 15, '스킬 체계', basis) +
      bonus(listLen(c.items) > 0, 10, '아이템 체계', basis),
  );

  const progression = clampScore(
    25 +
      bonus(listLen(c.skills) > 0, 25, '스킬(성장축)', basis) +
      bonus(listLen(c.items) > 0, 20, '아이템(수집축)', basis) +
      bonus(listLen(c.magicSystems) > 0, 10, '마법 체계(랭크)', basis),
  );

  const systemClarity = clampScore(
    25 +
      bonus(listLen(c.magicSystems) > 0, 25, '마법/기술 규칙', basis) +
      bonus(hasText(c.powerStructure), 15, '권력 구조', basis) +
      bonus(hasText(c.socialSystem), 10, '사회 시스템', basis),
  );

  const hostile = Array.isArray(c.charRelations)
    ? c.charRelations.some((r) => r?.type === 'enemy' || r?.type === 'rival')
    : false;
  const playableConflict = clampScore(
    25 +
      bonus(hasText(c.currentConflict), 25, '현재 갈등', basis) +
      bonus(hostile, 15, '적대/라이벌 관계', basis) +
      bonus(hasText(c.factionRelations), 10, '세력 관계', basis),
  );

  const worldModularity = clampScore(
    25 +
      bonus(hasText(c.setting), 20, '배경 설정', basis) +
      bonus(!!c.worldSimData || !!c.simulatorRef, 15, '세계관 시뮬 데이터', basis) +
      bonus(hasText(c.survivalEnvironment), 10, '생존 환경', basis),
  );

  const rosterBonus = chars.length >= 5 ? 35 : chars.length >= 3 ? 20 : chars.length >= 1 ? 10 : 0;
  if (rosterBonus > 0) basis.push(`캐릭 roster ${chars.length}명`);
  const characterRoster = clampScore(
    20 + rosterBonus + bonus(listLen(c.charRelations) > 0, 10, '관계 그래프', basis),
  );

  // 게임화 §7: 초기 피칭은 Low/Medium 프로토 기본값 — base 40
  const productionFeasibility = clampScore(
    40 +
      bonus(
        listLen(c.skills) > 0 || listLen(c.items) > 0,
        10,
        '수치화 자산 선존재',
        basis,
      ),
  );

  const rightsAndSafety = 30;
  basis.push('권리/안전 축: config 검증 불가 — 고정 30 (보수 추정)');

  return {
    parts: {
      coreLoop,
      progression,
      systemClarity,
      playableConflict,
      worldModularity,
      characterRoster,
      productionFeasibility,
      rightsAndSafety,
    },
    confidence: 0.6,
    basis,
  };
}

/**
 * StoryConfig → 영상화 6축(screenFit) 휴리스틱 추정. confidence 0.55
 * (영상화 전용 분석표 Layer 67 부재 — 산업별 §2.3 proxy 라 신뢰 하한).
 */
export function estimateDramaFitFromConfig(
  config: StoryConfig | null | undefined,
): MediaEstimate<DramaFitParts> {
  const c = safeConfig(config);
  const basis: string[] = [];
  const chars = Array.isArray(c.characters) ? c.characters : [];
  const genre = String(c.genre ?? '');

  const sceneStrength = clampScore(
    30 +
      bonus(!!c.sceneDirection, 25, '씬 연출 데이터', basis) +
      bonus(listLen(c.episodeSceneSheets) > 0, 15, '에피소드 씬시트', basis) +
      bonus(hasText(c.primaryEmotion), 10, '핵심 감정 축', basis),
  );

  const detailed = chars.filter(
    (ch) => hasText(ch?.personality) || hasText(ch?.traits),
  ).length;
  const detailBonus = detailed >= 3 ? 30 : detailed >= 1 ? 15 : 0;
  if (detailBonus > 0) basis.push(`성격 기술 캐릭 ${detailed}명`);
  const castableCharacters = clampScore(
    20 +
      detailBonus +
      bonus(listLen(c.charRelations) > 0, 10, '관계 그래프', basis) +
      bonus(chars.some((ch) => hasText(ch?.backstory)), 10, '백스토리', basis),
  );

  const total = c.totalEpisodes ?? 0;
  const arcBonus = total >= 24 ? 30 : total >= 8 ? 20 : 0;
  if (arcBonus > 0) basis.push(`총 ${total}화 — 시즌 분량`);
  const seasonArc = clampScore(
    25 +
      arcBonus +
      bonus(hasText(c.synopsis), 15, '시놉시스', basis) +
      // episodeState write 경로 부재(영구 undefined) → 동일 의도를 manuscript 본문 존재로 유도
      bonus(!!c.episodeState || hasDevelopedEpisode(c), 10, '회차 개발 진행(episodeState 또는 본문)', basis),
  );

  const visualSetPieces = clampScore(
    25 +
      bonus(listLen(c.visualPromptCards) > 0, 25, '비주얼 프롬프트 카드', basis) +
      bonus(hasText(c.setting), 15, '배경 설정', basis) +
      bonus(listLen(c.items) > 0, 10, '소품 정의', basis),
  );

  const productionFeasibility = clampScore(DRAMA_PRODUCTION_BASE[genre] ?? 45);
  basis.push(`제작비 base(${genre || '미상'})=${productionFeasibility}`);

  const audienceHook = clampScore(
    30 +
      bonus(hasText(c.synopsis), 20, '시놉시스', basis) +
      bonus(hasText(c.currentConflict), 15, '현재 갈등', basis) +
      bonus(hasText(c.primaryEmotion), 10, '핵심 감정 축', basis),
  );

  return {
    parts: {
      sceneStrength,
      castableCharacters,
      seasonArc,
      visualSetPieces,
      productionFeasibility,
      audienceHook,
    },
    confidence: 0.55,
    basis,
  };
}

/**
 * StoryConfig → 해외 진출 6축(globalFit) 휴리스틱 추정. confidence 0.55.
 * rightsTerritoryClarity 는 config 로 검증 불가 → 보수 고정치 30.
 */
export function estimateGlobalAppealFromConfig(
  config: StoryConfig | null | undefined,
): MediaEstimate<GlobalAppealParts> {
  const c = safeConfig(config);
  const basis: string[] = [];
  const chars = Array.isArray(c.characters) ? c.characters : [];
  const genre = String(c.genre ?? '');

  const universalPremise = clampScore(
    30 +
      bonus(hasText(c.corePremise), 20, '핵심 전제', basis) +
      bonus(hasText(c.primaryEmotion), 15, '보편 감정 축', basis) +
      bonus(hasText(c.synopsis), 10, '시놉시스', basis),
  );

  const glossaryLen = listLen(c.translationConfig?.glossary);
  const translationEase = clampScore(
    30 +
      bonus(!!c.translationConfig, 20, '번역 설정', basis) +
      bonus(glossaryLen > 0, 10, `용어집 ${glossaryLen}건`, basis) +
      bonus(listLen(c.translatedManuscripts) > 0, 10, '번역 원고 선존재', basis),
  );

  const culturalRiskControl = clampScore(
    35 +
      bonus(!!c.grammarRegion, 15, '지역 문법 설정', basis) +
      bonus(!!c.prismMode && c.prismMode !== 'OFF', 10, '등급 통제(prismMode)', basis),
  );

  const genreGlobalDemand = clampScore(GLOBAL_GENRE_BASE[genre] ?? 40);
  basis.push(`글로벌 수요 base(${genre || '미상'})=${genreGlobalDemand}`);

  const visualPitchReadiness = clampScore(
    25 +
      bonus(listLen(c.visualPromptCards) > 0, 25, '비주얼 프롬프트 카드', basis) +
      bonus(chars.some((ch) => hasText(ch?.appearance)), 15, '캐릭 외형 기술', basis),
  );

  const rightsTerritoryClarity = 30;
  basis.push('권리/지역 축: config 검증 불가 — 고정 30 (보수 추정)');

  return {
    parts: {
      universalPremise,
      translationEase,
      culturalRiskControl,
      genreGlobalDemand,
      visualPitchReadiness,
      rightsTerritoryClarity,
    },
    confidence: 0.55,
    basis,
  };
}

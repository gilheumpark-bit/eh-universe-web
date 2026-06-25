// ============================================================
// scene-temperature — 창작 지침 04_씬시트연출 (AI 온도 씬시트 Layer 102) 흡수
// 씬의 "온도"(긴장·몰입 강도)를 5단계로 정의하고, 각 온도를
// 연출 힌트(카메라 거리·정보/체험 모드·검증 강도)로 변환한다.
// 순수 TS. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 독립 모듈.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (온도·언어·연출 힌트·스펙)
// ============================================================

/** 씬 온도 5단계: 차가움 → 작열. cold가 가장 낮고 blazing이 가장 높다. */
export type SceneTemperature = 'cold' | 'cool' | 'warm' | 'hot' | 'blazing';

/** 지원 언어 (앱 4언어). */
export type TempLang = 'ko' | 'en' | 'ja' | 'zh';

/** 카메라 거리 D1(초근접)~D5(원경). */
export type CameraDistance = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

/** 서술 모드: 정보 전달 vs 체험 몰입. */
export type SceneMode = 'info' | 'experience';

/** 온도별 연출 힌트. */
export interface SceneDirection {
  /** 카메라 거리 D1(클로즈업)~D5(롱샷). 온도가 높을수록 가까이. */
  cameraDistance: CameraDistance;
  /** 정보 전달 모드 vs 체험 몰입 모드. */
  mode: SceneMode;
  /** 검증 강도: 고온 장면은 연속성/감정선 검증을 엄격히. */
  verificationStrict: boolean;
  /** 연출 힌트 한 줄(ko). */
  hint: string;
}

/** 온도별 전체 스펙 (라벨 4언어 + 연출). */
export interface TemperatureEntry {
  cameraDistance: CameraDistance;
  mode: SceneMode;
  verificationStrict: boolean;
  hint: string;
  /** 4언어 라벨. */
  label: Record<TempLang, string>;
}

// ============================================================
// PART 2 — TEMPERATURE_SPEC 매핑 (5온도 × 연출 + 4언어 라벨)
// ============================================================

/**
 * 온도별 연출 스펙.
 * - cold/cool: 정보 모드, 원경, 느슨한 검증 (도입·설명·전환)
 * - warm: 체험 모드 진입, 중거리
 * - hot/blazing: 체험 모드, 근접, 엄격 검증 (절정·감정 폭발)
 */
export const TEMPERATURE_SPEC: Readonly<Record<SceneTemperature, TemperatureEntry>> = Object.freeze({
  cold: {
    cameraDistance: 'D5',
    mode: 'info',
    verificationStrict: false,
    hint: '원경·정보 전달. 배경/설정을 담담히 깔고 감정은 절제한다.',
    label: { ko: '냉각', en: 'Cold', ja: '冷却', zh: '冷' },
  },
  cool: {
    cameraDistance: 'D4',
    mode: 'info',
    verificationStrict: false,
    hint: '중원경·도입. 상황을 정리하며 긴장의 씨앗을 심는다.',
    label: { ko: '서늘', en: 'Cool', ja: '涼', zh: '凉' },
  },
  warm: {
    cameraDistance: 'D3',
    mode: 'experience',
    verificationStrict: false,
    hint: '중거리·체험 진입. 인물의 행동과 감정을 따라가기 시작한다.',
    label: { ko: '온화', en: 'Warm', ja: '温', zh: '暖' },
  },
  hot: {
    cameraDistance: 'D2',
    mode: 'experience',
    verificationStrict: true,
    hint: '근접·고조. 갈등이 터지고 감각/대사 밀도를 끌어올린다.',
    label: { ko: '고조', en: 'Hot', ja: '高揚', zh: '热' },
  },
  blazing: {
    cameraDistance: 'D1',
    mode: 'experience',
    verificationStrict: true,
    hint: '초근접·절정. 1초 단위로 체험. 연속성·감정선 검증을 최고로.',
    label: { ko: '작열', en: 'Blazing', ja: '灼熱', zh: '灼' },
  },
});

/** 온도 순서 (낮음 → 높음). 곡선 생성·인덱싱용. */
const TEMP_ORDER: readonly SceneTemperature[] = Object.freeze([
  'cold',
  'cool',
  'warm',
  'hot',
  'blazing',
]);

// ============================================================
// PART 3 — 변환 함수 (라벨·연출 힌트)
// ============================================================

/**
 * 온도 → 언어별 라벨.
 * @param t  씬 온도
 * @param lang  언어 (미지원/누락 시 ko 폴백)
 * @returns 라벨 문자열. 알 수 없는 온도면 빈 문자열.
 */
export function temperatureLabel(t: SceneTemperature, lang: TempLang): string {
  const entry = TEMPERATURE_SPEC[t];
  if (!entry) return '';
  // 미지원 언어 방어: ko 폴백
  return entry.label[lang] ?? entry.label.ko;
}

/**
 * 온도 → 연출 힌트 객체.
 * @param t  씬 온도
 * @returns {cameraDistance, mode, verificationStrict, hint}. 알 수 없는 온도면 cold 기본값.
 */
export function temperatureToDirection(t: SceneTemperature): SceneDirection {
  const entry = TEMPERATURE_SPEC[t] ?? TEMPERATURE_SPEC.cold;
  return {
    cameraDistance: entry.cameraDistance,
    mode: entry.mode,
    verificationStrict: entry.verificationStrict,
    hint: entry.hint,
  };
}

// ============================================================
// PART 4 — 텐션 곡선 생성 (도입→상승→절정→하강)
// ============================================================

/** 0~1 진행도를 온도 인덱스(0~4)로 비례 매핑. */
function ratioToTemp(ratio: number): SceneTemperature {
  // ratio 클램프 후 5단계 중 하나로 양자화 (경계 안전)
  const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
  const idx = Math.min(TEMP_ORDER.length - 1, Math.floor(clamped * TEMP_ORDER.length));
  return TEMP_ORDER[idx];
}

/**
 * 에피소드 수에 맞춘 텐션 곡선 생성.
 * 도입(cool) → 상승(warm) → 절정(blazing) → 하강(cool) 형태의 산 곡선.
 * @param episodeCount  전체 에피소드 수
 * @param climaxAt  절정 위치(1-기반 인덱스). 누락/범위 밖이면 중후반(약 70%)에 자동 배치.
 * @returns 각 에피소드의 온도 배열. episodeCount<=0 이면 [].
 */
export function buildTensionCurve(episodeCount: number, climaxAt?: number): SceneTemperature[] {
  // 경계 방어: 0 이하 / 비정수 / NaN
  if (!Number.isFinite(episodeCount) || episodeCount <= 0) return [];
  const total = Math.floor(episodeCount);

  // 단일 에피소드: 자체가 절정
  if (total === 1) return ['blazing'];

  // 절정 위치 결정 (1-기반 → 0-기반). 범위 밖이면 70% 지점.
  const hasValidClimax =
    typeof climaxAt === 'number' && Number.isFinite(climaxAt) && climaxAt >= 1 && climaxAt <= total;
  const climaxIdx = hasValidClimax
    ? Math.floor(climaxAt as number) - 1
    : Math.min(total - 1, Math.max(0, Math.round((total - 1) * 0.7)));

  const curve: SceneTemperature[] = [];
  for (let i = 0; i < total; i++) {
    if (i === climaxIdx) {
      curve.push('blazing');
      continue;
    }
    if (i < climaxIdx) {
      // 상승 구간: cool(도입) → warm/hot 으로 비례 상승
      // climaxIdx가 0일 수는 없는 분기(위에서 == 처리). progress 0..~0.8
      const progress = climaxIdx === 0 ? 0 : (i / climaxIdx) * 0.85;
      curve.push(ratioToTemp(progress));
    } else {
      // 하강 구간: 절정 직후 → cool 로 비례 하강
      const tail = total - 1 - climaxIdx; // 절정 이후 남은 칸 수
      const stepsAfter = i - climaxIdx;
      const progress = tail === 0 ? 0 : (1 - stepsAfter / tail) * 0.55;
      curve.push(ratioToTemp(progress));
    }
  }
  return curve;
}

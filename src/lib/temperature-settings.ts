// ============================================================
// PART 1 — 타입 및 상수
// ============================================================

/** 온도 클램프 경계 */
const TEMP_MIN = 0.1;
const TEMP_MAX = 1.5;

/** narrativeDepth 기준값 (중립점) */
const DEPTH_BASELINE = 1.0;

/** depth 1.0 단위당 온도 보정 계수 */
const DEPTH_COEFF = 0.4;

// ============================================================
// PART 2 — 온도 계산 순수 함수
// ============================================================

/**
 * 장르 기본 온도 + narrativeDepth 보정을 적용하여 최종 temperature를 계산한다.
 *
 * @param genreBaseTemp  장르 기반 베이스 온도 (getGenreTemperature 반환값)
 * @param narrativeDepth 현재 서사 깊이 (getNarrativeDepth 반환값, 0.9~1.5)
 * @param overrideValue  사용자가 직접 설정한 온도 (undefined면 genreBaseTemp 사용)
 * @returns [TEMP_MIN, TEMP_MAX] 범위로 클램핑된 최종 temperature
 */
export function computeTemperature(
  genreBaseTemp: number,
  narrativeDepth: number,
  overrideValue?: number,
): number {
  // [C] overrideValue가 NaN이면 genreBaseTemp로 폴백
  const base =
    overrideValue !== undefined && !Number.isNaN(overrideValue)
      ? overrideValue
      : genreBaseTemp;
  const adjusted = base + (narrativeDepth - DEPTH_BASELINE) * DEPTH_COEFF;
  return Math.max(TEMP_MIN, Math.min(TEMP_MAX, adjusted));
}

// ============================================================
// PART 3 — localStorage 브리지 (SSR 안전)
// ============================================================

/** localStorage 키 — 변경 시 기존 사용자 설정 무효화 주의 */
const STORAGE_KEY = 'noa_temperature';

/**
 * localStorage의 'noa_temperature' 값을 읽어 숫자로 반환한다.
 * SSR 환경(window 미정의)이거나 값이 없거나 파싱 불가이면 undefined를 반환한다.
 *
 * @returns 유효한 온도 숫자 또는 undefined
 */
export function getTemperatureOverride(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  } catch {
    // [C] Safari private mode 등 localStorage 접근 실패 방어
    return undefined;
  }
}

/**
 * localStorage에 temperature override 저장. undefined 전달 시 키 제거.
 * SSR 환경 또는 쓰기 실패(quota/Safari private) 시 false 반환.
 *
 * @param value 저장할 온도. undefined 이면 키 삭제.
 * @returns 성공 여부
 */
export function setTemperatureOverride(value: number | undefined): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (value === undefined) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
    return true;
  } catch {
    return false;
  }
}

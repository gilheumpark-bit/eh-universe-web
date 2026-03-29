import { PlatformType, EpisodeState } from './types';

// ============================================================
// PART 0: CONSTANTS
// ============================================================

/** 토큰 3,000개 ≈ 한글 6,000자 → 1토큰 ≈ 2글자 */
const TOKEN_TO_CHAR_KO = 2.0;
/** 한글 1자 = UTF-8 3바이트이나, 공백·ASCII·숫자 혼합 시 평균 ~2.7 */
const AVG_KOREAN_BYTES = 2.7;

const BYTE_CONFIG: Record<PlatformType, { min: number; max: number }> = {
  [PlatformType.MOBILE]: { min: 9_500, max: 15_500 },
  [PlatformType.WEB]:    { min: 10_500, max: 15_500 },
};

/** 플랫폼별 목표 글자수 범위 (토큰 3,000 ≈ 6,000자 기준) */
const CHAR_CONFIG: Record<PlatformType, { min: number; max: number }> = {
  [PlatformType.MOBILE]: { min: 3500, max: 5700 },
  [PlatformType.WEB]:    { min: 3900, max: 5700 },
};

// ============================================================
// PART 1: BYTE & CHAR MEASUREMENT
// ============================================================

export function calculateByteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** 실제 글자수 계산 (공백 포함) */
export function calculateCharCount(text: string): number {
  return text.length;
}

/** 바이트 → 추정 한글 글자수 환산 */
export function bytesToEstimatedChars(bytes: number): number {
  return Math.round(bytes / AVG_KOREAN_BYTES);
}

/** 글자수 → 추정 토큰 수 환산 */
export function charsToEstimatedTokens(chars: number): number {
  return Math.round(chars / TOKEN_TO_CHAR_KO);
}

/** 토큰 수 → 추정 글자수 환산 */
export function tokensToEstimatedChars(tokens: number): number {
  return Math.round(tokens * TOKEN_TO_CHAR_KO);
}

// ============================================================
// PART 2: RANGE QUERIES
// ============================================================

export function getTargetByteRange(platform: PlatformType): { min: number; max: number } {
  return BYTE_CONFIG[platform];
}

export function getTargetCharRange(platform: PlatformType): { min: number; max: number } {
  return CHAR_CONFIG[platform];
}

export function checkContentLength(
  text: string,
  platform: PlatformType
): {
  withinRange: boolean;
  currentBytes: number;
  currentChars: number;
  estimatedTokens: number;
  target: { min: number; max: number };
  charTarget: { min: number; max: number };
  percentage: number;
} {
  const currentBytes = calculateByteSize(text);
  const currentChars = calculateCharCount(text);
  const estimatedTokens = charsToEstimatedTokens(currentChars);
  const target = getTargetByteRange(platform);
  const charTarget = getTargetCharRange(platform);
  const midpoint = (target.min + target.max) / 2;
  const percentage = Math.round((currentBytes / midpoint) * 100);

  return {
    withinRange: currentBytes >= target.min && currentBytes <= target.max,
    currentBytes,
    currentChars,
    estimatedTokens,
    target,
    charTarget,
    percentage,
  };
}

// ============================================================
// PART 3: EPISODE STATE MACHINE
// ============================================================

export class EpisodeStateMachine {
  private state: EpisodeState = EpisodeState.OPEN;

  getState(): EpisodeState {
    return this.state;
  }

  canGenerate(): boolean {
    return this.state !== EpisodeState.STOP;
  }

  /** 연재물 모드: 에피소드 도중 서사 종결 금지 */
  canTerminate(): boolean {
    return false;
  }

  transition(action: 'continue' | 'wrap_up' | 'stop' | 'reset'): EpisodeState {
    switch (action) {
      case 'continue':
        if (this.state === EpisodeState.STOP) return this.state;
        this.state = EpisodeState.OPEN;
        break;
      case 'wrap_up':
        if (this.state === EpisodeState.OPEN) {
          this.state = EpisodeState.TRANSITION_ONLY;
        }
        break;
      case 'stop':
        this.state = EpisodeState.STOP;
        break;
      case 'reset':
        this.state = EpisodeState.OPEN;
        break;
    }
    return this.state;
  }

  autoTransition(currentBytes: number, platform: PlatformType): EpisodeState {
    const target = getTargetByteRange(platform);

    if (currentBytes >= target.max) {
      this.state = EpisodeState.STOP;
    } else if (currentBytes >= target.min) {
      if (this.state === EpisodeState.OPEN) {
        this.state = EpisodeState.TRANSITION_ONLY;
      }
    }

    return this.state;
  }
}

// ============================================================
// PART 4: EPISODE SEAL (SHA-256 봉인)
// ============================================================

export async function sealEpisode(
  title: string,
  episodeNo: number,
  text: string
): Promise<string> {
  const raw = `${title}:${episodeNo}:${text}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

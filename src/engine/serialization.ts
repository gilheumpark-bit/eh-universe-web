import { PlatformType, EpisodeState } from './types';

// ============================================================
// Byte Size Control — Ported from NOA Serialization Engine
// ============================================================

const BYTE_CONFIG: Record<PlatformType, { min: number; max: number }> = {
  [PlatformType.MOBILE]: { min: 9_500, max: 15_500 },
  [PlatformType.WEB]:    { min: 10_500, max: 15_500 },
};

export function calculateByteSize(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function getTargetByteRange(platform: PlatformType): { min: number; max: number } {
  return BYTE_CONFIG[platform];
}

export function checkContentLength(
  text: string,
  platform: PlatformType
): {
  withinRange: boolean;
  currentBytes: number;
  target: { min: number; max: number };
  percentage: number;
} {
  const currentBytes = calculateByteSize(text);
  const target = getTargetByteRange(platform);
  const midpoint = (target.min + target.max) / 2;
  const percentage = Math.round((currentBytes / midpoint) * 100);

  return {
    withinRange: currentBytes >= target.min && currentBytes <= target.max,
    currentBytes,
    target,
    percentage,
  };
}

// ============================================================
// Episode State Machine — Ported from NOA Serialization Engine
// ============================================================

export class EpisodeStateMachine {
  private state: EpisodeState = EpisodeState.OPEN;

  getState(): EpisodeState {
    return this.state;
  }

  canGenerate(): boolean {
    return this.state !== EpisodeState.STOP;
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

  /**
   * Auto-transition based on content byte size relative to platform target.
   */
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


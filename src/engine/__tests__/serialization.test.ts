import { calculateByteSize, calculateCharCount, bytesToEstimatedChars, charsToEstimatedTokens, tokensToEstimatedChars, getTargetByteRange, getTargetCharRange, checkContentLength, EpisodeStateMachine } from '../serialization';
import { PlatformType, EpisodeState } from '../types';

// ============================================================
// Byte & Char measurement
// ============================================================

describe('calculateByteSize', () => {
  it('calculates UTF-8 bytes correctly', () => {
    expect(calculateByteSize('hello')).toBe(5);
    expect(calculateByteSize('한글')).toBe(6); // 3 bytes per Korean char
    expect(calculateByteSize('')).toBe(0);
  });
});

describe('calculateCharCount', () => {
  it('counts characters including spaces', () => {
    expect(calculateCharCount('hello world')).toBe(11);
    expect(calculateCharCount('한글 테스트')).toBe(6);
    expect(calculateCharCount('')).toBe(0);
  });
});

describe('bytesToEstimatedChars', () => {
  it('converts bytes to estimated Korean chars', () => {
    const chars = bytesToEstimatedChars(9500);
    expect(chars).toBeGreaterThan(3000);
    expect(chars).toBeLessThan(4000);
  });
});

describe('token-char conversion', () => {
  it('3000 tokens ≈ 6000 chars', () => {
    expect(tokensToEstimatedChars(3000)).toBe(6000);
  });

  it('6000 chars ≈ 3000 tokens', () => {
    expect(charsToEstimatedTokens(6000)).toBe(3000);
  });

  it('roundtrips correctly', () => {
    const tokens = 1500;
    const chars = tokensToEstimatedChars(tokens);
    const back = charsToEstimatedTokens(chars);
    expect(back).toBe(tokens);
  });
});

// ============================================================
// Range queries
// ============================================================

describe('getTargetByteRange', () => {
  it('mobile: 9.5~15.5KB', () => {
    const range = getTargetByteRange(PlatformType.MOBILE);
    expect(range.min).toBe(9500);
    expect(range.max).toBe(15500);
  });

  it('web: 10.5~15.5KB', () => {
    const range = getTargetByteRange(PlatformType.WEB);
    expect(range.min).toBe(10500);
    expect(range.max).toBe(15500);
  });
});

describe('getTargetCharRange', () => {
  it('mobile: 3500~5700', () => {
    const range = getTargetCharRange(PlatformType.MOBILE);
    expect(range.min).toBe(3500);
    expect(range.max).toBe(5700);
  });
});

describe('checkContentLength', () => {
  it('short text is not within range', () => {
    const result = checkContentLength('짧은 텍스트', PlatformType.MOBILE);
    expect(result.withinRange).toBe(false);
    expect(result.currentChars).toBeGreaterThan(0);
    expect(result.estimatedTokens).toBeGreaterThan(0);
  });
});

// ============================================================
// EpisodeStateMachine
// ============================================================

describe('EpisodeStateMachine', () => {
  let machine: EpisodeStateMachine;

  beforeEach(() => {
    machine = new EpisodeStateMachine();
  });

  it('starts in OPEN state', () => {
    expect(machine.getState()).toBe(EpisodeState.OPEN);
  });

  it('canGenerate is true when OPEN', () => {
    expect(machine.canGenerate()).toBe(true);
  });

  it('canTerminate always returns false (serialization mode)', () => {
    expect(machine.canTerminate()).toBe(false);
  });

  it('transitions OPEN → TRANSITION_ONLY on wrap_up', () => {
    machine.transition('wrap_up');
    expect(machine.getState()).toBe(EpisodeState.TRANSITION_ONLY);
  });

  it('transitions to STOP', () => {
    machine.transition('stop');
    expect(machine.getState()).toBe(EpisodeState.STOP);
    expect(machine.canGenerate()).toBe(false);
  });

  it('cannot continue from STOP', () => {
    machine.transition('stop');
    machine.transition('continue');
    expect(machine.getState()).toBe(EpisodeState.STOP);
  });

  it('reset brings back to OPEN', () => {
    machine.transition('stop');
    machine.transition('reset');
    expect(machine.getState()).toBe(EpisodeState.OPEN);
  });

  it('autoTransition: below min stays OPEN', () => {
    machine.autoTransition(5000, PlatformType.MOBILE);
    expect(machine.getState()).toBe(EpisodeState.OPEN);
  });

  it('autoTransition: between min-max → TRANSITION_ONLY', () => {
    machine.autoTransition(12000, PlatformType.MOBILE);
    expect(machine.getState()).toBe(EpisodeState.TRANSITION_ONLY);
  });

  it('autoTransition: above max → STOP', () => {
    machine.autoTransition(16000, PlatformType.MOBILE);
    expect(machine.getState()).toBe(EpisodeState.STOP);
  });
});

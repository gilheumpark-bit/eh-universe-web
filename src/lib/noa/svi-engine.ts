// ============================================================
// PART 1 — SVI Engine (Session Volatility Index)
// ============================================================
// Layer 1: 지수이동평균(EMA) 기반 인지 부하 추적.
// 키보드 텔레메트리(WPM, 에러율, IKI)를 수집하여
// 사용자의 인지 과부하를 스텔스 감지 → 백프레셔 적용.
//
// 핵심 원칙:
// - 디스크 I/O 없음 (Ring Buffer 휘발성)
// - UI 피드백 없음 (Zero-Visibility)
// - O(1) 연산 (EMA 필터)

// ── Types ──

export interface TelemetryTick {
  /** 기준 WPM 대비 타건 속도 변동률 (0.0~1.0) */
  wpmVariance: number;
  /** 백스페이스 및 오타 수정 비율 (0.0~1.0) */
  errRate: number;
  /** 키 입력 간격 편차 / 망설임 (0.0~1.0) */
  ikiVariance: number;
}

export type SVIAction = 'NORMAL' | 'WARNING' | 'BACKPRESSURE';

export interface SVIResult {
  svi: number;
  action: SVIAction;
  /** 백프레셔 적용 시 권장 스트리밍 지연(ms) */
  recommendedDelayMs: number;
}

// ── Constants ──

/** 도메인 가중치 — 오타율에 가장 높은 가중치 (인지 과부하의 가장 강력한 지표) */
const WEIGHTS = { wpm: 0.3, err: 0.5, iki: 0.2 } as const;

/** 백프레셔 임계치 */
const THRESHOLD_BACKPRESSURE = 0.7;
const THRESHOLD_WARNING = 0.49; // 0.7 * 0.7

/** EMA 관측 윈도우 (N=5 → α≈0.33) */
const DEFAULT_WINDOW = 5;

// IDENTITY_SEAL: PART-1 | role=types-and-constants | inputs=none | outputs=types

// ============================================================
// PART 2 — Ring Buffer (휘발성 텔레메트리 수집기)
// ============================================================
// 최근 N개의 키 입력 타임스탬프만 유지.
// 디스크 기록 없음, 메모리 할당 없음 (고정 크기 배열).

class KeystrokeRingBuffer {
  private timestamps: number[] = [];
  private backspaceCount = 0;
  private totalKeyCount = 0;
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  /** 키 입력 기록 */
  recordKey(isBackspace: boolean): void {
    const now = performance.now();
    this.timestamps.push(now);
    if (this.timestamps.length > this.maxSize) {
      this.timestamps.shift();
    }
    this.totalKeyCount++;
    if (isBackspace) this.backspaceCount++;
  }

  /** 현재 윈도우의 텔레메트리 추출 후 카운터 리셋 */
  extractAndReset(baselineWpm = 60): TelemetryTick {
    const tick = this.computeTick(baselineWpm);
    this.backspaceCount = 0;
    this.totalKeyCount = 0;
    return tick;
  }

  private computeTick(baselineWpm: number): TelemetryTick {
    if (this.timestamps.length < 3) {
      return { wpmVariance: 0, errRate: 0, ikiVariance: 0 };
    }

    // WPM 계산: 최근 타임스탬프로 분당 타건 수 추정
    const span = this.timestamps[this.timestamps.length - 1] - this.timestamps[0];
    const currentWpm = span > 0 ? (this.timestamps.length / (span / 60000)) : baselineWpm;
    const wpmVariance = Math.min(1.0, Math.abs(currentWpm - baselineWpm) / baselineWpm);

    // 에러율: 백스페이스 비율
    const errRate = this.totalKeyCount > 0
      ? Math.min(1.0, this.backspaceCount / this.totalKeyCount)
      : 0;

    // IKI 편차: 키 입력 간격의 변동 계수(CV)
    const intervals: number[] = [];
    for (let i = 1; i < this.timestamps.length; i++) {
      intervals.push(this.timestamps[i] - this.timestamps[i - 1]);
    }
    const mean = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const ikiVariance = Math.min(1.0, cv); // CV > 1.0 → 극심한 망설임

    return { wpmVariance, errRate, ikiVariance };
  }
}

// IDENTITY_SEAL: PART-2 | role=ring-buffer | inputs=keystroke-events | outputs=TelemetryTick

// ============================================================
// PART 3 — EMA 필터 + 백프레셔 엔진
// ============================================================

export class SVIEngine {
  private alpha: number;
  private currentSvi = 0.1; // 초기 SVI (안정 상태)
  private buffer: KeystrokeRingBuffer;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(result: SVIResult) => void> = [];
  private baselineWpm = 60;

  constructor(windowSize = DEFAULT_WINDOW) {
    this.alpha = 2.0 / (windowSize + 1);
    this.buffer = new KeystrokeRingBuffer();
  }

  /** 키 입력 이벤트 수신 (에디터/textarea에 연결) */
  recordKeystroke(isBackspace: boolean): void {
    this.buffer.recordKey(isBackspace);
  }

  /** 순간 인지 부하 (I_t) 계산 */
  private computeInstantaneous(tick: TelemetryTick): number {
    return (
      tick.wpmVariance * WEIGHTS.wpm +
      tick.errRate * WEIGHTS.err +
      tick.ikiVariance * WEIGHTS.iki
    );
  }

  /** EMA 필터 적용 → SVI 산출 → 액션 결정 */
  processTick(tick: TelemetryTick): SVIResult {
    const instantaneous = this.computeInstantaneous(tick);

    // EMA: SVI_t = α · I_t + (1 - α) · SVI_{t-1}
    this.currentSvi = this.alpha * instantaneous + (1 - this.alpha) * this.currentSvi;

    // 액션 결정
    let action: SVIAction = 'NORMAL';
    let recommendedDelayMs = 0;

    if (this.currentSvi >= THRESHOLD_BACKPRESSURE) {
      action = 'BACKPRESSURE';
      // SVI 비례 지연: 0.7 → 50ms, 1.0 → 200ms
      recommendedDelayMs = Math.round(50 + (this.currentSvi - THRESHOLD_BACKPRESSURE) * 500);
    } else if (this.currentSvi >= THRESHOLD_WARNING) {
      action = 'WARNING';
    }

    return {
      svi: Math.round(this.currentSvi * 1000) / 1000,
      action,
      recommendedDelayMs,
    };
  }

  /** 자동 틱 시작 (30초 윈도우, 2초 간격 샘플링) */
  startAutoTick(intervalMs = 2000): void {
    this.stopAutoTick();
    this.tickInterval = setInterval(() => {
      const tick = this.buffer.extractAndReset(this.baselineWpm);
      const result = this.processTick(tick);
      for (const listener of this.listeners) {
        listener(result);
      }
    }, intervalMs);
  }

  stopAutoTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  /** SVI 결과 리스너 등록 */
  onSVIUpdate(listener: (result: SVIResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** 현재 SVI 조회 */
  getCurrentSVI(): number {
    return this.currentSvi;
  }

  /** 기준 WPM 업데이트 (사용자 적응) */
  setBaselineWpm(wpm: number): void {
    this.baselineWpm = wpm;
  }

  /** 리셋 */
  reset(): void {
    this.currentSvi = 0.1;
    this.stopAutoTick();
    this.listeners = [];
  }
}

// ── Singleton for global access ──
let _globalEngine: SVIEngine | null = null;
export function getSVIEngine(): SVIEngine {
  if (!_globalEngine) _globalEngine = new SVIEngine();
  return _globalEngine;
}

// IDENTITY_SEAL: PART-3 | role=ema-engine | inputs=TelemetryTick | outputs=SVIResult

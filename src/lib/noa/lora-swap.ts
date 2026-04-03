// ============================================================
// PART 1 — Types & Constants (L2 LoRA Hot-Swap)
// ============================================================
// 동적 LoRA Hot-Swapping 메모리 할당 명세.
// 단일 Base Model + 좌/우뇌 어댑터 ms 단위 교체.
// 웹 환경: API 프로바이더 레벨 추상화 (NPU/GPU 직접 제어 대신).

export type AdapterMode = 'LEFT_BRAIN' | 'RIGHT_BRAIN';

export type SwapStatus = 'SUCCESS' | 'CACHE_HIT' | 'OOM_ABORT' | 'TIMEOUT';

export interface AdapterManifest {
  mode: AdapterMode;
  /** 프로바이더 ID (gemini, openai, claude 등) */
  providerId: string;
  /** 모델 ID */
  modelId: string;
  /** 시스템 프롬프트 (어댑터 역할 — LoRA 대체) */
  systemPrompt: string;
  /** 예상 토큰 비용 가중치 */
  costWeight: number;
  /** Temperature 기본값 */
  temperature: number;
}

export interface SwapResult {
  status: SwapStatus;
  latencyMs: number;
  activeMode: AdapterMode;
  sessionId: string;
}

// ── 어댑터 레지스트리 ──

const LEFT_BRAIN_PROMPT = `You are a deterministic analytical engine. Rules:
1. Respond ONLY with structured JSON when schema is provided
2. Never add commentary, greetings, or filler text
3. All calculations must use exact arithmetic, never approximate
4. Flag missing variables instead of assuming values
5. Cite data sources for every claim`;

const RIGHT_BRAIN_PROMPT = `You are a creative writing assistant with warmth and personality.
Respond naturally in the user's language. Be helpful, engaging, and adaptive.
Prioritize user experience and conversation flow over rigid structure.`;

export const ADAPTER_REGISTRY: Record<AdapterMode, AdapterManifest> = {
  LEFT_BRAIN: {
    mode: 'LEFT_BRAIN',
    providerId: 'gemini',
    modelId: 'gemini-2.5-pro',
    systemPrompt: LEFT_BRAIN_PROMPT,
    costWeight: 1.2,
    temperature: 0.1,
  },
  RIGHT_BRAIN: {
    mode: 'RIGHT_BRAIN',
    providerId: 'gemini',
    modelId: 'gemini-2.5-flash',
    systemPrompt: RIGHT_BRAIN_PROMPT,
    costWeight: 0.3,
    temperature: 0.9,
  },
};

// IDENTITY_SEAL: PART-1 | role=types-and-registry | inputs=none | outputs=types,ADAPTER_REGISTRY

// ============================================================
// PART 2 — VRAM Manager (웹 추상화)
// ============================================================
// 실제 VRAM 대신 컨텍스트 윈도우 + API 비용을 관리.
// 동시 추론 방지 (mutex), 타임아웃 방어.

const SWAP_TIMEOUT_MS = 80;
const MAX_CONCURRENT_INFERENCES = 1;

export class VRAMManager {
  private activeMode: AdapterMode | null = null;
  private inferenceCount = 0;
  private lastSwapMs = 0;

  /** 현재 활성 어댑터 */
  getActiveMode(): AdapterMode | null {
    return this.activeMode;
  }

  /** 어댑터 해제 */
  unload(): void {
    this.activeMode = null;
  }

  /** 어댑터 적재 — OOM(동시 추론 초과) 방어 */
  load(manifest: AdapterManifest): number {
    if (this.inferenceCount >= MAX_CONCURRENT_INFERENCES) {
      throw new Error(`OOM 방어: 동시 추론 ${this.inferenceCount}/${MAX_CONCURRENT_INFERENCES} 초과`);
    }
    const start = performance.now();
    this.activeMode = manifest.mode;
    this.lastSwapMs = performance.now() - start;
    return this.lastSwapMs;
  }

  /** 추론 시작 카운터 */
  beginInference(): void {
    this.inferenceCount++;
  }

  /** 추론 종료 카운터 */
  endInference(): void {
    this.inferenceCount = Math.max(0, this.inferenceCount - 1);
  }

  /** 예상 swap 비용 */
  estimateSwapCost(): number {
    return this.lastSwapMs;
  }
}

// IDENTITY_SEAL: PART-2 | role=vram-manager | inputs=AdapterManifest | outputs=latencyMs

// ============================================================
// PART 3 — Swap Controller (핵심 오케스트레이터)
// ============================================================
// L2 라우팅 결과에 따라 좌/우뇌 어댑터를 ms 단위로 교체.
// 캐시 히트, OOM 방어, Taint 연동.

import { getTaintTracker, type TaintDomain } from './taint-tracker';

/** AdapterMode → TaintDomain 매핑 */
function modeToTaintDomain(mode: AdapterMode): TaintDomain {
  return mode === 'LEFT_BRAIN' ? 'code' : 'novel';
}

export class SwapController {
  private vram: VRAMManager;
  private registry: Record<AdapterMode, AdapterManifest>;

  constructor(
    vram?: VRAMManager,
    registry?: Record<AdapterMode, AdapterManifest>,
  ) {
    this.vram = vram ?? new VRAMManager();
    this.registry = registry ?? ADAPTER_REGISTRY;
  }

  /** 어댑터 교체 요청 */
  requestSwap(target: AdapterMode, sessionId: string): SwapResult {
    const start = performance.now();
    const currentMode = this.vram.getActiveMode();

    // 캐시 히트: 동일 어댑터 이미 적재
    if (currentMode === target) {
      getTaintTracker().taint(sessionId, modeToTaintDomain(target));
      return {
        status: 'CACHE_HIT',
        latencyMs: 0,
        activeMode: target,
        sessionId,
      };
    }

    const manifest = this.registry[target];

    // 타임아웃 사전 검증
    if (this.vram.estimateSwapCost() > SWAP_TIMEOUT_MS) {
      return {
        status: 'TIMEOUT',
        latencyMs: performance.now() - start,
        activeMode: currentMode ?? target,
        sessionId,
      };
    }

    try {
      this.vram.unload();
      this.vram.load(manifest);
    } catch {
      return {
        status: 'OOM_ABORT',
        latencyMs: performance.now() - start,
        activeMode: currentMode ?? target,
        sessionId,
      };
    }

    // Taint 태깅
    getTaintTracker().taint(sessionId, modeToTaintDomain(target));

    return {
      status: 'SUCCESS',
      latencyMs: performance.now() - start,
      activeMode: target,
      sessionId,
    };
  }

  /** 현재 활성 어댑터의 manifest 조회 */
  getActiveManifest(): AdapterManifest | null {
    const mode = this.vram.getActiveMode();
    return mode ? this.registry[mode] : null;
  }

  /** 현재 활성 모드 */
  getActiveMode(): AdapterMode | null {
    return this.vram.getActiveMode();
  }
}

// ── Singleton ──
let _globalSwap: SwapController | null = null;
export function getSwapController(): SwapController {
  if (!_globalSwap) _globalSwap = new SwapController();
  return _globalSwap;
}

// IDENTITY_SEAL: PART-3 | role=swap-controller | inputs=AdapterMode,sessionId | outputs=SwapResult

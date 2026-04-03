// ============================================================
// PART 1 — Types & Constants (L2 LoRA Hot-Swap)
// ============================================================
// 동적 LoRA Hot-Swapping 메모리 할당 명세.
// 단일 Base Model + 좌/우뇌 어댑터 ms 단위 교체.
// 웹 환경: API 프로바이더 레벨 추상화 (NPU/GPU 직접 제어 대신).

export type AdapterMode = 'LEFT_BRAIN' | 'RIGHT_BRAIN';

export type SwapStatus = 'SUCCESS' | 'CACHE_HIT' | 'OOM_ABORT' | 'TIMEOUT';

/**
 * 서사 깊이 레벨 (Narrative Depth)
 * 0.9 = 평작 (의도적 대중성 — 가독성 우선, 묘사 절제)
 * 1.0 = 기본 (균형 — 장르 관습 준수, 적절한 묘사)
 * 1.2 = 심화 (문학적 깊이 — 비유/상징 적극 사용)
 * 1.5 = 최대 (문예 수준 — 밀도 높은 문장, 다층 서사)
 */
export type NarrativeDepth = number; // 0.9 ~ 1.5

const DEPTH_PROMPT_MAP: Record<string, string> = {
  '0.9': `[Depth: 평작] 가독성 최우선. 짧은 문장, 직접적 묘사, 클리셰 허용. 독자 이탈 방지가 목표. 1문장 1행동 원칙.`,
  '1.0': `[Depth: 기본] 장르 관습 준수. 적절한 묘사와 대화 균형. 복선 1-2개 유지. 감정선 자연스러운 흐름.`,
  '1.2': `[Depth: 심화] 비유/상징 적극 활용. 인물 내면 다층 묘사. 복선 3개 이상 병행. 문장 리듬 변주(단문↔장문 교차).`,
  '1.5': `[Depth: 최대] 문예 수준 밀도. 모든 문장이 서사적 기능 수행. 감각 묘사(시각+청각+촉각 혼합), 의식의 흐름, 상징 체계 유지. 독자에게 해석 여지를 남기는 열린 서사.`,
};

/** 깊이 값에 가장 가까운 프롬프트 키 반환 */
function getDepthPrompt(depth: NarrativeDepth): string {
  const clamped = Math.max(0.9, Math.min(1.5, depth));
  const keys = [0.9, 1.0, 1.2, 1.5];
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
  );
  return DEPTH_PROMPT_MAP[closest.toString()] ?? DEPTH_PROMPT_MAP['1.0'];
}

/** 현재 서사 깊이 설정 (런타임 변경 가능) */
let currentNarrativeDepth: NarrativeDepth = 1.0;

export function setNarrativeDepth(depth: NarrativeDepth): void {
  currentNarrativeDepth = Math.max(0.9, Math.min(1.5, depth));
}

export function getNarrativeDepth(): NarrativeDepth {
  return currentNarrativeDepth;
}

/** 깊이에 따른 temperature 보정 */
function depthToTemperature(baseTemp: number, depth: NarrativeDepth): number {
  // 0.9 → temp -0.05, 1.0 → 0, 1.2 → +0.1, 1.5 → +0.2
  const offset = (depth - 1.0) * 0.4;
  return Math.max(0.1, Math.min(1.5, baseTemp + offset));
}

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
Rules:
1. Always respond in the user's language with natural, warm phrasing
2. For creative writing: prioritize narrative flow, emotional resonance, and genre conventions
3. Adapt formality level to match the user's register (casual ↔ formal)
4. Show, don't tell — use vivid examples over abstract advice
5. Never break character or add meta-commentary about being an AI
6. Dialogue must reveal character — no exposition dumps disguised as speech
7. Maintain shadow-state continuity: track character emotions/wounds across scenes
8. Hook within 3 sentences — every scene opens mid-tension, not with setting description
9. Genre conventions: 웹소설 is hook→갈등→반전→여운, not prologue→development→climax
10. Forbidden patterns: "한숨을 내쉬었다" (overused), "눈을 가늘게 떴다" (cliché), "주먹을 불끈 쥐었다" (stock)

Example (BAD → GOOD):
BAD: "그는 화가 났다. 주먹을 불끈 쥐었다."
GOOD: "손톱이 손바닥에 박히는 줄도 몰랐다. 목소리만은 평온하게 유지하려 했지만, 턱이 먼저 굳었다."`;

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

  /** 현재 활성 어댑터의 manifest 조회 (RIGHT_BRAIN이면 depth 보정 적용) */
  getActiveManifest(): AdapterManifest | null {
    const mode = this.vram.getActiveMode();
    if (!mode) return null;
    const base = this.registry[mode];
    if (mode === 'RIGHT_BRAIN') {
      const depth = getNarrativeDepth();
      return {
        ...base,
        systemPrompt: base.systemPrompt + '\n\n' + getDepthPrompt(depth),
        temperature: depthToTemperature(base.temperature, depth),
      };
    }
    return base;
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

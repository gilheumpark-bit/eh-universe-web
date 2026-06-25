// ============================================================
// EHSU Multi-Key Bridge
// ============================================================
// multi-key-manager ↔ ai-providers 연결.
// 멀티키 설정이 있으면 역할별 슬롯 사용, 없으면 기존 단일키 fallback.

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import {
  type AgentRole,
  type KeySlot,
  
  loadMultiKeyConfig,
  saveMultiKeyConfig,
  getSlotForRole,
  getSlotsForCrossValidation,
  getActiveSlotCount,
  trackSlotUsage,
  evaluateCrossValidation,
  type CrossValidationResult,
} from './multi-key-manager';

import {
  type ProviderId,
  type StreamOptions,
  type ChatMsg,
  streamChat as originalStreamChat,
  getActiveProvider,
  getApiKey,
  setActiveProvider,
  setApiKey,
  getActiveModel,
  setActiveModel,
} from './ai-providers';

// ============================================================
// PART 2 — Slot-aware Streaming
// ============================================================

export interface MultiKeyStreamOptions extends Omit<StreamOptions, 'onChunk'> {
  role?: AgentRole;
  onChunk: (text: string) => void;
  /** 특정 슬롯 강제 지정 (역할 매칭 무시) */
  forceSlotId?: string;
}

/**
 * 멀티키 스트리밍.
 * 1. 멀티키 활성 슬롯이 있으면 역할별 슬롯 사용
 * 2. 없으면 기존 단일키 streamChat fallback
 * 3. 사용량 자동 추적
 */
export async function streamWithMultiKey(opts: MultiKeyStreamOptions): Promise<{
  text: string;
  slotId: string | null;
  provider: ProviderId;
  model: string;
}> {
  const config = loadMultiKeyConfig();
  const activeCount = getActiveSlotCount(config);

  // Fallback: 멀티키 미설정 → 기존 단일키
  if (activeCount === 0) {
    // [K] _accumulated 미사용 — streamChat이 text 반환하므로 누적 불필요
    const text = await originalStreamChat({
      ...opts,
      onChunk: opts.onChunk,
    });
    return {
      text,
      slotId: null,
      provider: getActiveProvider(),
      model: getActiveModel(),
    };
  }

  // 슬롯 결정
  const role = opts.role ?? 'general';
  let slot: KeySlot | null = null;

  if (opts.forceSlotId) {
    slot = config.slots.find((s) => s.id === opts.forceSlotId && s.enabled && s.apiKey) ?? null;
  }
  if (!slot) {
    slot = getSlotForRole(config, role);
  }

  // 슬롯 없으면 fallback
  if (!slot) {
    // [K] _accumulated 미사용 제거
    const text = await originalStreamChat({
      ...opts,
      onChunk: opts.onChunk,
    });
    return {
      text,
      slotId: null,
      provider: getActiveProvider(),
      model: getActiveModel(),
    };
  }

  // 임시로 활성 프로바이더/모델/키 전환 → streamChat 호출 → 복원
  const prevProvider = getActiveProvider();
  const prevModel = getActiveModel();
  const prevKey = getApiKey(slot.provider);

  setActiveProvider(slot.provider);
  setActiveModel(slot.model);
  setApiKey(slot.provider, slot.apiKey);

  try {
    const text = await originalStreamChat({
      ...opts,
      onChunk: opts.onChunk,
    });

    // 사용량 추적 (대략적 토큰 추정: 4자 ≈ 1토큰)
    const inputTokens = Math.ceil(
      opts.messages.reduce((acc, m) => acc + m.content.length, 0) / 4
    );
    const outputTokens = Math.ceil(text.length / 4);
    const updatedConfig = trackSlotUsage(config, slot.id, inputTokens, outputTokens);
    saveMultiKeyConfig(updatedConfig);

    return {
      text,
      slotId: slot.id,
      provider: slot.provider,
      model: slot.model,
    };
  } finally {
    // 원래 설정 복원
    setActiveProvider(prevProvider);
    setActiveModel(prevModel);
    if (prevKey !== undefined) setApiKey(slot.provider, prevKey);
  }
}

// ============================================================
// PART 3 — Cross-Validation Streaming
// ============================================================

export interface CrossValidationOptions {
  role: AgentRole;
  systemInstruction: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** 점수 추출 함수: 응답 텍스트 → 0~1 점수 */
  scoreExtractor: (response: string) => number;
}

/**
 * 크로스밸리데이션: 여러 모델에 동일 질문 → 결과 비교.
 * crossValidation이 비활성이거나 후보가 2개 미만이면 단일 호출 fallback.
 */
export async function streamWithCrossValidation(
  opts: CrossValidationOptions
): Promise<CrossValidationResult> {
  const config = loadMultiKeyConfig();

  if (!config.crossValidation) {
    // 단일 호출
    const slot = getSlotForRole(config, opts.role);
    if (!slot) {
      return { consensus: false, results: [], avgScore: 0, divergence: 1 };
    }

    let fullText = '';
    await streamWithMultiKey({
      role: opts.role,
      systemInstruction: opts.systemInstruction,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal: opts.signal,
      onChunk: (c) => { fullText += c; },
    });

    const score = opts.scoreExtractor(fullText);
    return evaluateCrossValidation([{
      score,
      response: fullText,
      slotId: slot.id,
      provider: slot.provider,
      model: slot.model,
    }]);
  }

  // 병렬 크로스밸리데이션
  const candidates = getSlotsForCrossValidation(config, opts.role);
  if (candidates.length < 2) {
    // 후보 부족 → 단일 호출
    const slot = candidates[0] ?? getSlotForRole(config, opts.role);
    if (!slot) {
      return { consensus: false, results: [], avgScore: 0, divergence: 1 };
    }

    let fullText = '';
    await streamWithMultiKey({
      role: opts.role,
      forceSlotId: slot.id,
      systemInstruction: opts.systemInstruction,
      messages: opts.messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal: opts.signal,
      onChunk: (c) => { fullText += c; },
    });

    const score = opts.scoreExtractor(fullText);
    return evaluateCrossValidation([{
      score,
      response: fullText,
      slotId: slot.id,
      provider: slot.provider,
      model: slot.model,
    }]);
  }

  // [H3 fix] 기존 executeParallel 경로는 각 슬롯 task가 동시에 전역
  // active provider/model/key(localStorage)를 set→복원 했다. 병렬 실행 시
  // 한 슬롯이 set한 전역 상태를 다른 슬롯이 덮어써 잘못된 키/프로바이더로
  // 요청이 나가거나 키가 오염됐다(set→호출→복원의 임계 구역이 인터리브됨).
  // → 전역 상태를 변이하는 set→호출→복원 구간을 *순차* 직렬화한다.
  //   슬롯 호출을 streamWithMultiKey로 위임하면(이미 동일한 set/복원·사용량
  //   추적 로직 보유) 한 번에 하나의 슬롯만 전역 상태를 점유하므로 경쟁이
  //   사라진다. 결과 집계(evaluateCrossValidation)와 사용량 추적 동작은 유지.
  //   개별 슬롯 실패는 건너뛰어(allSettled와 동일) 하나의 실패가 전체 교차
  //   검증을 중단시키지 않게 한다. 직렬 실행이라 config.maxParallel은 미적용.
  // [H3 fix] evaluateCrossValidation의 매개변수 타입을 그대로 차용해
  // ProviderId 출처 차이로 인한 타입 불일치를 방지.
  const scored: Parameters<typeof evaluateCrossValidation>[0] = [];

  for (const slot of candidates.slice(0, config.maxParallel)) {
    try {
      let text = '';
      const res = await streamWithMultiKey({
        role: opts.role,
        forceSlotId: slot.id,
        systemInstruction: opts.systemInstruction,
        messages: opts.messages,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        signal: opts.signal,
        onChunk: (c) => { text += c; },
      });

      // [H3 fix] 집계 필드는 KeySlot(slot.*)에서 취한다. forceSlotId로 이
      // 슬롯을 강제 지정했으므로 res.provider/model과 동일하며, slot.provider는
      // multi-key-manager의 (좁은) ProviderId라 evaluateCrossValidation 타입과
      // 정확히 일치한다(원본 executeParallel 경로와 동일한 출처).
      void res; // streamWithMultiKey 호출은 사용량 추적 등 부수효과를 위해 유지
      scored.push({
        score: opts.scoreExtractor(text),
        response: text,
        slotId: slot.id,
        provider: slot.provider,
        model: slot.model,
      });
    } catch (err) {
      // 한 슬롯 실패는 무시하고 다음 슬롯 진행 (Promise.allSettled 동작 보존).
      // AbortError는 전체 중단 의도이므로 그대로 전파.
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  return evaluateCrossValidation(scored);
}

// ============================================================
// PART 4 — Utility Exports
// ============================================================

/** 현재 멀티키가 활성 상태인지 */
export function isMultiKeyActive(): boolean {
  const config = loadMultiKeyConfig();
  return getActiveSlotCount(config) > 0;
}

/** 역할에 할당된 슬롯 정보 (UI 표시용) */
export function getSlotInfoForRole(role: AgentRole): {
  available: boolean;
  provider?: ProviderId;
  model?: string;
  label?: string;
} {
  const config = loadMultiKeyConfig();
  const slot = getSlotForRole(config, role);
  if (!slot) return { available: false };
  return {
    available: true,
    provider: slot.provider,
    model: slot.model,
    label: slot.label,
  };
}

/** 모든 활성 슬롯의 역할 매핑 (UI 표시용) */
export function getActiveRoleMap(): Array<{
  slotId: string;
  provider: ProviderId;
  model: string;
  role: AgentRole;
  label: string;
}> {
  const config = loadMultiKeyConfig();
  return config.slots
    .filter((s) => s.enabled && s.apiKey)
    .map((s) => ({
      slotId: s.id,
      provider: s.provider,
      model: s.model,
      role: s.assignedRole,
      label: s.label,
    }));
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=types
// IDENTITY_SEAL: PART-2 | role=SlotStreaming | inputs=role,messages | outputs=text,slotId
// IDENTITY_SEAL: PART-3 | role=CrossValidation | inputs=role,messages,scoreExtractor | outputs=CrossValidationResult
// IDENTITY_SEAL: PART-4 | role=Utilities | inputs=role | outputs=slotInfo,roleMap

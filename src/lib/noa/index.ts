// ============================================================
// NOA Security Framework v1.0 — Central Orchestrator
// Ported from NOA Python Ecosystem (v27~v7080)
// ============================================================
//
// 파이프라인 흐름:
//   Input → Sanitize → FastTrack → Trinity → Judgment
//         → Availability → Tactical → Audit → Result
//
// 현재 상태: 7계층 라이브 구현 완료 (v42.6).
// FAST_TRACK, TRINITY, JUDGMENT, AVAILABILITY, TACTICAL, AUDIT 모든 레이어 작동 중.
// ============================================================

import type {
  NoaInput,
  NoaResult,
  NoaConfig,
  AuditEntry,
  AuditManager,
} from "./types";

import { createDefaultNoaConfig } from "./config";
import { sanitizeInput } from "./sanitizer";
import { runFastTrack } from "./fast-track";
import { runTrinity } from "./trinity";
import { runJudgment } from "./judgment";
import { selectTacticalPath } from "./tactical";
import { createAuditManager } from "./audit";
import { createRiskBudgetManager } from "./availability";
import { recordAuditEntry } from "./audit-report";

// ============================================================
// Singleton State (세션 수명)
// ============================================================

let auditManager: AuditManager | null = null;
let riskBudgetManager: ReturnType<typeof createRiskBudgetManager> | null = null;

function ensureManagers(config: NoaConfig) {
  if (!auditManager) {
    auditManager = createAuditManager(config.hmacSecret);
  }
  if (!riskBudgetManager) {
    riskBudgetManager = createRiskBudgetManager(config.dailyRiskBudget);
  }
}

export function getAuditManager(config: NoaConfig): AuditManager {
  ensureManagers(config);
  return auditManager!;
}

// ============================================================
// Main Orchestrator
// ============================================================

/**
 * NOA 보안 프레임워크 메인 진입점.
 *
 * 7개 레이어를 순차 실행하여 입력의 안전성을 판정한다:
 * 1. Sanitizer — Zero-Width/자모/NFKC 정규화
 * 2. Fast Track — 0ms 즉결 분류 (PASS/BLOCK/ESCALATE)
 * 3. Trinity — Shield/Sword/Scale 3자 합의
 * 4. Judgment — 27단계 등급 + 도메인 가중치
 * 5. Availability — 일일 리스크 예산 확인
 * 6. Tactical — 5개 전술 경로 선택
 * 7. Audit — 해시 체인 기록
 *
 * @param input - 검사할 입력
 * @param config - NOA 설정 (부분 오버라이드 가능)
 * @returns NOA 판정 결과
 */
export async function runNoa(
  input: NoaInput,
  config?: Partial<NoaConfig>
): Promise<NoaResult> {
  const startTime = performance.now();
  const fullConfig: NoaConfig = {
    ...createDefaultNoaConfig(),
    ...config,
  };

  ensureManagers(fullConfig);

  const layerDurations = {
    sanitize: 0,
    fastTrack: 0,
    trinity: 0,
    judgment: 0,
    availability: 0,
    tactical: 0,
    audit: 0,
  };

  // --- Layer 1: Sanitize ---
  const t1 = performance.now();
  const sanitized = sanitizeInput(input.text);
  layerDurations.sanitize = performance.now() - t1;

  // --- Layer 2: Fast Track ---
  const t2 = performance.now();
  const fastTrack = runFastTrack(sanitized.sanitized);
  layerDurations.fastTrack = performance.now() - t2;

  // Fast PASS → 바로 허용
  if (fastTrack.verdict === "PASS") {
    const ta1 = performance.now();
    // Record in audit-report for dashboard/reporting
    recordAuditEntry({
      timestamp: Date.now(),
      input: input.text.slice(0, 200),
      result: "allowed",
      layer: "fast-track",
      reason: "FAST_TRACK_PASS",
      severity: "low",
    });
    const auditEntry = await auditManager!.append({
      timestamp: Date.now(),
      layer: "fast-track",
      input: input.text.slice(0, 100),
      output: "FAST_PASS",
      verdict: "ALLOW",
    });
    layerDurations.audit = performance.now() - ta1;

    return buildResult(true, sanitized.sanitized, fastTrack, null, null, {
      selectedPath: "ALLOW",
      config: fullConfig.tacticalConfigs.ALLOW,
      reason: "FAST_TRACK_PASS",
    }, auditEntry, {
      allowed: true, budgetRemaining: riskBudgetManager!.getState().remaining,
      hallucinationFlag: false, action: "proceed",
    }, startTime, layerDurations);
  }

  // Fast BLOCK → 즉시 거부
  if (fastTrack.verdict === "BLOCK") {
    const ta2 = performance.now();
    recordAuditEntry({
      timestamp: Date.now(),
      input: input.text.slice(0, 200),
      result: "blocked",
      layer: "fast-track",
      reason: "FAST_TRACK_BLOCK",
      severity: "high",
    });
    const auditEntry = await auditManager!.append({
      timestamp: Date.now(),
      layer: "fast-track",
      input: input.text.slice(0, 100),
      output: "FAST_BLOCK",
      verdict: "BLOCK",
    });
    layerDurations.audit = performance.now() - ta2;

    return buildResult(false, sanitized.sanitized, fastTrack, null, null, {
      selectedPath: "BLOCK",
      config: fullConfig.tacticalConfigs.BLOCK,
      reason: "FAST_TRACK_BLOCK",
    }, auditEntry, {
      allowed: false, budgetRemaining: riskBudgetManager!.getState().remaining,
      hallucinationFlag: false, action: "burn",
    }, startTime, layerDurations);
  }

  // --- Layer 3: Trinity ---
  const t3 = performance.now();
  const trinity = runTrinity(sanitized.sanitized, fullConfig.trinityWeights);
  layerDurations.trinity = performance.now() - t3;

  // --- Layer 4: Judgment ---
  const t4 = performance.now();
  const domain = input.domain ?? "general";
  const sourceTier = input.sourceTier ?? 2;
  const judgment = runJudgment(trinity.weightedScore, domain, sourceTier);
  layerDurations.judgment = performance.now() - t4;

  // --- Layer 5: Availability ---
  const t5 = performance.now();
  const riskCost = judgment.adjustedRisk / 10;
  const availability = riskBudgetManager!.check(riskCost);
  layerDurations.availability = performance.now() - t5;

  // --- Layer 6: Tactical ---
  const t6 = performance.now();
  const tactical = selectTacticalPath(judgment.grade, availability);

  // 예산 소진
  if (availability.allowed) {
    riskBudgetManager!.consume(riskCost);
  }
  layerDurations.tactical = performance.now() - t6;

  // --- Layer 7: Audit ---
  const t7 = performance.now();
  const allowed = tactical.selectedPath !== "BLOCK";

  // Record in audit-report for dashboard/reporting
  recordAuditEntry({
    timestamp: Date.now(),
    input: input.text.slice(0, 200),
    result: allowed ? "allowed" : "blocked",
    layer: "trinity",
    reason: `${judgment.grade.label} → ${tactical.selectedPath}`,
    severity: judgment.adjustedRisk > 0.7 ? "critical" : judgment.adjustedRisk > 0.5 ? "high" : judgment.adjustedRisk > 0.3 ? "medium" : "low",
  });

  const auditEntry = await auditManager!.append({
    timestamp: Date.now(),
    layer: "trinity",
    input: input.text.slice(0, 100),
    output: `${judgment.grade.label} → ${tactical.selectedPath}`,
    verdict: allowed ? "ALLOW" : "BLOCK",
  });
  layerDurations.audit = performance.now() - t7;

  return buildResult(
    allowed, sanitized.sanitized, fastTrack, trinity, judgment,
    tactical, auditEntry, availability, startTime, layerDurations
  );
}

// ============================================================
// Result Builder
// ============================================================

function buildResult(
  allowed: boolean,
  sanitizedText: string,
  fastTrack: NoaResult["fastTrack"],
  trinity: NoaResult["trinity"],
  judgment: NoaResult["judgment"],
  tactical: NoaResult["tactical"],
  auditEntry: AuditEntry,
  availability: NoaResult["availability"],
  startTime: number,
  layerDurations: NoaResult["layerDurations"]
): NoaResult {
  return {
    allowed,
    sanitizedText,
    fastTrack,
    trinity,
    judgment,
    tactical,
    auditEntry,
    availability,
    totalDurationMs: Math.round(performance.now() - startTime),
    layerDurations: {
      sanitize: Math.round(layerDurations.sanitize * 100) / 100,
      fastTrack: Math.round(layerDurations.fastTrack * 100) / 100,
      trinity: Math.round(layerDurations.trinity * 100) / 100,
      judgment: Math.round(layerDurations.judgment * 100) / 100,
      availability: Math.round(layerDurations.availability * 100) / 100,
      tactical: Math.round(layerDurations.tactical * 100) / 100,
      audit: Math.round(layerDurations.audit * 100) / 100,
    },
  };
}

// ============================================================
// Re-exports (convenience)
// ============================================================

export type {
  NoaInput,
  NoaResult,
  NoaConfig,
  NoaLayer,
  FastTrackVerdict,
  FastTrackResult,
  TrinityVote,
  TrinityResult,
  EgoResult,
  GradeEntry,
  DomainType,
  SourceTier,
  TacticalPath,
  TacticalResult,
  AuditEntry,
  AuditVerification,
  AvailabilityResult,
  HallucinationCheck,
} from "./types";

export { createDefaultNoaConfig } from "./config";
export { sanitizeInput } from "./sanitizer";
export { runFastTrack } from "./fast-track";
export { runTrinity } from "./trinity";
export { runJudgment } from "./judgment";
export { selectTacticalPath } from "./tactical";
export { createAuditManager } from "./audit";
export { createRiskBudgetManager } from "./availability";
export { checkHallucination } from "./availability/hallucination";
export { recordAuditEntry, generateAuditReport, getRecentThreats, formatAuditMarkdown, clearAuditLog } from "./audit-report";

// ── NOA-SYS v2.1 Layers ──
// L1: SVI Engine (Session Volatility Index — EMA 기반 인지 부하 추적)
export { SVIEngine, getSVIEngine, type SVIResult, type SVIAction, type TelemetryTick } from "./svi-engine";
// L3.1: Constrained Decoder (좌뇌 Guillotine — JSON Schema 강제)
export { validateConstrainedOutput, buildConstrainedSystemPrompt, runConstrainedPipeline, MATH_CALCULATION_SCHEMA, NOVEL_GENERATION_SCHEMA, type GuillotineResult, type GuillotineVerdict, type ConstraintSchema } from "./constrained-decoder";
// L4: Saga Transaction (원자적 승인 — 보상 트랜잭션 롤백)
export { SagaOrchestrator, createAIWorkSaga, type SagaStep, type SagaResult, type SagaStatus } from "./saga-transaction";
// L2: Taint Tracker (데이터 격리 — 도메인 간 오염 방지)
export { TaintTracker, getTaintTracker, type TaintDomain, type TaintedData, type DecontaminatedData } from "./taint-tracker";

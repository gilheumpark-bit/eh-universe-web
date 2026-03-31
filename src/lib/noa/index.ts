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

  // --- Layer 1: Sanitize ---
  const sanitized = sanitizeInput(input.text);

  // --- Layer 2: Fast Track ---
  const fastTrack = runFastTrack(sanitized.sanitized);

  // Fast PASS → 바로 허용
  if (fastTrack.verdict === "PASS") {
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

    return buildResult(true, sanitized.sanitized, fastTrack, null, null, {
      selectedPath: "ALLOW",
      config: fullConfig.tacticalConfigs.ALLOW,
      reason: "FAST_TRACK_PASS",
    }, auditEntry, {
      allowed: true, budgetRemaining: riskBudgetManager!.getState().remaining,
      hallucinationFlag: false, action: "proceed",
    }, startTime);
  }

  // Fast BLOCK → 즉시 거부
  if (fastTrack.verdict === "BLOCK") {
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

    return buildResult(false, sanitized.sanitized, fastTrack, null, null, {
      selectedPath: "BLOCK",
      config: fullConfig.tacticalConfigs.BLOCK,
      reason: "FAST_TRACK_BLOCK",
    }, auditEntry, {
      allowed: false, budgetRemaining: riskBudgetManager!.getState().remaining,
      hallucinationFlag: false, action: "burn",
    }, startTime);
  }

  // --- Layer 3: Trinity ---
  const trinity = runTrinity(sanitized.sanitized, fullConfig.trinityWeights);

  // --- Layer 4: Judgment ---
  const domain = input.domain ?? "general";
  const sourceTier = input.sourceTier ?? 2;
  const judgment = runJudgment(trinity.weightedScore, domain, sourceTier);

  // --- Layer 5: Availability ---
  const riskCost = judgment.adjustedRisk / 10;
  const availability = riskBudgetManager!.check(riskCost);

  // --- Layer 6: Tactical ---
  const tactical = selectTacticalPath(judgment.grade, availability);

  // 예산 소진
  if (availability.allowed) {
    riskBudgetManager!.consume(riskCost);
  }

  // --- Layer 7: Audit ---
  const allowed = tactical.selectedPath !== "BLOCK";

  // Record in audit-report for dashboard/reporting
  recordAuditEntry({
    timestamp: Date.now(),
    input: input.text.slice(0, 200),
    result: allowed ? "allowed" : "blocked",
    layer: "trinity",
    reason: `${judgment.grade.label} → ${tactical.selectedPath}`,
    severity: judgment.adjustedRisk > 7 ? "critical" : judgment.adjustedRisk > 5 ? "high" : judgment.adjustedRisk > 3 ? "medium" : "low",
  });

  const auditEntry = await auditManager!.append({
    timestamp: Date.now(),
    layer: "trinity",
    input: input.text.slice(0, 100),
    output: `${judgment.grade.label} → ${tactical.selectedPath}`,
    verdict: allowed ? "ALLOW" : "BLOCK",
  });

  return buildResult(
    allowed, sanitized.sanitized, fastTrack, trinity, judgment,
    tactical, auditEntry, availability, startTime
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
  startTime: number
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

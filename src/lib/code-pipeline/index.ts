// ============================================================
// CSL 8-Team Pipeline Orchestrator
// ============================================================

import type { PipelineContext, PipelineResult, TeamResult, PipelineCallbacks, PipelineStage } from "./types";
import { checkBeacon } from "./beacon";
import { runSimulation } from "./teams/01-simulation";
import { runGeneration } from "./teams/02-generation";
import { runValidation } from "./teams/03-validation";
import { runAssetTrace } from "./teams/05-asset-trace";
import { runStability } from "./teams/06-stability";
import { runReleaseIP } from "./teams/07-release-ip";
import { runGovernance } from "./teams/08-governance";
import { runMultiAIReview, getAvailableReviewers } from "./multi-ai-review";

// ── Team Registry ──

type TeamFn = (ctx: PipelineContext) => TeamResult;

const TEAMS: { stage: PipelineStage; run: TeamFn; blocking: boolean }[] = [
  { stage: "simulation",   run: runSimulation,   blocking: false },
  { stage: "generation",   run: runGeneration,   blocking: false },
  { stage: "validation",   run: runValidation,   blocking: true  },
  { stage: "size-density",  run: runSizeDensity,  blocking: false },
  { stage: "asset-trace",   run: runAssetTrace,   blocking: false },
  { stage: "stability",     run: runStability,     blocking: false },
  { stage: "release-ip",    run: runReleaseIP,    blocking: true  },
  { stage: "governance",    run: runGovernance,   blocking: false },
];

// ── Orchestrator ──

export async function runPipeline(
  ctx: PipelineContext,
  callbacks?: PipelineCallbacks,
): Promise<PipelineResult> {
  const results: TeamResult[] = [];
  let blocked = false;

  // Separate blocking teams (must run sequentially) from parallel teams
  const blockingTeams = TEAMS.filter((t) => t.blocking);
  const parallelTeams = TEAMS.filter((t) => !t.blocking);

  // Run all non-blocking teams in parallel
  if (!callbacks?.signal?.aborted) {
    const parallelPromises = parallelTeams.map(async (team) => {
      if (callbacks?.signal?.aborted) return null;
      callbacks?.onTeamStart?.(team.stage);
      try {
        const result = team.run(ctx);
        callbacks?.onTeamComplete?.(result);
        return result;
      } catch (err) {
        const errorResult: TeamResult = {
          team: team.stage,
          status: "fail",
          score: 0,
          message: `오류: ${(err as Error).message}`,
          findings: [],
          suggestions: [],
          durationMs: 0,
        };
        callbacks?.onTeamComplete?.(errorResult);
        return errorResult;
      }
    });

    const parallelResults = await Promise.all(parallelPromises);
    for (const r of parallelResults) {
      if (r) results.push(r);
    }
  }

  // Run blocking teams sequentially (validation, release-ip)
  for (const team of blockingTeams) {
    if (callbacks?.signal?.aborted) break;
    callbacks?.onTeamStart?.(team.stage);

    try {
      const result = team.run(ctx);
      results.push(result);
      callbacks?.onTeamComplete?.(result);

      if (result.status === "fail" && team.blocking) {
        blocked = true;
      }
    } catch (err) {
      const errorResult: TeamResult = {
        team: team.stage,
        status: "fail",
        score: 0,
        message: `오류: ${(err as Error).message}`,
        findings: [],
        suggestions: [],
        durationMs: 0,
      };
      results.push(errorResult);
      callbacks?.onTeamComplete?.(errorResult);
    }
  }

  // ── Stage 9: Multi-AI Review (optional, runs when multiple providers available) ──
  if (!callbacks?.signal?.aborted && getAvailableReviewers().length >= 2) {
    const stage: PipelineStage = "multi-ai-review";
    callbacks?.onTeamStart?.(stage);

    try {
      const consensus = await runMultiAIReview(
        ctx.code,
        ctx.fileName,
        ctx.language,
        callbacks?.signal ?? undefined,
      );

      const reviewResult: TeamResult = {
        team: stage,
        status: consensus.consensusStatus,
        score: consensus.consensusScore,
        message: consensus.summary,
        findings: consensus.mergedFindings.map((f) => ({
          severity: f.severity === 'critical' ? 'critical' as const
            : f.severity === 'major' ? 'major' as const
            : f.severity === 'minor' ? 'minor' as const
            : 'info' as const,
          message: `[${f.agreedBy.join(', ')}] ${f.message}`,
          line: f.line,
        })),
        suggestions: [],
        durationMs: consensus.totalTimeMs,
      };

      results.push(reviewResult);
      callbacks?.onTeamComplete?.(reviewResult);
    } catch (err) {
      if (!(err instanceof DOMException && (err as DOMException).name === 'AbortError')) {
        const errorResult: TeamResult = {
          team: stage,
          status: "warn",
          score: 0,
          message: `Multi-AI 리뷰 오류: ${(err as Error).message}`,
          findings: [],
          suggestions: [],
          durationMs: 0,
        };
        results.push(errorResult);
        callbacks?.onTeamComplete?.(errorResult);
      }
    }
  }

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  const hasFail = results.some((r) => r.status === "fail");
  const hasWarn = results.some((r) => r.status === "warn");

  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    overallStatus: hasFail || blocked ? "fail" : hasWarn ? "warn" : "pass",
    overallScore: avgScore,
    stages: results.map(r => ({ ...r, stage: r.team })),
  };
}

// Teams 01, 02 now imported from teams/ directory

// ── Team 4: Size/Density (Smart Beacon) ──

function runSizeDensity(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const beacon = checkBeacon(ctx.code, undefined, ctx.usageIntent);

  return {
    team: "size-density",
    status: beacon.status,
    score: beacon.score,
    message: beacon.message,
    findings: beacon.score < 70
      ? [{ severity: "major" as const, message: beacon.message, rule: "BEACON" }]
      : [],
    suggestions: [],
    durationMs: Math.round(performance.now() - start),
  };
}

// Teams 05, 06 now imported from teams/ directory

export type { PipelineContext, PipelineResult, PipelineCallbacks, TeamResult, PipelineStage };

// ============================================================
// /api/integration/publisher-mock — 출판사 CMS 통합 데모 endpoint.
//
// 시나리오:
//   출판사 CMS 가 작가 원고 수신 → 본 endpoint 호출 → Loreguard 5축 검증 + Reader Sim
//   → 70+ 점수 통과 작품만 편집자 검토 큐로 라우팅
//
// 카테고리 정합 ✓ — 외부(CMS) → Loreguard 호출 방향.
// ============================================================

import { NextResponse } from 'next/server';
import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';
import { runLongArcVerification } from '@/lib/long-arc-verifier/orchestrator';
import { buildEngagementProfile } from '@/lib/reader-sim/engagement-profiler';
import { runRegressionCheck } from '@/lib/reader-sim/regression-runner';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface PublisherSubmissionRequest {
  /** 출판사 내부 manuscript ID — 결과 매핑용 */
  manuscriptId: string;
  /** 작가 ID (선택) */
  authorId?: string;
  episodes: Array<{ episode: number; title?: string; content: string }>;
  synopsis?: string;
  characters?: Array<{ id: string; name: string; role?: string; traits?: string }>;
  /** 출판사가 정한 임계 (default 70) */
  threshold?: number;
}

interface PublisherSubmissionResponse {
  manuscriptId: string;
  decision: 'pass' | 'review' | 'reject';
  /** 종합 점수 */
  overallScore: number;
  /** 5축 점수 */
  axisScores: {
    plotDrift: number;
    characterArc: number;
    worldViolation: number;
    foreshadow: number;
    tension: number;
  };
  /** Reader Sim 결과 */
  readerSimulation: {
    averageEngagement: number;
    finalDropoutRate: number;
    blockPush: boolean;
    failedPersonaCount: number;
  };
  /** 위반 우선순위 — 편집자 검토용 */
  topViolations: Array<{ severity: string; message: string; episodeId?: number }>;
  /** 출판사 routing 추천 */
  recommendation: string;
  evaluatedAt: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status, headers: lspAuthHeaders(authResult) },
    );
  }

  // Body
  let body: PublisherSubmissionRequest;
  try {
    body = (await request.json()) as PublisherSubmissionRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.manuscriptId || !body.episodes || body.episodes.length === 0) {
    return NextResponse.json(
      { error: 'manuscriptId_and_episodes_required' },
      { status: 400 },
    );
  }

  const threshold = body.threshold ?? 70;

  const episodes: EpisodeManuscript[] = body.episodes.map((e) => ({
    episode: e.episode,
    title: e.title ?? `EP${e.episode}`,
    content: e.content,
    charCount: e.content.length,
    lastUpdate: 0,
  }));

  const config: StoryConfig = {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'PublisherMock',
    totalEpisodes: episodes.length,
    synopsis: body.synopsis,
    // 의도적 double-cast: 이 mock 라우트는 length guardrail(min/max) 미사용. PclGuardrails 완화/캐스트 제거 금지 — deref 사이트 TS18048 유발.
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: (body.characters ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role ?? '',
      traits: c.traits ?? '',
      appearance: '',
      dna: 0,
    })),
    platform: 'web',
  } as unknown as StoryConfig;

  // 5축 검증
  const report = await runLongArcVerification(config, episodes, {
    projectId: body.manuscriptId,
  });

  // Reader Sim
  const profile = buildEngagementProfile(episodes);
  const regression = runRegressionCheck(episodes);

  // Decision routing
  let decision: PublisherSubmissionResponse['decision'];
  let recommendation: string;

  if (regression.blockPush || report.overallScore < threshold * 0.7) {
    decision = 'reject';
    recommendation = `Score ${report.overallScore} < ${threshold * 0.7} OR Reader Sim block. Author rework recommended.`;
  } else if (report.overallScore >= threshold) {
    decision = 'pass';
    recommendation = `Score ${report.overallScore} ≥ threshold ${threshold}. Forward to editor queue.`;
  } else {
    decision = 'review';
    recommendation = `Score ${report.overallScore} (threshold ${threshold}). Editor review needed for ${report.totalViolations} violations.`;
  }

  const response: PublisherSubmissionResponse = {
    manuscriptId: body.manuscriptId,
    decision,
    overallScore: report.overallScore,
    axisScores: {
      plotDrift: report.axes.plotDrift.score,
      characterArc: report.axes.characterArc.score,
      worldViolation: report.axes.worldViolation.score,
      foreshadow: report.axes.foreshadow.score,
      tension: report.axes.tension.score,
    },
    readerSimulation: {
      averageEngagement: profile.averageEngagement,
      finalDropoutRate: profile.finalDropoutRate,
      blockPush: regression.blockPush,
      failedPersonaCount: regression.failedPersonas.length,
    },
    topViolations: report.prioritized.slice(0, 5).map((v) => ({
      severity: v.severity,
      message: v.messages.en ?? v.messages.ko,
      episodeId: v.episodeId,
    })),
    recommendation,
    evaluatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'X-RateLimit-Remaining': String(authResult.remaining),
    },
  });
}

/** GET — 사용 가이드 */
export function GET(): NextResponse {
  return NextResponse.json({
    name: 'Loreguard Publisher Integration Mock',
    description:
      'POST 본 endpoint 에 manuscriptId + episodes 전달 시 5축 검증 + Reader Sim 결과 + routing 추천 반환.',
    method: 'POST',
    headers: { Authorization: 'Bearer <LSP_TOKEN>' },
    bodySchema: {
      manuscriptId: 'string (required)',
      authorId: 'string (optional)',
      episodes: 'Array<{ episode: number; title?: string; content: string }>',
      synopsis: 'string (optional)',
      characters: 'Array<{ id, name, role?, traits? }> (optional)',
      threshold: 'number (default 70)',
    },
    decisions: {
      pass: 'score ≥ threshold — forward to editor queue',
      review: 'score in [threshold*0.7, threshold) — editor review needed',
      reject: 'score < threshold*0.7 OR Reader Sim block — rework recommended',
    },
    docs: 'docs/novel-ide/external-integration.md#2-출판사-cms-api-통합',
  });
}

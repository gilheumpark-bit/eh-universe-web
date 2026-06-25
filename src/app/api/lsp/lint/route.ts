// ============================================================
// /api/lsp/lint — POST: 본문 → 7축 채점 + 맥락 이탈 + 떡밥 미회수.
//
// Body: { episodes: [{ episode, content, charCount?, lastUpdate? }], synopsis?, characters? }
// Response: { axisScores, drift, foreshadowMisses, overallScore }
// ============================================================

import { NextResponse } from 'next/server';
import { authorizeLspRequest, lspAuthHeaders } from '@/lib/lsp/auth';
import { runLongArcVerification } from '@/lib/long-arc-verifier/orchestrator';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';

export const runtime = 'nodejs';

interface LintRequest {
  episodes: Array<{
    episode: number;
    title?: string;
    content: string;
    charCount?: number;
    lastUpdate?: number;
  }>;
  synopsis?: string;
  characters?: Array<{ id: string; name: string; role?: string; traits?: string }>;
  projectId?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await authorizeLspRequest(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error, ...(authResult.retryAfterSec ? { retryAfter: authResult.retryAfterSec } : {}) },
      { status: authResult.status, headers: lspAuthHeaders(authResult) },
    );
  }

  // Body
  let body: LintRequest;
  try {
    body = (await request.json()) as LintRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.episodes || !Array.isArray(body.episodes) || body.episodes.length === 0) {
    return NextResponse.json({ error: 'episodes_required' }, { status: 400 });
  }

  // EpisodeManuscript 형식 보정
  const episodes: EpisodeManuscript[] = body.episodes.map((e) => ({
    episode: e.episode,
    title: e.title ?? `EP${e.episode}`,
    content: e.content,
    charCount: e.charCount ?? e.content.length,
    lastUpdate: e.lastUpdate ?? 0,
  }));

  // StoryConfig 최소 형식
  const config: StoryConfig = {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'LSP',
    totalEpisodes: episodes.length,
    synopsis: body.synopsis,
    // 의도적 double-cast: 이 LSP 라우트는 length guardrail(min/max) 미사용. PclGuardrails 완화/캐스트 제거 금지 — deref 사이트 TS18048 유발.
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

  const report = await runLongArcVerification(config, episodes, {
    projectId: body.projectId ?? 'lsp-lint',
  });

  return NextResponse.json(
    {
      overallScore: report.overallScore,
      axisScores: {
        plotDrift: report.axes.plotDrift.score,
        characterArc: report.axes.characterArc.score,
        worldViolation: report.axes.worldViolation.score,
        foreshadow: report.axes.foreshadow.score,
        tension: report.axes.tension.score,
      },
      foreshadowMisses: report.axes.foreshadow.violations.length,
      totalViolations: report.totalViolations,
      summary: report.prioritized.slice(0, 10).map((v) => ({
        kind: v.kind,
        severity: v.severity,
        episodeId: v.episodeId,
        message: v.messages.en ?? v.messages.ko,
      })),
      generatedAt: report.generatedAt,
      manuscriptHash: report.manuscriptHash,
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(authResult.remaining),
        'X-RateLimit-Reset': String(authResult.resetAt),
      },
    },
  );
}

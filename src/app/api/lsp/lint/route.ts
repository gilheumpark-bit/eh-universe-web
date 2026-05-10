// ============================================================
// /api/lsp/lint — POST: 본문 → 7축 채점 + 맥락 이탈 + 떡밥 미회수.
//
// Body: { episodes: [{ episode, content, charCount?, lastUpdate? }], synopsis?, characters? }
// Response: { axisScores, drift, foreshadowMisses, overallScore }
// ============================================================

import { NextResponse } from 'next/server';
import { isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';
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
  // 인증
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 레이트리밋
  const rl = checkRateLimit(token);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
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
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetAt),
      },
    },
  );
}

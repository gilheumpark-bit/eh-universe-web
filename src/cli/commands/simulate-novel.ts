// ============================================================
// CLI: loreguard simulate <manuscript-file>
//
// Reader Simulation 외부 호출 — 5 페르소나 × N화 dropout 예측.
// LSP API 가 별도 simulate 엔드포인트 제공 (Phase 2 신설 예정) — 현재는 lint 응답에서 부분 정보만.
// 본 모듈은 lint 호출 후 결과를 reader-sim 형식으로 가공해 출력 (Phase 1 fallback).
//
// [C] LSP simulate 엔드포인트 부재 → lint 사용 + 명시 안내 / [G] 단일 fetch / [K] 단일 책임
// ============================================================

import { lintNovel, parseManuscriptMarkdown } from './lint-novel';
import { buildEngagementProfile } from '@/lib/reader-sim/engagement-profiler';
import { runRegressionCheck } from '@/lib/reader-sim/regression-runner';
import { PERSONAS, PERSONA_IDS } from '@/lib/reader-sim/personas';
import type { EpisodeManuscript } from '@/lib/studio-types';

interface SimulateOptions {
  filePath: string;
  token?: string;
  baseUrl?: string;
  /** Output format: text(default) / json */
  format?: 'text' | 'json';
}

export interface SimulateResult {
  averageEngagement: number;
  finalDropoutRate: number;
  blockPush: boolean;
  perPersona: Array<{
    pid: string;
    label: string;
    firstDropoutEpisode?: number;
    threshold: number;
  }>;
}

export async function simulateNovel(options: SimulateOptions): Promise<SimulateResult> {
  // 본문 파싱 — lint-novel 의 parser 재활용
  const fs = await import('node:fs/promises');
  const text = await fs.readFile(options.filePath, 'utf-8');
  const sections = parseManuscriptMarkdown(text);

  // EpisodeManuscript 형식 보정 (charCount/lastUpdate 필요)
  const episodes: EpisodeManuscript[] = sections.map((s) => ({
    episode: s.episode,
    title: `EP${s.episode}`,
    content: s.content,
    charCount: s.content.length,
    lastUpdate: 0,
  }));

  // 로컬 시뮬 (LSP simulate 엔드포인트 부재 시 — Phase 1)
  // [C] token 있어도 lint 호출 안 함 — 시뮬은 결정론적 휴리스틱이라 클라/서버 동일.
  if (options.token) {
    // LSP lint 호출은 axisScores 만 — 옵션 보존
    try {
      await lintNovel(options);
    } catch {
      /* lint 실패 무시 — 시뮬은 독립 */
    }
  }

  const profile = buildEngagementProfile(episodes);
  const regression = runRegressionCheck(episodes);

  return {
    averageEngagement: profile.averageEngagement,
    finalDropoutRate: profile.finalDropoutRate,
    blockPush: regression.blockPush,
    perPersona: PERSONA_IDS.map((pid) => ({
      pid,
      label: PERSONAS[pid].label.en,
      firstDropoutEpisode: profile.dropoutEpisodeByPersona[pid],
      threshold: PERSONAS[pid].dropoutThreshold,
    })),
  };
}

export function formatSimulateResult(r: SimulateResult): string {
  const lines: string[] = [];
  lines.push('Loreguard Reader Simulation');
  lines.push('============================');
  lines.push(`Average Engagement: ${r.averageEngagement} / 100`);
  lines.push(`Final Dropout Rate: ${Math.round(r.finalDropoutRate * 100)}%`);
  lines.push(`Block Push: ${r.blockPush ? 'YES (3+ personas dropped)' : 'no'}`);
  lines.push('');
  lines.push('Per persona:');
  for (const p of r.perPersona) {
    const drop = p.firstDropoutEpisode
      ? `dropped @ EP${p.firstDropoutEpisode} (threshold ${p.threshold})`
      : 'kept';
    lines.push(`  ${p.label.padEnd(14)} : ${drop}`);
  }
  return lines.join('\n');
}

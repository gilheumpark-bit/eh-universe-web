// ============================================================
// CLI: loreguard symbols <manuscript-file> [--config <config.json>]
//
// Symbol Index 외부 호출. LSP API 또는 로컬 build.
// config.json 미주입 시 — 본문에서 추론 (휴리스틱).
//
// [C] config 파싱 실패 → 빈 config / [K] LSP 또는 로컬 둘 다 지원
// ============================================================

import { parseManuscriptMarkdown } from './lint-novel';
import { buildSymbolIndex } from '@/lib/symbol-index/builder';
import type { StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import type { SymbolDefinition } from '@/lib/symbol-index/types';

interface SymbolsOptions {
  filePath: string;
  configPath?: string;
  token?: string;
  baseUrl?: string;
  /** Output format: text(default) / json */
  format?: 'text' | 'json';
  /** LSP API 호출 여부 — false 면 로컬 빌드 (default: token 있으면 LSP) */
  useLsp?: boolean;
}

export interface SymbolsResult {
  definitions: SymbolDefinition[];
  byKindCounts: Record<string, number>;
  manuscriptHash: string;
}

export async function symbolsNovel(options: SymbolsOptions): Promise<SymbolsResult> {
  const fs = await import('node:fs/promises');
  const text = await fs.readFile(options.filePath, 'utf-8');
  const sections = parseManuscriptMarkdown(text);

  const episodes: EpisodeManuscript[] = sections.map((s) => ({
    episode: s.episode,
    title: `EP${s.episode}`,
    content: s.content,
    charCount: s.content.length,
    lastUpdate: 0,
  }));

  // config 로드
  let config: Partial<StoryConfig> = {};
  if (options.configPath) {
    try {
      const raw = await fs.readFile(options.configPath, 'utf-8');
      config = JSON.parse(raw) as Partial<StoryConfig>;
    } catch {
      // [C] config 파싱 실패 — 빈 config 로 진행
      config = {};
    }
  }

  // LSP 호출 옵션
  const useLsp = options.useLsp ?? Boolean(options.token);
  if (useLsp && options.token) {
    const baseUrl = options.baseUrl ?? process.env.LOREGUARD_BASE_URL ?? 'http://localhost:3000';
    try {
      const res = await fetch(`${baseUrl}/api/lsp/symbols`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.token}`,
        },
        body: JSON.stringify({ config, episodes }),
      });
      if (res.ok) {
        const data = (await res.json()) as SymbolsResult;
        return data;
      }
    } catch {
      /* fallthrough to local */
    }
  }

  // 로컬 빌드
  const fullConfig: StoryConfig = {
    genre: 'fantasy',
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: 'CLI',
    totalEpisodes: episodes.length,
    guardrails: { language: 'KO' } as unknown as StoryConfig['guardrails'],
    characters: [],
    platform: 'web',
    ...config,
  } as unknown as StoryConfig;

  const index = buildSymbolIndex(fullConfig, episodes);
  return {
    definitions: Array.from(index.definitions.values()),
    byKindCounts: {
      character: index.byKind.character.length,
      place: index.byKind.place.length,
      item: index.byKind.item.length,
      concept: index.byKind.concept.length,
      event: index.byKind.event.length,
    },
    manuscriptHash: index.manuscriptHash,
  };
}

export function formatSymbolsResult(r: SymbolsResult): string {
  const lines: string[] = [];
  lines.push('Loreguard Symbol Index');
  lines.push('======================');
  lines.push(`Total: ${r.definitions.length} symbols`);
  for (const [k, c] of Object.entries(r.byKindCounts)) {
    lines.push(`  ${k.padEnd(10)} : ${c}`);
  }
  lines.push('');
  lines.push('Definitions:');
  for (const d of r.definitions.slice(0, 50)) {
    const aliases = d.aliases.length > 0 ? ` [${d.aliases.join(', ')}]` : '';
    lines.push(`  ${d.kind.padEnd(10)} ${d.name}${aliases}`);
  }
  if (r.definitions.length > 50) {
    lines.push(`  ... (${r.definitions.length - 50} more)`);
  }
  lines.push('');
  lines.push(`Hash: ${r.manuscriptHash}`);
  return lines.join('\n');
}

// ============================================================
// CLI: loreguard lint <manuscript-file>
//
// LSP API 호출 wrapping. manuscript 파일 (markdown) → 5축 점수 출력.
//
// 사용법:
//   npx loreguard lint manuscript.md --token=lg_lsp_xxx --base=https://ehsu.app
//
// [C] 토큰 미주입 → 환경변수 LOREGUARD_LSP_TOKEN fallback
// [G] 단일 fetch / [K] 출력 form 1개 (text)
// ============================================================

interface LintOptions {
  filePath: string;
  token?: string;
  baseUrl?: string;
  /** Output format: text(default) / json */
  format?: 'text' | 'json';
}

interface LintResponse {
  overallScore: number;
  axisScores: {
    plotDrift: number;
    characterArc: number;
    worldViolation: number;
    foreshadow: number;
    tension: number;
  };
  totalViolations: number;
  foreshadowMisses: number;
  summary: Array<{ kind: string; severity: string; episodeId?: number; message: string }>;
}

/** manuscript.md 단순 파싱 — # EP1 / # EP2 형식의 헤더로 episode 분할 */
export function parseManuscriptMarkdown(text: string): Array<{ episode: number; content: string }> {
  const sections: Array<{ episode: number; content: string }> = [];
  // # EP{n} 또는 # Episode {n} 매칭
  const re = /^#\s*(?:EP|Episode|Ep)\s*(\d+)\b[^\n]*$/gm;
  const matches: Array<{ episode: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ episode: Number(m[1]), index: m.index });
  }
  if (matches.length === 0) {
    // fallback — 전체를 EP1
    return [{ episode: 1, content: text.trim() }];
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).replace(/^#[^\n]*\n/, '').trim();
    sections.push({ episode: matches[i].episode, content });
  }
  return sections;
}

/** Lint 호출 */
export async function lintNovel(options: LintOptions): Promise<LintResponse> {
  const token = options.token ?? process.env.LOREGUARD_LSP_TOKEN;
  if (!token) {
    throw new Error('LSP token required (--token or LOREGUARD_LSP_TOKEN)');
  }

  const baseUrl = options.baseUrl ?? process.env.LOREGUARD_BASE_URL ?? 'http://localhost:3000';

  const fs = await import('node:fs/promises');
  const text = await fs.readFile(options.filePath, 'utf-8');
  const episodes = parseManuscriptMarkdown(text);

  const res = await fetch(`${baseUrl}/api/lsp/lint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ episodes }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lint failed: HTTP ${res.status} — ${err}`);
  }
  return (await res.json()) as LintResponse;
}

/** 출력 포맷터 — 사람용 text */
export function formatLintResult(r: LintResponse): string {
  const lines: string[] = [];
  lines.push(`Loreguard LSP Lint`);
  lines.push(`==================`);
  lines.push(`Overall: ${r.overallScore} / 100`);
  lines.push('');
  lines.push(`Plot Drift   : ${r.axisScores.plotDrift}`);
  lines.push(`Character    : ${r.axisScores.characterArc}`);
  lines.push(`World Rules  : ${r.axisScores.worldViolation}`);
  lines.push(`Foreshadow   : ${r.axisScores.foreshadow} (${r.foreshadowMisses} misses)`);
  lines.push(`Tension      : ${r.axisScores.tension}`);
  lines.push('');
  lines.push(`Total violations: ${r.totalViolations}`);
  if (r.summary.length > 0) {
    lines.push('');
    lines.push('Top violations:');
    for (const v of r.summary) {
      const ep = v.episodeId ? ` (EP${v.episodeId})` : '';
      lines.push(`  [${v.severity.toUpperCase()}] ${v.kind}${ep} — ${v.message}`);
    }
  }
  return lines.join('\n');
}

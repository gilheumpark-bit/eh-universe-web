// ============================================================
// CS Quill 🦔 — cs verify command
// ============================================================
// 8팀 병렬 전수검사. 로컬, $0, ~3초.
// 원본 lib/code-studio/pipeline 엔진을 그대로 호출.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ============================================================
// PART 1 — File Discovery
// ============================================================

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.cs', '__tests__']);

interface SourceFile {
  path: string;
  relativePath: string;
  content: string;
  language: string;
}

function discoverFiles(rootPath: string): SourceFile[] {
  const files: SourceFile[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
        const content = readFileSync(fullPath, 'utf-8');
        const ext = extname(entry.name);
        files.push({
          path: fullPath,
          relativePath: relative(rootPath, fullPath),
          content,
          language: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript',
        });
      }
    }
  }

  const stat = statSync(rootPath);
  if (stat.isFile()) {
    const content = readFileSync(rootPath, 'utf-8');
    const ext = extname(rootPath);
    return [{
      path: rootPath,
      relativePath: rootPath,
      content,
      language: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript',
    }];
  }

  walk(rootPath);
  return files;
}

function detectLanguage(ext: string): string {
  return ext === '.ts' || ext === '.tsx' ? 'typescript' : 'javascript';
}

// IDENTITY_SEAL: PART-1 | role=file-discovery | inputs=rootPath | outputs=SourceFile[]

// ============================================================
// PART 2 — Pipeline Runner
// ============================================================

interface VerifyOptions {
  threshold: string;
  format: string;
  watch?: boolean;
  parallel?: boolean;
}

interface TeamResult {
  name: string;
  score: number;
  findings: number;
  blocking: boolean;
  passed: boolean;
  details: Array<{ line: number; message: string; severity: string }>;
}

interface VerifyResult {
  files: number;
  teams: TeamResult[];
  overallScore: number;
  overallStatus: 'pass' | 'warn' | 'fail';
  duration: number;
}

export async function runVerify(path: string, opts: VerifyOptions): Promise<void> {
  const threshold = parseInt(opts.threshold, 10);
  const startTime = performance.now();

  console.log('🦔 CS Quill — 8팀 검증\n');

  // Discover files
  const files = discoverFiles(path);
  if (files.length === 0) {
    console.log('  ⚠️  검증할 파일이 없습니다.');
    return;
  }
  console.log(`  📁 ${files.length}개 파일 발견\n`);

  // Run pipeline on each file — try enhanced (AST) first, fallback to regex
  let useEnhanced = true;
  let enhancedImport: typeof import('../core/ast-bridge') | null = null;
  try {
    enhancedImport = await import('../core/ast-bridge');
  } catch {
    useEnhanced = false;
  }

  const { runStaticPipeline } = await import('@/lib/code-studio/pipeline/pipeline');

  const allTeamScores: Map<string, number[]> = new Map();
  const allTeamFindings: Map<string, number> = new Map();
  let totalFindings = 0;
  let astFindingsTotal = 0;

  for (const file of files) {
    let result;
    if (useEnhanced && enhancedImport) {
      try {
        const enhanced = await enhancedImport.runEnhancedPipeline(file.content, file.language, file.relativePath);
        astFindingsTotal += enhanced.astFindings;
        // Map enhanced findings to pipeline format
        result = {
          stages: [] as Array<{ name: string; score: number; findings: string[] }>,
          overallScore: enhanced.combinedScore,
          overallStatus: enhanced.combinedScore >= 80 ? 'pass' : enhanced.combinedScore >= 60 ? 'warn' : 'fail',
        };
        // Group by team
        const teamMap = new Map<string, { score: number; findings: string[] }>();
        for (const f of enhanced.findings) {
          const team = teamMap.get(f.team) ?? { score: 100, findings: [] };
          team.findings.push(f.message);
          if (f.severity === 'critical') team.score -= 25;
          else if (f.severity === 'error') team.score -= 10;
          else if (f.severity === 'warning') team.score -= 3;
          team.score = Math.max(0, team.score);
          teamMap.set(f.team, team);
        }
        for (const [name, data] of teamMap) {
          result.stages.push({ name, score: data.score, findings: data.findings });
        }
      } catch {
        result = runStaticPipeline(file.content, file.language);
      }
    } else {
      result = runStaticPipeline(file.content, file.language);
    }

    for (const stage of result.stages) {
      const scores = allTeamScores.get(stage.name) ?? [];
      scores.push(stage.score);
      allTeamScores.set(stage.name, scores);

      const findings = allTeamFindings.get(stage.name) ?? 0;
      allTeamFindings.set(stage.name, findings + stage.findings.length);
      totalFindings += stage.findings.length;
    }
  }

  // Aggregate team results
  const BLOCKING_TEAMS = new Set(['validation', 'release-ip']);
  const teams: TeamResult[] = [];

  for (const [name, scores] of allTeamScores) {
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const findings = allTeamFindings.get(name) ?? 0;
    const blocking = BLOCKING_TEAMS.has(name);
    teams.push({
      name,
      score: avgScore,
      findings,
      blocking,
      passed: blocking ? avgScore >= threshold : true,
      details: [],
    });
  }

  // AST summary (already included in enhanced pipeline if available)
  if (useEnhanced && astFindingsTotal > 0) {
    console.log(`\n  🔬 AST 심층분석: ${astFindingsTotal}건 추가 발견 (Level 2 정밀도)`);
  }

  const overallScore = Math.round(teams.reduce((s, t) => s + t.score, 0) / Math.max(teams.length, 1));
  const overallStatus = overallScore >= 80 ? 'pass' as const : overallScore >= 60 ? 'warn' as const : 'fail' as const;
  const duration = Math.round(performance.now() - startTime);

  // Output
  if (opts.format === 'json') {
    console.log(JSON.stringify({ files: files.length, teams, overallScore, overallStatus, duration }, null, 2));
    return;
  }

  // Table format
  const statusIcon = overallStatus === 'pass' ? '✅' : overallStatus === 'warn' ? '⚠️' : '❌';

  for (const team of teams) {
    const icon = team.passed ? '✅' : team.blocking ? '❌' : '⚠️';
    const bar = '█'.repeat(Math.round(team.score / 5)) + '░'.repeat(20 - Math.round(team.score / 5));
    const blockTag = team.blocking ? ' [BLOCKING]' : '';
    console.log(`  ${icon} ${team.name.padEnd(14)} ${bar} ${team.score}/100  (${team.findings}건)${blockTag}`);
  }

  console.log('');
  console.log(`  ─`.repeat(26));
  console.log(`  ${statusIcon} 종합: ${overallScore}/100 | ${files.length}파일 | ${totalFindings}건 | ${duration}ms`);
  console.log(`  기준: ${threshold}점 | 상태: ${overallStatus.toUpperCase()}`);

  if (overallStatus === 'fail') {
    process.exitCode = 1;
  }

  // Watch mode
  if (opts.watch) {
    const { watch } = await import('fs');
    console.log('\n  👀 워치 모드 — 파일 변경 감시 중 (Ctrl+C 종료)\n');
    watch(path, { recursive: true }, async (_, filename) => {
      if (!filename || !SUPPORTED_EXTENSIONS.has(extname(filename))) return;
      console.log(`  [${new Date().toLocaleTimeString()}] ${filename} 변경 감지`);
      await runVerify(path, { ...opts, watch: false });
    });
  }
}

// IDENTITY_SEAL: PART-2 | role=pipeline-runner | inputs=path,opts | outputs=console

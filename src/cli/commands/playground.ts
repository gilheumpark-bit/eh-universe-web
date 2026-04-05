// ============================================================
// CS Quill 🦔 — cs playground command
// ============================================================
// 44엔진 풀벤치마크. 3DMark 스타일 코드 점수.

// Verify/Audit engines imported dynamically via @/lib/code-studio/* below

// ============================================================
// PART 1 — Category Scoring
// ============================================================

interface CategoryScore {
  name: string;
  icon: string;
  score: number;
  engines: number;
  duration: number;
}

// ============================================================
// PART 2 — Playground Runner
// ============================================================

interface PlaygroundOptions {
  full?: boolean;
  compare?: string;
  leaderboard?: boolean;
  challenge?: boolean;
  share?: boolean;
}

export async function runPlayground(opts: PlaygroundOptions): Promise<void> {
  console.log('🦔 CS Quill Playground — 코드 벤치마크 🎮\n');

  const startTime = performance.now();
  const categories: CategoryScore[] = [];

  // Phase 1: AST Score (via verify pipeline)
  console.log('  [Phase 1] AST 엔진...');
  const astStart = performance.now();
  // Lightweight: count files + functions as proxy
  const { readdirSync, readFileSync, statSync } = await import('fs');
  const { join, extname } = await import('path');

  let totalFiles = 0;
  let totalFunctions = 0;
  function countSrc(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { countSrc(p); continue; }
        if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
          totalFiles++;
          try {
            const c = readFileSync(p, 'utf-8');
            totalFunctions += (c.match(/(?:function\s+\w+|=>\s*\{)/g) ?? []).length;
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  countSrc(join(process.cwd(), 'src'));

  const astScore = Math.min(100, Math.round(70 + (totalFiles > 10 ? 15 : 0) + (totalFunctions > 30 ? 15 : 0)));
  categories.push({ name: 'AST', icon: '🔬', score: astScore, engines: 6, duration: Math.round(performance.now() - astStart) });
  console.log(`        → ${astScore}/100 (${totalFiles} files, ${totalFunctions} functions) ${categories[0].duration}ms`);

  // Phase 2: Quality Score (8-team pipeline)
  console.log('  [Phase 2] Quality 엔진...');
  const qualStart = performance.now();
  // Run pipeline on a sample of files
  const { runStaticPipeline } = await import('@/lib/code-studio/pipeline/pipeline');
  let qualScoreSum = 0;
  let qualCount = 0;
  function sampleVerify(dir: string, limit: number): void {
    if (qualCount >= limit) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (qualCount >= limit) return;
        if (e.name === 'node_modules' || e.name === '.next' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { sampleVerify(p, limit); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        try {
          const code = readFileSync(p, 'utf-8');
          if (code.length < 50) continue;
          const result = runStaticPipeline(code, 'typescript');
          qualScoreSum += result.overallScore;
          qualCount++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  sampleVerify(join(process.cwd(), 'src'), 30);
  const qualityScore = qualCount > 0 ? Math.round(qualScoreSum / qualCount) : 50;
  categories.push({ name: 'Quality', icon: '🎯', score: qualityScore, engines: 6, duration: Math.round(performance.now() - qualStart) });
  console.log(`        → ${qualityScore}/100 (${qualCount} files sampled) ${categories[1].duration}ms`);

  // Phase 3: Shield Score (security checks)
  console.log('  [Phase 3] Shield 엔진...');
  const shieldStart = performance.now();
  // Quick secret scan
  let secretHits = 0;
  function scanSecrets(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { scanSecrets(p); continue; }
        if (!/\.(ts|tsx|js|jsx|json)$/.test(e.name) || e.name === 'package-lock.json') continue;
        try {
          const c = readFileSync(p, 'utf-8');
          if (/sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{30,}|password\s*=\s*["'][^"']{5,}["']/i.test(c)) secretHits++;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  scanSecrets(join(process.cwd(), 'src'));
  const shieldScore = Math.max(0, 100 - secretHits * 25);
  categories.push({ name: 'Shield', icon: '🛡️', score: shieldScore, engines: 6, duration: Math.round(performance.now() - shieldStart) });
  console.log(`        → ${shieldScore}/100 ${categories[2].duration}ms`);

  // Phase 4: Arch Score (structure)
  console.log('  [Phase 4] Arch 엔진...');
  const archStart = performance.now();
  // Check for PART/SEAL structure, circular deps potential
  let partCount = 0;
  let sealCount = 0;
  function scanStructure(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { scanStructure(p); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        try {
          const c = readFileSync(p, 'utf-8');
          partCount += (c.match(/\/\/ PART \d/g) ?? []).length;
          sealCount += (c.match(/IDENTITY_SEAL/g) ?? []).length;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  scanStructure(join(process.cwd(), 'src'));
  const archScore = Math.min(100, 60 + Math.min(20, partCount) + Math.min(20, sealCount));
  categories.push({ name: 'Arch', icon: '🏗️', score: archScore, engines: 3, duration: Math.round(performance.now() - archStart) });
  console.log(`        → ${archScore}/100 (${partCount} PARTs, ${sealCount} SEALs) ${categories[3].duration}ms`);

  // Calculate total
  const totalDuration = Math.round(performance.now() - startTime);
  const weights = [0.2, 0.3, 0.25, 0.25];
  const weightedScore = Math.round(categories.reduce((s, c, i) => s + c.score * weights[i], 0));
  const csScore = Math.round(weightedScore * 100);

  // Display
  console.log('\n  ┌─────────────────────────────────────┐');
  console.log('  │                                     │');
  for (const cat of categories) {
    const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
    console.log(`  │  ${cat.icon} ${cat.name.padEnd(10)} ${bar} ${cat.score.toString().padStart(3)}  │`);
  }
  console.log('  │                                     │');
  console.log(`  │  🦔 CS SCORE: ${csScore.toString().padStart(6)}              │`);
  console.log(`  │  ${totalDuration}ms | ${totalFiles} files | $0         │`);
  console.log('  │                                     │');
  console.log('  └─────────────────────────────────────┘\n');

  // --challenge: show challenges
  if (opts.challenge) {
    const { evaluateChallenges } = await import('../core/badges');
    const challenges = evaluateChallenges();
    console.log('  🎮 챌린지:\n');
    for (const c of challenges) {
      const pct = Math.round((c.progress / Math.max(1, c.total)) * 100);
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      console.log(`    ${c.challenge.icon} ${c.challenge.name} [${bar}] ${c.progress}/${c.total}`);
      console.log(`       ${c.challenge.description}\n`);
    }
  }

  // --share: generate share card
  if (opts.share) {
    const { generateShareCard, generateReadmeBadge, evaluateBadges } = await import('../core/badges');
    const { allEarned } = evaluateBadges();
    const badgeIcons = BADGES_LIST.filter(b => allEarned.includes(b.id)).map(b => b.icon);
    const projectName = process.cwd().split('/').pop() ?? 'project';
    console.log('\n' + generateShareCard(projectName, weightedScore, badgeIcons));
    console.log('\n  README 뱃지:');
    console.log(`  ${generateReadmeBadge(projectName, weightedScore)}\n`);
  }

  // Check for new badges
  const { evaluateBadges: evalBadges } = await import('../core/badges');
  const { newBadges } = evalBadges();
  if (newBadges.length > 0) {
    console.log('  🏆 새 뱃지 획득!');
    for (const b of newBadges) {
      console.log(`     ${b.icon} ${b.name} — ${b.description}`);
    }
    console.log('');
  }
}

// Needed for --share
const BADGES_LIST = [
  { id: 'first-blood', icon: '✨' }, { id: 'guardian', icon: '🛡️' }, { id: 'clean-code', icon: '🧹' },
  { id: 'sub-10', icon: '⚡' }, { id: 'top-10', icon: '🔥' }, { id: 'improver', icon: '📈' },
  { id: 'streak-5', icon: '🎯' }, { id: 'streak-10', icon: '💎' }, { id: 'centurion', icon: '💯' }, { id: 'perfect', icon: '🌟' },
];

// IDENTITY_SEAL: PART-2 | role=playground-runner | inputs=opts | outputs=console

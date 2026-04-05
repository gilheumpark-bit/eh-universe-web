// ============================================================
// CS Quill 🦔 — cs generate command
// ============================================================
// Plan → SEAL 계약 → 병렬 생성 → Merge → 8팀 검증 → 자동수정 → 영수증
// 대화 기반이 아닌 계약 기반 병렬 생성.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

import {
  PLANNER_SYSTEM_PROMPT, buildPlannerPrompt, parsePlanResult, buildExecutionWaves,
  type SealContract, type PlanResult,
} from '../ai/planner';
import { TEAM_LEAD_SYSTEM_PROMPT, buildTeamLeadPrompt, parseVerdict } from '../ai/team-lead';
import { CROSS_JUDGE_SYSTEM_PROMPT, buildJudgePrompt, parseJudgeResult } from '../ai/cross-judge';
import { createLoopGuard } from '../core/loop-guard';
import { computeReceiptHash, chainReceipt, formatReceipt, type ReceiptData } from '../formatters/receipt';

// ============================================================
// PART 1 — Types & Options
// ============================================================

interface GenerateOptions {
  mode: 'fast' | 'full' | 'strict';
  structure: 'auto' | 'on' | 'off';
  withTests?: boolean;
  commit?: boolean;
  pr?: boolean;
  dryRun?: boolean;
  noTui?: boolean;
}

interface GeneratedPart {
  part: number;
  code: string;
  contract: SealContract;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=GenerateOptions,GeneratedPart

// ============================================================
// PART 2 — SEAL Header Generator
// ============================================================

function generateSealHeader(contract: SealContract): string {
  return [
    `// ============================================================`,
    `// PART ${contract.part} — ${contract.role}`,
    `// ============================================================`,
  ].join('\n');
}

function generateSealFooter(contract: SealContract): string {
  const inputs = contract.inputs.length > 0 ? contract.inputs.join(',') : 'none';
  const outputs = contract.outputs.length > 0 ? contract.outputs.join(',') : 'none';
  return `// IDENTITY_SEAL: PART-${contract.part} | role=${contract.role} | inputs=${inputs} | outputs=${outputs}`;
}

function shouldUseParts(totalLines: number, structure: string): boolean {
  if (structure === 'on') return true;
  if (structure === 'off') return false;
  return totalLines >= 100;
}

// IDENTITY_SEAL: PART-2 | role=seal-header | inputs=SealContract | outputs=string

// ============================================================
// PART 3 — Code Merger
// ============================================================

function mergeGeneratedParts(parts: GeneratedPart[], structure: string): string {
  const totalLines = parts.reduce((sum, p) => sum + p.code.split('\n').length, 0);
  const useParts = shouldUseParts(totalLines, structure);

  if (!useParts) {
    // Flat mode: just concatenate without headers
    return parts.map(p => p.code).join('\n\n');
  }

  // PART mode: add SEAL headers and footers
  const sections: string[] = [];
  for (const part of parts.sort((a, b) => a.part - b.part)) {
    sections.push(generateSealHeader(part.contract));
    sections.push('');
    sections.push(part.code);
    sections.push('');
    sections.push(generateSealFooter(part.contract));
  }

  return sections.join('\n');
}

// Deduplicate imports across parts
function deduplicateImports(code: string): string {
  const lines = code.split('\n');
  const imports = new Set<string>();
  const nonImports: string[] = [];

  for (const line of lines) {
    if (line.startsWith('import ')) {
      imports.add(line);
    } else {
      nonImports.push(line);
    }
  }

  if (imports.size === 0) return code;
  return [...imports].sort().join('\n') + '\n\n' + nonImports.join('\n');
}

// IDENTITY_SEAL: PART-3 | role=code-merger | inputs=GeneratedPart[] | outputs=string

// ============================================================
// PART 4 — Main Generate Flow
// ============================================================

export async function runGenerate(prompt: string, opts: GenerateOptions): Promise<void> {
  console.log('🦔 CS Quill — 코드 생성\n');

  // Read project context
  const pkgPath = join(process.cwd(), 'package.json');
  const context = existsSync(pkgPath) ? readFileSync(pkgPath, 'utf-8').slice(0, 2000) : undefined;

  // ── Step 1: Plan ──
  console.log('  [1/6] 📐 계획 수립 (SEAL 계약 생성)...');

  const planPrompt = buildPlannerPrompt(prompt, context);

  // Dynamic import to avoid loading AI at startup
  const { streamChat } = await import('@/lib/ai-providers');

  let planRaw = '';
  await streamChat({
    systemInstruction: PLANNER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: planPrompt }],
    onChunk: (t: string) => { planRaw += t; },
  });

  const plan = parsePlanResult(planRaw);
  if (!plan) {
    console.log('  ❌ 계획 생성 실패. 다시 시도하세요.');
    return;
  }

  console.log(`        → ${plan.totalParts} PART 분해 완료`);
  for (const c of plan.contracts) {
    const deps = c.dependencies.length > 0 ? ` (→ PART ${c.dependencies.join(',')})` : ' (독립)';
    console.log(`        PART ${c.part}: ${c.role}${deps}`);
  }

  // Dry-run: show plan and exit
  if (opts.dryRun) {
    const totalLines = plan.contracts.reduce((s, c) => s + c.estimatedLines, 0);
    console.log(`\n  📊 예상: ~${totalLines}줄, ${plan.totalParts}회 API, 구조: ${opts.structure}`);
    console.log('  (--dry-run: 실행하지 않음)');
    return;
  }

  // ── Step 2: Parallel Generate ──
  const waves = buildExecutionWaves(plan.contracts);
  console.log(`\n  [2/6] ⚡ 병렬 생성 (${waves.length} wave)...`);

  const generated: GeneratedPart[] = [];
  const contractMap = new Map(plan.contracts.map(c => [c.part, c]));

  for (let wi = 0; wi < waves.length; wi++) {
    const wave = waves[wi];
    console.log(`        Wave ${wi + 1}: PART ${wave.join(', ')} (동시 ${wave.length}개)`);

    const waveResults = await Promise.all(
      wave.map(async (partNum) => {
        const contract = contractMap.get(partNum);
        if (!contract) return null;

        // Build generation prompt with SEAL contract
        const depsContext = contract.dependencies
          .map(d => generated.find(g => g.part === d)?.code ?? '')
          .filter(Boolean)
          .map((c, i) => `[PART ${contract.dependencies[i]} output]:\n${c.slice(0, 500)}`)
          .join('\n\n');

        const genPrompt = [
          `Generate PART ${contract.part}: ${contract.role}`,
          `Inputs: ${contract.inputs.join(', ') || 'none'}`,
          `Outputs: ${contract.outputs.join(', ') || 'none'}`,
          depsContext ? `\nDependency context:\n${depsContext}` : '',
          `\nNaming: ${plan.namingConvention}`,
          plan.framework ? `Framework: ${plan.framework}` : '',
          '\nOutput ONLY the code. No explanation.',
        ].filter(Boolean).join('\n');

        let code = '';
        await streamChat({
          systemInstruction: 'You are a code generator. Follow the SEAL contract exactly. Output only code.',
          messages: [{ role: 'user', content: genPrompt }],
          onChunk: (t: string) => { code += t; },
        });

        // Strip markdown fences
        code = code.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();

        return { part: partNum, code, contract } as GeneratedPart;
      }),
    );

    for (const r of waveResults) {
      if (r) generated.push(r);
    }
  }

  // ── Step 3: Merge ──
  console.log('\n  [3/6] 🔗 Merge (import 통합 + PART 조립)...');
  let mergedCode = mergeGeneratedParts(generated, opts.structure);
  mergedCode = deduplicateImports(mergedCode);
  console.log(`        → ${mergedCode.split('\n').length}줄 완성`);

  // ── Step 4: Verify (8-team pipeline) ──
  console.log('\n  [4/6] 🔍 8팀 검증...');
  const { runStaticPipeline } = await import('@/lib/code-studio/pipeline/pipeline');
  const pipelineResult = runStaticPipeline(mergedCode, 'typescript');

  for (const stage of pipelineResult.stages) {
    const icon = stage.score >= 80 ? '✅' : stage.score >= 60 ? '⚠️' : '❌';
    console.log(`        ${icon} ${stage.name.padEnd(14)} ${stage.score}/100`);
  }
  console.log(`        종합: ${pipelineResult.overallScore}/100 (${pipelineResult.overallStatus})`);

  // ── Step 5: Auto-fix loop ──
  const guard = createLoopGuard({ passThreshold: opts.mode === 'strict' ? 85 : 77 });
  let finalCode = mergedCode;

  if (pipelineResult.overallStatus !== 'pass' && opts.mode !== 'fast') {
    console.log('\n  [5/6] 🔧 자동수정 루프...');

    const { runVerificationLoop } = await import('@/lib/code-studio/pipeline/verification-loop');

    try {
      const verifyResult = await runVerificationLoop(
        mergedCode,
        'typescript',
        'generated.ts',
        [],
        {
          maxIterations: opts.mode === 'strict' ? 3 : 2,
          passThreshold: opts.mode === 'strict' ? 85 : 77,
          enableStress: false,
          enableChaos: false,
          enableIP: true,
          safeFixCategories: ['unused-import', 'console-remove', 'missing-semicolon', 'formatting', 'null-guard', 'type-import'],
        },
      );

      finalCode = verifyResult.finalCode;
      console.log(`        → ${verifyResult.totalFixesApplied}건 수정, ${verifyResult.stopReason}`);
      console.log(`        → 최종 점수: ${verifyResult.finalScore}/100`);
    } catch {
      console.log('        → 자동수정 스킵 (검증 루프 미지원 컨텍스트)');
    }
  } else {
    console.log('\n  [5/6] 🔧 자동수정 — 불필요 ✅');
  }

  // ── Step 6: Save + Receipt ──
  console.log('\n  [6/6] 💾 저장 + 영수증 발급...');

  const csDir = join(process.cwd(), '.cs', 'generated');
  mkdirSync(csDir, { recursive: true });

  const fileName = prompt.replace(/[^a-zA-Z0-9가-힣]/g, '-').slice(0, 40) + '.ts';
  const filePath = join(csDir, fileName);
  writeFileSync(filePath, finalCode, 'utf-8');
  console.log(`        → ${filePath}`);

  // Receipt
  const codeHash = createHash('sha256').update(finalCode).digest('hex');
  const receiptData: Omit<ReceiptData, 'receiptHash'> = {
    id: `cs-${Date.now().toString(36)}`,
    timestamp: Date.now(),
    codeHash,
    pipeline: {
      teams: pipelineResult.stages.map(s => ({
        name: s.name,
        score: s.score,
        blocking: s.name === 'validation' || s.name === 'release-ip',
        findings: s.findings.length,
        passed: s.score >= 77,
      })),
      overallScore: pipelineResult.overallScore,
      overallStatus: pipelineResult.overallStatus as 'pass' | 'warn' | 'fail',
    },
    verification: {
      rounds: guard.state.round || 1,
      fixesApplied: 0,
      stopReason: guard.state.stopReason ?? 'passed',
    },
  };

  const receiptHash = computeReceiptHash(receiptData);
  const receipt: ReceiptData = { ...receiptData, receiptHash };
  chainReceipt(receipt);

  // Save receipt
  const receiptDir = join(process.cwd(), '.cs', 'receipts');
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(join(receiptDir, `${receipt.id}.json`), JSON.stringify(receipt, null, 2));

  console.log('\n' + formatReceipt(receipt, 'ko'));

  // Git commit
  if (opts.commit) {
    const { execSync } = await import('child_process');
    try {
      execSync(`git add "${filePath}"`, { stdio: 'pipe' });
      execSync(`git commit -m "feat(cs): ${prompt.slice(0, 50)}"`, { stdio: 'pipe' });
      console.log('\n  📝 커밋 완료');
    } catch {
      console.log('\n  ⚠️  커밋 실패 (변경사항 없음?)');
    }
  }

  console.log('\n  🦔 완료!\n');
}

// IDENTITY_SEAL: PART-4 | role=main-generate | inputs=prompt,opts | outputs=file+receipt

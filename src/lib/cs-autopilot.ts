// ============================================================
// Full Autopilot — Single-prompt-to-verified-app pipeline
// 9-phase automated code generation, review, and verification
// ============================================================

import { streamChat } from '@/lib/ai-providers';
import { executeParallel, type AIRole } from '@/lib/role-router';
import { runMultiAIReview, getAvailableReviewers } from '@/lib/pipeline/multi-ai-review';
import { quickStressTest } from '@/lib/stress-test';
import { runChaosAnalysis } from '@/lib/chaos-engineering';
import { runBuildScanFix } from '@/lib/build-scan-fix';
import { runPipeline } from '@/lib/pipeline/index';
import { generateCommitMessage } from '@/lib/commit-message';
import type { FileNode } from '@/lib/types';
import type { PipelineContext } from '@/lib/pipeline/types';
import type { StreamOptions } from '@/lib/ai-providers';

// ── Phase types ──

export type AutopilotPhase =
  | 'planning'
  | 'coding'
  | 'reviewing'
  | 'testing'
  | 'security'
  | 'chaos'
  | 'fixing'
  | 'documenting'
  | 'committing'
  | 'complete'
  | 'error';

export interface AutopilotProgress {
  phase: AutopilotPhase;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  phaseProgress: number;
  overallProgress: number;
  currentAction: string;
  elapsedMs: number;
  logs: AutopilotLog[];
  phaseTiming?: Record<string, number>;   // phase name → duration in ms
  costEstimate?: CostEstimate;
}

export interface AutopilotLog {
  timestamp: number;
  phase: AutopilotPhase;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface AutopilotConfig {
  enableReview: boolean;
  enableStressTest: boolean;
  enableChaos: boolean;
  enableAutoFix: boolean;
  enableDocs: boolean;
  passThreshold: number;
  maxFixIterations: number;
  retryFailedPhases: boolean;       // retry a failed phase once before error
}

// ── Cost Estimation ──

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUSD: number;
  breakdown: Array<{ phase: string; costUSD: number }>;
}

/** Estimate total API cost before starting based on file count and model prices */
export function estimateAutopilotCost(
  fileCount: number,
  avgLinesPerFile: number,
  config?: Partial<AutopilotConfig>,
): CostEstimate {
  const cfg = { ...getDefaultConfig(), ...config };
  // Rough token estimates: ~4 chars per token, ~40 chars per line
  const tokensPerFile = avgLinesPerFile * 10; // ~10 tokens per line
  const inputBase = fileCount * tokensPerFile;

  const breakdown: CostEstimate['breakdown'] = [];
  let totalInput = 0;
  let totalOutput = 0;

  // Planning phase: reads all files, outputs plan
  const planInput = inputBase + 500;
  const planOutput = 800;
  totalInput += planInput; totalOutput += planOutput;
  breakdown.push({ phase: 'planning', costUSD: (planInput * 3 + planOutput * 15) / 1_000_000 });

  // Coding phase: per-file generation
  const codeInput = inputBase + fileCount * 300;
  const codeOutput = fileCount * tokensPerFile * 1.5;
  totalInput += codeInput; totalOutput += codeOutput;
  breakdown.push({ phase: 'coding', costUSD: (codeInput * 3 + codeOutput * 15) / 1_000_000 });

  // Review phase
  if (cfg.enableReview) {
    const revInput = fileCount * tokensPerFile * 3; // 3 reviewers
    const revOutput = 1500;
    totalInput += revInput; totalOutput += revOutput;
    breakdown.push({ phase: 'reviewing', costUSD: (revInput * 3 + revOutput * 15) / 1_000_000 });
  }

  // Stress test
  if (cfg.enableStressTest) {
    const stInput = 2000; const stOutput = 3000;
    totalInput += stInput; totalOutput += stOutput;
    breakdown.push({ phase: 'testing', costUSD: (stInput * 3 + stOutput * 15) / 1_000_000 });
  }

  // Security pipeline
  const secInput = inputBase; const secOutput = 2000;
  totalInput += secInput; totalOutput += secOutput;
  breakdown.push({ phase: 'security', costUSD: (secInput * 3 + secOutput * 15) / 1_000_000 });

  // Chaos
  if (cfg.enableChaos) {
    const chInput = 1500; const chOutput = 2500;
    totalInput += chInput; totalOutput += chOutput;
    breakdown.push({ phase: 'chaos', costUSD: (chInput * 3 + chOutput * 15) / 1_000_000 });
  }

  // Docs
  if (cfg.enableDocs) {
    const docInput = inputBase; const docOutput = 2000;
    totalInput += docInput; totalOutput += docOutput;
    breakdown.push({ phase: 'documenting', costUSD: (docInput * 3 + docOutput * 15) / 1_000_000 });
  }

  const estimatedCostUSD = Math.round(((totalInput * 3 + totalOutput * 15) / 1_000_000) * 10000) / 10000;

  return {
    estimatedInputTokens: Math.round(totalInput),
    estimatedOutputTokens: Math.round(totalOutput),
    estimatedCostUSD,
    breakdown,
  };
}

// ── Cancellation State (save/resume) ──

const AUTOPILOT_STATE_KEY = 'csl_autopilot_saved_state';

export interface AutopilotSavedState {
  prompt: string;
  completedPhases: AutopilotPhase[];
  partialFiles: Array<{ path: string; content: string; isNew: boolean }>;
  scores: { pipeline: number; review?: number; stress?: number; chaos?: number };
  savedAt: number;
}

export function saveAutopilotState(state: AutopilotSavedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTOPILOT_STATE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function loadAutopilotState(): AutopilotSavedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTOPILOT_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAutopilotState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTOPILOT_STATE_KEY);
}

export interface AutopilotResult {
  success: boolean;
  files: Array<{ path: string; content: string; isNew: boolean }>;
  pipelineScore: number;
  reviewConsensus?: {
    score: number;
    status: string;
    agreement: number;
  };
  stressTestScore?: number;
  chaosResilience?: number;
  commitMessage?: string;
  documentation?: string;
  totalTimeMs: number;
  iterations: number;
  logs: AutopilotLog[];
  summary: string;
  phaseTiming?: Record<string, number>;  // phase name → duration ms
  costEstimate?: CostEstimate;
  partialResult?: boolean;               // true if result is from a mid-failure recovery
}

// ── Phase metadata ──

const PHASE_LABELS: Record<AutopilotPhase, string> = {
  planning: 'AI Director 분해',
  coding: '멀티 에이전트 코딩',
  reviewing: '5사 AI 합의 리뷰',
  testing: '스트레스 테스트 + 퍼징',
  security: 'NOA + 보안 감사',
  chaos: '카오스 엔지니어링',
  fixing: '자동 수정 (BSF 루프)',
  documenting: '문서화',
  committing: '커밋 메시지 생성',
  complete: '완료',
  error: '오류',
};

const PHASE_ORDER: AutopilotPhase[] = [
  'planning', 'coding', 'reviewing', 'testing',
  'security', 'chaos', 'fixing', 'documenting', 'committing',
];

// ── Default config ──

export function getDefaultConfig(): AutopilotConfig {
  return {
    enableReview: true,
    enableStressTest: true,
    enableChaos: true,
    enableAutoFix: true,
    enableDocs: true,
    passThreshold: 77,
    maxFixIterations: 3,
    retryFailedPhases: true,
  };
}

// ── Helpers ──

function collectFileContents(files: FileNode[]): string {
  const parts: string[] = [];
  function walk(nodes: FileNode[], prefix: string) {
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file' && node.content) {
        parts.push(`--- ${path} ---\n${node.content}`);
      }
      if (node.children) walk(node.children, path);
    }
  }
  walk(files, '');
  return parts.join('\n\n');
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp',
    c: 'c', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    css: 'css', html: 'html', json: 'json', md: 'markdown',
  };
  return map[ext] ?? 'typescript';
}

function extractFunctionNames(code: string): string[] {
  const names: string[] = [];
  // JS/TS function declarations & exports
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
    /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\w*\s*=>/g,
  ];
  for (const pat of patterns) {
    let match;
    while ((match = pat.exec(code)) !== null) {
      if (match[1] && !names.includes(match[1])) {
        names.push(match[1]);
      }
    }
  }
  return names;
}

interface ParsedFile {
  path: string;
  content: string;
}

function parseFilesFromResponse(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  // Match patterns like: ### path/to/file.ts followed by a code block
  const fileBlockRe = /###?\s+(?:`?([^`\n]+)`?)\s*\n```[\w]*\n([\s\S]*?)```/g;
  let match;
  while ((match = fileBlockRe.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].trimEnd();
    if (path && content) {
      files.push({ path, content });
    }
  }

  // Fallback: single code block with no file header
  if (files.length === 0) {
    const singleBlock = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (singleBlock) {
      files.push({ path: 'generated.ts', content: singleBlock[1].trimEnd() });
    }
  }

  return files;
}

function buildDiff(files: ParsedFile[], existingFiles: FileNode[]): string {
  const existingMap = new Map<string, string>();
  function walk(nodes: FileNode[], prefix: string) {
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file' && node.content != null) {
        existingMap.set(path, node.content);
      }
      if (node.children) walk(node.children, path);
    }
  }
  walk(existingFiles, '');

  const parts: string[] = [];
  for (const f of files) {
    const existing = existingMap.get(f.path);
    if (existing) {
      parts.push(`--- a/${f.path}\n+++ b/${f.path}\n@@ modified @@\n${f.content.slice(0, 2000)}`);
    } else {
      parts.push(`--- /dev/null\n+++ b/${f.path}\n@@ new file @@\n${f.content.slice(0, 2000)}`);
    }
  }
  return parts.join('\n\n');
}

// ── Main autopilot runner ──

export async function runAutopilot(
  prompt: string,
  files: FileNode[],
  config?: Partial<AutopilotConfig>,
  signal?: AbortSignal,
  onProgress?: (progress: AutopilotProgress) => void,
): Promise<AutopilotResult> {
  const cfg: AutopilotConfig = { ...getDefaultConfig(), ...config };
  const startTime = performance.now();
  const logs: AutopilotLog[] = [];
  let currentPhaseIndex = 0;

  // Track scores
  let pipelineScore = 0;
  let reviewScore: number | undefined;
  let reviewStatus: string | undefined;
  let reviewAgreement: number | undefined;
  let stressTestScore: number | undefined;
  let chaosResilience: number | undefined;
  let commitMessage: string | undefined;
  let documentation: string | undefined;
  let fixIterations = 0;

  const generatedFiles: Array<{ path: string; content: string; isNew: boolean }> = [];
  const phaseTiming: Record<string, number> = {};
  let phaseStartTime = performance.now();
  const completedPhases: AutopilotPhase[] = [];

  // Collect existing file contents for context
  const _existingCode = collectFileContents(files);
  const existingMap = new Map<string, string>();
  function walkFiles(nodes: FileNode[], prefix: string) {
    for (const node of nodes) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.type === 'file' && node.content != null) {
        existingMap.set(path, node.content);
      }
      if (node.children) walkFiles(node.children, path);
    }
  }
  walkFiles(files, '');

  // Cost estimate for progress reporting
  const costEstimate = estimateAutopilotCost(
    Array.from(existingMap?.keys?.() ?? []).length || 1,
    100,
    config,
  );

  function addLog(phase: AutopilotPhase, level: AutopilotLog['level'], message: string) {
    const entry: AutopilotLog = {
      timestamp: Date.now(),
      phase,
      level,
      message,
    };
    logs.push(entry);
  }

  function startPhaseTimer() {
    phaseStartTime = performance.now();
  }

  function endPhaseTimer(phase: AutopilotPhase) {
    phaseTiming[phase] = Math.round(performance.now() - phaseStartTime);
    completedPhases.push(phase);
  }

  function emitProgress(phase: AutopilotPhase, phaseProgress: number, currentAction: string) {
    currentPhaseIndex = PHASE_ORDER.indexOf(phase);
    if (currentPhaseIndex === -1) currentPhaseIndex = PHASE_ORDER.length;

    const overallProgress = Math.round(
      ((currentPhaseIndex + phaseProgress / 100) / PHASE_ORDER.length) * 100,
    );

    onProgress?.({
      phase,
      phaseLabel: PHASE_LABELS[phase],
      phaseIndex: currentPhaseIndex,
      totalPhases: PHASE_ORDER.length,
      phaseProgress,
      overallProgress: Math.min(100, overallProgress),
      currentAction,
      elapsedMs: Math.round(performance.now() - startTime),
      logs: [...logs],
      phaseTiming: { ...phaseTiming },
      costEstimate,
    });
  }

  /** Retry a phase function once on failure if retryFailedPhases is enabled */
  async function withRetry<T>(phase: AutopilotPhase, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      if (!cfg.retryFailedPhases) throw err;
      addLog(phase, 'warning', `Phase "${phase}" failed, retrying once: ${(err as Error).message}`);
      return await fn();
    }
  }

  function checkAbort() {
    if (signal?.aborted) {
      throw new DOMException('Autopilot aborted', 'AbortError');
    }
  }

  try {
    // ================================================================
    // Phase 1: Planning
    // ================================================================
    startPhaseTimer();
    emitProgress('planning', 0, 'AI Director가 작업을 분해합니다...');
    addLog('planning', 'info', '작업 분해 시작');

    let planningResponse = '';
    await withRetry('planning', () => streamChat({
      systemInstruction:
        '당신은 소프트웨어 아키텍트입니다. 사용자 요구사항을 분석하여 구현 계획을 세우세요.\n' +
        '각 태스크를 JSON 배열로 출력하세요. 각 항목:\n' +
        '{"task": "<설명>", "file": "<파일 경로>", "type": "create" | "modify", "role": "coder" | "tester" | "documenter"}\n' +
        '기존 파일 목록:\n' + Array.from(existingMap.keys()).join('\n'),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      signal,
      onChunk: (text) => { planningResponse += text; },
    }));
    checkAbort();
    endPhaseTimer('planning');

    // Parse tasks from planning response
    interface PlanTask {
      task: string;
      file: string;
      type: 'create' | 'modify';
      role: AIRole;
    }

    let tasks: PlanTask[] = [];
    try {
      const arrMatch = planningResponse.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        const raw = JSON.parse(arrMatch[0]) as Array<Record<string, unknown>>;
        tasks = raw.map((t) => ({
          task: String(t.task ?? ''),
          file: String(t.file ?? 'generated.ts'),
          type: (t.type === 'modify' ? 'modify' : 'create') as 'create' | 'modify',
          role: (['coder', 'tester', 'documenter'].includes(String(t.role ?? ''))
            ? String(t.role) as AIRole
            : 'coder') as AIRole,
        }));
      }
    } catch {
      // Fallback: single task
      tasks = [{ task: prompt, file: 'generated.ts', type: 'create', role: 'coder' }];
    }

    if (tasks.length === 0) {
      tasks = [{ task: prompt, file: 'generated.ts', type: 'create', role: 'coder' }];
    }

    addLog('planning', 'success', `작업 분해: ${tasks.length}개 태스크 생성`);
    emitProgress('planning', 100, `${tasks.length}개 태스크 계획 완료`);

    // ================================================================
    // Phase 2: Coding
    // ================================================================
    checkAbort();
    startPhaseTimer();
    emitProgress('coding', 0, '멀티 에이전트 코딩 시작...');
    addLog('coding', 'info', '코딩 시작');

    // Build parallel tasks
    const codingTasks: Array<{ role: AIRole; opts: StreamOptions }> = tasks.map((t) => {
      const existingContent = existingMap.get(t.file) ?? '';
      const context = existingContent
        ? `기존 파일(${t.file}):\n\`\`\`\n${existingContent.slice(0, 3000)}\n\`\`\`\n\n`
        : '';

      return {
        role: t.role,
        opts: {
          systemInstruction:
            '전체 파일 내용을 코드 블록으로 출력하세요. 파일 경로를 ### 헤더로 표시하세요.\n' +
            `작업할 파일: ${t.file}\n`,
          messages: [{
            role: 'user' as const,
            content: `${context}요구사항: ${t.task}\n\n전체 프로젝트 요구사항: ${prompt}`,
          }],
          temperature: 0.3,
          signal,
          onChunk: () => {},
        },
      };
    });

    const codingResults = await executeParallel(
      codingTasks,
      (completed, total) => {
        emitProgress('coding', Math.round((completed / total) * 100), `코딩: ${completed}/${total} 완료`);
      },
    );
    checkAbort();

    // Assemble files from all coding results
    for (const [, result] of codingResults) {
      const parsed = parseFilesFromResponse(result);
      for (const pf of parsed) {
        const isNew = !existingMap.has(pf.path);
        generatedFiles.push({ path: pf.path, content: pf.content, isNew });
      }
    }

    // Also try to match files by task file names if parseFilesFromResponse missed them
    for (const t of tasks) {
      if (!generatedFiles.some((f) => f.path === t.file)) {
        const result = codingResults.get(t.role);
        if (result) {
          const codeMatch = result.match(/```[\w]*\n([\s\S]*?)```/);
          if (codeMatch) {
            generatedFiles.push({
              path: t.file,
              content: codeMatch[1].trimEnd(),
              isNew: !existingMap.has(t.file),
            });
          }
        }
      }
    }

    endPhaseTimer('coding');
    addLog('coding', 'success', `코딩 완료: ${generatedFiles.length}개 파일 생성/수정`);
    emitProgress('coding', 100, `${generatedFiles.length}개 파일 준비 완료`);

    // Build combined code for subsequent analysis phases
    const allCode = generatedFiles.map((f) => `// --- ${f.path} ---\n${f.content}`).join('\n\n');
    const primaryFile = generatedFiles[0]?.path ?? 'generated.ts';
    const primaryLang = detectLanguage(primaryFile);

    // ================================================================
    // Phase 3: Reviewing
    // ================================================================
    checkAbort();
    startPhaseTimer();
    if (cfg.enableReview && getAvailableReviewers().length >= 2) {
      emitProgress('reviewing', 0, '다중 AI 리뷰 시작...');
      addLog('reviewing', 'info', '합의 리뷰 시작');

      const consensus = await runMultiAIReview(
        allCode,
        primaryFile,
        primaryLang,
        signal,
        (reviewer, result) => {
          addLog('reviewing', 'info', `${reviewer}: ${result.score}점 (${result.status})`);
        },
      );
      checkAbort();

      reviewScore = consensus.consensusScore;
      reviewStatus = consensus.consensusStatus;
      reviewAgreement = consensus.agreement;

      addLog(
        'reviewing',
        consensus.consensusStatus === 'fail' ? 'warning' : 'success',
        `리뷰 합의: ${consensus.consensusScore}점 (${consensus.reviews.length}사 참여)`,
      );
      emitProgress('reviewing', 100, `리뷰 완료: ${consensus.consensusScore}점`);
    } else {
      addLog('reviewing', 'info', '리뷰 건너뜀 (비활성화 또는 제공자 부족)');
      emitProgress('reviewing', 100, '리뷰 건너뜀');
    }
    endPhaseTimer('reviewing');

    // ================================================================
    // Phase 4: Testing (Stress test)
    // ================================================================
    checkAbort();
    startPhaseTimer();
    if (cfg.enableStressTest) {
      emitProgress('testing', 0, '스트레스 테스트 준비...');
      addLog('testing', 'info', '스트레스 테스트 시작');

      // Detect functions in generated code and test the first few
      const funcs = extractFunctionNames(allCode);
      const testTargets = funcs.slice(0, 3); // Limit to 3 functions to keep time reasonable

      if (testTargets.length > 0) {
        let totalPassed = 0;
        let totalTests = 0;

        for (const fn of testTargets) {
          checkAbort();
          try {
            const report = await quickStressTest(
              allCode,
              fn,
              primaryLang,
              signal,
              (completed, total) => {
                const fnProgress = Math.round((completed / total) * 100);
                emitProgress('testing', fnProgress, `테스트 중: ${fn} (${completed}/${total})`);
              },
            );
            totalPassed += report.passed;
            totalTests += report.totalTests;
            addLog('testing', 'info', `${fn}: ${report.passed}/${report.totalTests} 통과 (${report.score}점)`);
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') throw err;
            addLog('testing', 'warning', `${fn} 테스트 실패: ${(err as Error).message}`);
          }
        }

        stressTestScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : undefined;
        addLog('testing', 'success', `스트레스 테스트: ${totalPassed}/${totalTests} 통과`);
      } else {
        addLog('testing', 'info', '테스트 가능한 함수 없음');
      }

      emitProgress('testing', 100, '스트레스 테스트 완료');
    } else {
      addLog('testing', 'info', '스트레스 테스트 건너뜀');
      emitProgress('testing', 100, '스트레스 테스트 건너뜀');
    }
    endPhaseTimer('testing');

    // ================================================================
    // Phase 5: Security (8-team pipeline)
    // ================================================================
    checkAbort();
    startPhaseTimer();
    emitProgress('security', 0, '보안 파이프라인 실행...');
    addLog('security', 'info', '보안 파이프라인 시작');

    try {
      const pipelineCtx: PipelineContext = {
        code: allCode,
        language: primaryLang,
        fileName: primaryFile,
        intent: prompt.slice(0, 200),
        usageIntent: 'default',
      };

      const pipelineResult = await runPipeline(pipelineCtx, { signal });
      pipelineScore = pipelineResult.overallScore;

      for (const stage of pipelineResult.stages) {
        addLog('security', 'info', `${stage.team}: ${stage.score}점 (${stage.status})`);
      }

      addLog(
        'security',
        pipelineResult.overallStatus === 'fail' ? 'warning' : 'success',
        `보안 파이프라인: ${pipelineScore}점`,
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      addLog('security', 'error', `파이프라인 오류: ${(err as Error).message}`);
    }

    endPhaseTimer('security');
    emitProgress('security', 100, `보안 파이프라인 완료: ${pipelineScore}점`);

    // ================================================================
    // Phase 6: Chaos Engineering
    // ================================================================
    checkAbort();
    startPhaseTimer();
    if (cfg.enableChaos) {
      emitProgress('chaos', 0, '카오스 분석 시작...');
      addLog('chaos', 'info', '카오스 분석 시작');

      try {
        const chaosReport = await runChaosAnalysis(
          allCode,
          primaryFile,
          primaryLang,
          undefined,
          signal,
          (completed, total, scenario) => {
            emitProgress('chaos', Math.round((completed / total) * 100), `카오스: ${scenario}`);
          },
        );

        chaosResilience = chaosReport.overallResilience;
        addLog('chaos', 'success', `카오스 분석: 복원력 ${chaosReport.overallResilience}점 (등급 ${chaosReport.grade})`);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        addLog('chaos', 'error', `카오스 분석 오류: ${(err as Error).message}`);
      }

      emitProgress('chaos', 100, '카오스 분석 완료');
    } else {
      addLog('chaos', 'info', '카오스 분석 건너뜀');
      emitProgress('chaos', 100, '카오스 분석 건너뜀');
    }
    endPhaseTimer('chaos');

    // ================================================================
    // Phase 7: Auto-fix (BSF loop)
    // ================================================================
    checkAbort();
    const needsFix = cfg.enableAutoFix && (
      pipelineScore < cfg.passThreshold ||
      (reviewScore != null && reviewScore < cfg.passThreshold) ||
      (stressTestScore != null && stressTestScore < cfg.passThreshold)
    );

    startPhaseTimer();
    if (needsFix) {
      emitProgress('fixing', 0, '자동 수정 시작...');
      const startFixScore = pipelineScore;
      addLog('fixing', 'info', `자동 수정 시작 (현재 점수: ${pipelineScore}점)`);

      try {
        const bsfResult = await runBuildScanFix(
          allCode,
          primaryFile,
          primaryLang,
          cfg.maxFixIterations,
          cfg.passThreshold,
          signal,
          (iteration) => {
            const progress = Math.round((iteration.iteration / cfg.maxFixIterations) * 100);
            emitProgress('fixing', progress, `BSF 반복 ${iteration.iteration}: ${iteration.scanResults.pipelineScore}점`);
            addLog('fixing', 'info', `반복 ${iteration.iteration}: ${iteration.fixesApplied.length}건 수정, ${iteration.scanResults.pipelineScore}점`);
          },
        );

        fixIterations = bsfResult.totalIterations;
        pipelineScore = bsfResult.endScore;

        // Update generated files with fixed code from BSF
        if (bsfResult.endScore > startFixScore && generatedFiles.length > 0 && bsfResult.fixedCode) {
          const targetFile = generatedFiles[0];
          targetFile.content = bsfResult.fixedCode;
          addLog('fixing', 'success', `파일 "${targetFile.path}"에 수정된 코드 반영 (${bsfResult.fixesApplied.length}건 수정)`);
        } else if (bsfResult.fixesApplied.length > 0) {
          addLog('fixing', 'warning', `수정 ${bsfResult.fixesApplied.length}건 시도했으나 파일 반영 실패`);
        }

        addLog(
          'fixing',
          'success',
          `자동 수정: ${bsfResult.totalIterations}회 반복, ${startFixScore}점 -> ${bsfResult.endScore}점`,
        );

        // Re-run review after fix if score improved enough
        if (cfg.enableReview && bsfResult.endScore > startFixScore && getAvailableReviewers().length >= 2) {
          addLog('fixing', 'info', '수정 후 재리뷰 실행...');
          try {
            const reReview = await runMultiAIReview(allCode, primaryFile, primaryLang, signal);
            reviewScore = reReview.consensusScore;
            reviewStatus = reReview.consensusStatus;
            reviewAgreement = reReview.agreement;
            addLog('fixing', 'info', `재리뷰 결과: ${reReview.consensusScore}점`);
          } catch {
            // Non-critical; skip re-review
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        addLog('fixing', 'error', `자동 수정 오류: ${(err as Error).message}`);
      }

      emitProgress('fixing', 100, '자동 수정 완료');
    } else {
      addLog('fixing', 'info', '자동 수정 불필요 (기준 통과)');
      emitProgress('fixing', 100, '자동 수정 건너뜀');
    }
    endPhaseTimer('fixing');

    // ================================================================
    // Phase 8: Documentation
    // ================================================================
    checkAbort();
    startPhaseTimer();
    if (cfg.enableDocs) {
      emitProgress('documenting', 0, '문서화 시작...');
      addLog('documenting', 'info', '문서화 시작');

      try {
        let docResponse = '';
        await streamChat({
          systemInstruction:
            '당신은 기술 문서 작성 전문가입니다. 주어진 코드에 대한 간결한 문서를 작성하세요.\n' +
            '포함할 내용:\n' +
            '- 프로젝트 요약\n' +
            '- 주요 파일 설명\n' +
            '- API 사용법\n' +
            '- 주요 함수/컴포넌트 설명\n' +
            '한국어로 작성하세요.',
          messages: [{
            role: 'user',
            content: `다음 코드에 대한 문서를 생성하세요.\n\n요구사항: ${prompt}\n\n코드:\n${allCode.slice(0, 8000)}`,
          }],
          temperature: 0.3,
          signal,
          onChunk: (text) => { docResponse += text; },
        });

        documentation = docResponse;
        addLog('documenting', 'success', '문서화 완료');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        addLog('documenting', 'error', `문서화 오류: ${(err as Error).message}`);
      }

      emitProgress('documenting', 100, '문서화 완료');
    } else {
      addLog('documenting', 'info', '문서화 건너뜀');
      emitProgress('documenting', 100, '문서화 건너뜀');
    }
    endPhaseTimer('documenting');

    // ================================================================
    // Phase 9: Commit message
    // ================================================================
    checkAbort();
    startPhaseTimer();
    emitProgress('committing', 0, '커밋 메시지 생성...');
    addLog('committing', 'info', '커밋 메시지 생성 시작');

    try {
      const diff = buildDiff(
        generatedFiles.map((f) => ({ path: f.path, content: f.content })),
        files,
      );
      commitMessage = await generateCommitMessage(diff, primaryLang, signal);
      addLog('committing', 'success', '커밋 메시지 생성 완료');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      commitMessage = `feat: autopilot generated code for "${prompt.slice(0, 50)}"`;
      addLog('committing', 'warning', '커밋 메시지 생성 실패, 기본 메시지 사용');
    }

    endPhaseTimer('committing');
    emitProgress('committing', 100, '커밋 메시지 생성 완료');

    // ================================================================
    // Complete
    // ================================================================
    const totalTimeMs = Math.round(performance.now() - startTime);
    const success = pipelineScore >= cfg.passThreshold;

    // Build summary
    const summaryParts: string[] = [
      `Full Autopilot 완료 (${Math.round(totalTimeMs / 1000)}초)`,
      `파일: ${generatedFiles.length}개 ${success ? '생성' : '생성 (기준 미달)'}`,
      `파이프라인: ${pipelineScore}점`,
    ];
    if (reviewScore != null) summaryParts.push(`리뷰: ${reviewScore}점`);
    if (stressTestScore != null) summaryParts.push(`스트레스: ${stressTestScore}점`);
    if (chaosResilience != null) summaryParts.push(`카오스: ${chaosResilience}점`);
    if (fixIterations > 0) summaryParts.push(`자동 수정: ${fixIterations}회`);

    addLog('complete', success ? 'success' : 'warning', summaryParts.join(' | '));

    emitProgress('complete', 100, success ? '모든 검증 통과!' : '일부 기준 미달');

    return {
      success,
      files: generatedFiles,
      pipelineScore,
      reviewConsensus: reviewScore != null
        ? { score: reviewScore, status: reviewStatus ?? 'unknown', agreement: reviewAgreement ?? 0 }
        : undefined,
      stressTestScore,
      chaosResilience,
      commitMessage,
      documentation,
      totalTimeMs,
      iterations: fixIterations,
      logs,
      summary: summaryParts.join('\n'),
      phaseTiming: { ...phaseTiming },
      costEstimate,
    };

    // Clear saved state on successful completion
    clearAutopilotState();
  } catch (err) {
    const totalTimeMs = Math.round(performance.now() - startTime);

    // Save state for resumption on cancel/error — partial results are preserved
    const savedState: AutopilotSavedState = {
      prompt,
      completedPhases,
      partialFiles: generatedFiles,
      scores: { pipeline: pipelineScore, review: reviewScore, stress: stressTestScore, chaos: chaosResilience },
      savedAt: Date.now(),
    };
    saveAutopilotState(savedState);

    if (err instanceof DOMException && err.name === 'AbortError') {
      addLog('error', 'warning', '사용자에 의해 중단됨 — 현재 상태 저장됨 (재개 가능)');
      emitProgress('error', 0, '중단됨 — 상태 저장됨');

      return {
        success: false,
        files: generatedFiles,
        pipelineScore,
        reviewConsensus: reviewScore != null
          ? { score: reviewScore, status: reviewStatus ?? 'unknown', agreement: reviewAgreement ?? 0 }
          : undefined,
        stressTestScore,
        chaosResilience,
        commitMessage,
        documentation,
        totalTimeMs,
        iterations: fixIterations,
        logs,
        summary: '사용자에 의해 중단됨 — 상태 저장됨',
        phaseTiming: { ...phaseTiming },
        costEstimate,
        partialResult: generatedFiles.length > 0,
      };
    }

    addLog('error', 'error', `오류 발생: ${(err as Error).message} — 부분 결과 저장됨`);
    emitProgress('error', 0, `오류: ${(err as Error).message}`);

    return {
      success: false,
      files: generatedFiles,
      pipelineScore,
      stressTestScore,
      chaosResilience,
      totalTimeMs,
      iterations: fixIterations,
      logs,
      summary: `오류 발생: ${(err as Error).message}`,
      phaseTiming: { ...phaseTiming },
      costEstimate,
      partialResult: generatedFiles.length > 0,
    };
  }
}

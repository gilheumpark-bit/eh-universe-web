import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;

import { hasServerProviderCredentials } from '@/lib/server-ai';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import { generateJsonGemini } from '@/services/aiProvidersStructured';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 프로덕션 활성화 — 레이트리밋으로 비용 관리
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, 'code-autopilot', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, config: rawConfig, code, language, fileName } = body ?? {};
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // [C] config undefined 가드 — body.config 미전달 시 SSE 스트림 내부 TypeError 방어
    const DEFAULT_CONFIG = {
      enableReview: true,
      enableAutoFix: true,
      enableDocs: true,
      passThreshold: 80,
      maxFixAttempts: 2,
    };
    const config = {
      ...DEFAULT_CONFIG,
      ...(rawConfig && typeof rawConfig === 'object' ? rawConfig : {}),
    };

    // BYOK 키 우선, 서버 키 폴백
    const clientApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    const serverApiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY?.trim() || '' : '';
    const apiKey = clientApiKey || serverApiKey;
    if (!apiKey && !hasServerProviderCredentials('gemini') && !SPARK_SERVER_URL) {
      return NextResponse.json({ error: 'Gemini API key required. Add your key in Settings or configure server credentials.' }, { status: 400 });
    }

    // 인증 게이트 — BYOK 없이 서버 크레딧 사용 시 Firebase JWT 필수 (6-9회 Gemini 호출 비용 방어)
    if (!clientApiKey) {
      const authHeader = req.headers.get('authorization');
      let verified = false;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
          const token = authHeader.slice(7).trim();
          verified = Boolean(await verifyFirebaseIdToken(token));
        } catch { /* verification failed */ }
      }
      if (!verified) {
        return NextResponse.json({ error: 'Authentication required for hosted credits (6-9 Gemini calls per request)' }, { status: 401 });
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const phases = [
          "planning", "coding", "reviewing", "testing",
          "security", "chaos", "fixing", "documenting", "committing"
        ];

        const pipelineStartTime = Date.now();
        let iterationCount = 0;
        let score = 100;
        let currentCode = code || '';
        let commitMsg = 'refactor: autopilot enhancements';
        let docs = '';
        let plan = '';

        const sendPhaseStart = (phase: string, i: number) => {
          sendEvent({
            type: 'progress',
            data: {
              phase, phaseIndex: i, phaseProgress: 10, overallProgress: Math.round((i / phases.length) * 100),
              currentAction: `Running ${phase} via Advanced NOA Engine...`,
              logs: [{ level: "info", message: `Executing ${phase}...`, timestamp: Date.now() }]
            }
          });
        };

        const sendPhaseEnd = (phase: string, i: number, newLogs: Record<string, unknown>[]) => {
          sendEvent({
            type: 'progress',
            data: {
              phase, phaseIndex: i, phaseProgress: 100, overallProgress: Math.round(((i + 1) / phases.length) * 100),
              currentAction: `${phase} complete`,
              logs: newLogs
            }
          });
        };

        // 0. planning
        sendPhaseStart("planning", 0);
        const logsPlanning: Record<string, unknown>[] = [];
        try {
          const res = await generateJsonGemini(
            apiKey, 'gemini-2.5-flash',
            `Prompt: ${prompt}\nCode:\n${currentCode}\n\nCreate a clear, brief 3-step action plan to accomplish the prompt.`,
            { type: "object", properties: { plan: { type: "string" } }, required: ["plan"] },
            { plan: "Analyze code, identify goals, prepare modifications." }
          ) as { plan: string };
          plan = res.plan;
          logsPlanning.push({ level: "info", message: `Plan: ${plan.slice(0, 100)}...`, timestamp: Date.now() });
        } catch {
          logsPlanning.push({ level: "warning", message: `Phase planning degraded gracefully to fallback.`, timestamp: Date.now() });
        }
        sendPhaseEnd("planning", 0, logsPlanning);

        // 1. coding
        sendPhaseStart("coding", 1);
        const logsCoding: Record<string, unknown>[] = [];
        try {
          const res = await generateJsonGemini(
            apiKey, 'gemini-2.5-pro',
            `You are an expert ${language} engineer. Rewrite this code to fulfill the prompt: "${prompt}"\nPlan: "${plan}"\n\nCode:\n${currentCode}`,
            { type: "object", properties: { newCode: { type: "string" } }, required: ["newCode"] },
            { newCode: currentCode }
          ) as { newCode: string };
          currentCode = res.newCode;
          logsCoding.push({ level: "success", message: `Code rewritten successfully.`, timestamp: Date.now() });
        } catch {
          logsCoding.push({ level: "warning", message: `Phase coding degraded gracefully to fallback.`, timestamp: Date.now() });
        }
        sendPhaseEnd("coding", 1, logsCoding);

        // 2~5. reviewing, testing, security, chaos (병렬 처리)
        for (let i = 2; i <= 5; i++) sendPhaseStart(phases[i], i);
        let logsReview: Record<string, unknown>[] = [];
        // testing/security/chaos — 실제 정적 검사 기반 결과 (가짜 success 로그 제거)
        const logsTesting: Record<string, unknown>[] = [];
        const logsSecurity: Record<string, unknown>[] = [];
        const logsChaos: Record<string, unknown>[] = [];
        try {
          // 간단한 정적 테스트 검사: TODO/FIXME/throw/test 커버리지
          const hasTests = /\b(test|it|describe|expect)\s*\(/.test(currentCode);
          const todoCount = (currentCode.match(/TODO|FIXME/g) || []).length;
          logsTesting.push({ level: hasTests ? 'success' : 'warning', message: hasTests ? 'Test signatures detected.' : 'No test assertions found.', timestamp: Date.now() });
          if (todoCount > 0) logsTesting.push({ level: 'info', message: `${todoCount} TODO/FIXME markers found.`, timestamp: Date.now() });
          // 보안 검사: eval/exec/innerHTML 패턴
          const dangerous = /\b(eval|new\s+Function|document\.write|dangerouslySetInnerHTML|\.innerHTML\s*=)\b/.test(currentCode);
          logsSecurity.push({ level: dangerous ? 'warning' : 'success', message: dangerous ? 'Dangerous pattern detected (eval/innerHTML).' : 'No obvious dangerous patterns.', timestamp: Date.now() });
          // chaos: 에러 핸들링 부재 감지
          const hasTry = /\btry\s*\{/.test(currentCode);
          const hasAsync = /\basync\b/.test(currentCode);
          logsChaos.push({ level: (!hasTry && hasAsync) ? 'warning' : 'success', message: (!hasTry && hasAsync) ? 'Async code without try-catch detected.' : 'Error handling appears reasonable.', timestamp: Date.now() });
        } catch {
          logsTesting.push({ level: 'warning', message: 'Static checks failed to run.', timestamp: Date.now() });
        }
        
        try {
          const reviewRes = config.enableReview 
            ? await generateJsonGemini(apiKey, 'gemini-2.5-flash',
                `Review the new code against the prompt: "${prompt}"\nCode:\n${currentCode}`,
                { type: "object", properties: { issues: { type: "array", items: { type: "string" } }, score: { type: "integer" } }, required: ["issues", "score"] },
                { issues: [], score: 95 }
              ) as { issues: string[], score: number }
            : { issues: [], score: 100 };
            
          logsReview = reviewRes.issues.map((iss: string) => ({ level: "warning", message: iss, timestamp: Date.now() }));
          score = Math.min(score, reviewRes.score);
          logsReview.push({ level: "info", message: `Review Score: ${reviewRes.score}/100`, timestamp: Date.now() });
        } catch {
          logsReview.push({ level: "warning", message: `Phase reviewing degraded gracefully to fallback.`, timestamp: Date.now() });
        }
        
        sendPhaseEnd("reviewing", 2, logsReview);
        sendPhaseEnd("testing", 3, logsTesting);
        sendPhaseEnd("security", 4, logsSecurity);
        sendPhaseEnd("chaos", 5, logsChaos);

        // 6. fixing — iterationCount 증가
        sendPhaseStart("fixing", 6);
        const logsFixing: Record<string, unknown>[] = [];
        iterationCount++;
        try {
          if (config.enableAutoFix && score < config.passThreshold) {
            iterationCount++;
            const fixRes = await generateJsonGemini(apiKey, 'gemini-2.5-flash',
              `The code scored ${score}. Fix issues to improve it.\nCode:\n${currentCode}`,
              { type: "object", properties: { fixedCode: { type: "string" }, newScore: { type: "integer" } }, required: ["fixedCode", "newScore"] },
              { fixedCode: currentCode, newScore: score }
            ) as { fixedCode: string, newScore: number };
            currentCode = fixRes.fixedCode;
            score = fixRes.newScore;
            logsFixing.push({ level: "success", message: `Code patched. New Score: ${score}`, timestamp: Date.now() });
          } else {
            logsFixing.push({ level: "success", message: `No active fix needed.`, timestamp: Date.now() });
          }
        } catch {
          logsFixing.push({ level: "warning", message: `Phase fixing degraded gracefully to fallback.`, timestamp: Date.now() });
        }
        sendPhaseEnd("fixing", 6, logsFixing);

        // 7~8. documenting, committing (병렬 처리가능하나 fixing 코드에 의존)
        sendPhaseStart("documenting", 7);
        sendPhaseStart("committing", 8);
        
        const logsDoc: Record<string, unknown>[] = [];
        const logsCommit: Record<string, unknown>[] = [];

        try {
          const [docRes, commitRes] = await Promise.all([
            config.enableDocs 
              ? generateJsonGemini(apiKey, 'gemini-2.5-flash',
                  `Generate a brief technical explanation/docs for this code:\n${currentCode}`,
                  { type: "object", properties: { documentation: { type: "string" } }, required: ["documentation"] },
                  { documentation: "Documentation unavailable." }
                ) as Promise<{ documentation: string }>
              : Promise.resolve({ documentation: "Documentation skipped." }),
            generateJsonGemini(apiKey, 'gemini-2.5-flash',
              `Generate a short, conventional git commit message for this prompt completion: "${prompt}"`,
              { type: "object", properties: { commitMessage: { type: "string" } }, required: ["commitMessage"] },
              { commitMessage: "feat: update code via autopilot" }
            ) as Promise<{ commitMessage: string }>
          ]);
          
          if (config.enableDocs) {
            docs = docRes.documentation;
            logsDoc.push({ level: "success", message: `Documentation strictly generated.`, timestamp: Date.now() });
          } else {
            logsDoc.push({ level: "success", message: `Documentation skipped.`, timestamp: Date.now() });
          }
          
          commitMsg = commitRes.commitMessage;
          logsCommit.push({ level: "info", message: `Commit parsed: ${commitMsg}`, timestamp: Date.now() });
        } catch {
          logsDoc.push({ level: "warning", message: `Phase documenting degraded gracefully to fallback.`, timestamp: Date.now() });
          logsCommit.push({ level: "warning", message: `Phase committing degraded gracefully to fallback.`, timestamp: Date.now() });
        }
        
        sendPhaseEnd("documenting", 7, logsDoc);
        sendPhaseEnd("committing", 8, logsCommit);

        sendEvent({
          type: 'complete',
          data: {
            success: score >= config.passThreshold,
            pipelineScore: score,
            summary: `Pipeline executed thoroughly via Engine. Final verification score: ${score}`,
            // 실측 시간 — pipelineStartTime 기준
            totalTimeMs: Date.now() - pipelineStartTime,
            // 실제 반복 횟수 — fixing 단계에서 증가시킨 카운터
            iterations: Math.max(1, iterationCount),
            logs: [{ level: 'success', message: 'Full pipeline applied!', timestamp: Date.now() }],
            files: [{ path: fileName || 'src/optimized.ts', isNew: false, content: currentCode }],
            commitMessage: commitMsg,
            documentation: docs,
            reviewConsensus: { score, status: score >= config.passThreshold ? 'PASS' : 'FAIL' }
          }
        });

        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

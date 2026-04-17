"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Rocket, Play, Square, CheckCircle, AlertTriangle, XCircle,
  Loader2, ChevronDown, ChevronRight, Clock, Clipboard,
  Settings, RotateCcw, Shield, Zap, Bug, Wrench, BookOpen,
  GitCommit, BrainCircuit, Eye, FlaskConical, RefreshCw,
} from "lucide-react";
import { runGenVerifyFixLoop } from "@/lib/code-studio/pipeline/gen-verify-fix-loop";
import type { GenVerifyFixResult, GenVerifyFixIteration } from "@/lib/code-studio/pipeline/gen-verify-fix-loop";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export interface AutopilotConfig {
  enableReview: boolean;
  enableStressTest: boolean;
  enableChaos: boolean;
  enableAutoFix: boolean;
  enableDocs: boolean;
  passThreshold: number;
  maxFixIterations: number;
}

export type AutopilotPhase =
  | "planning" | "coding" | "reviewing" | "testing"
  | "security" | "chaos" | "fixing" | "documenting" | "committing";

export interface AutopilotLog {
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: number;
}

export interface AutopilotProgress {
  phase: AutopilotPhase | "complete" | "error";
  phaseIndex: number;
  phaseProgress: number;
  overallProgress: number;
  currentAction: string;
  elapsedMs: number;
  logs: AutopilotLog[];
}

export interface AutopilotResult {
  success: boolean;
  pipelineScore: number;
  summary: string;
  totalTimeMs: number;
  iterations: number;
  logs: AutopilotLog[];
  files: Array<{ path: string; isNew: boolean; content?: string }>;
  commitMessage?: string;
  documentation?: string;
  reviewConsensus?: { score: number; status: string };
  stressTestScore?: number;
  chaosResilience?: number;
}

interface Props {
  code: string;
  language: string;
  fileName: string;
  onComplete: (result: AutopilotResult) => void;
  onClose: () => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=AutopilotProgress,AutopilotResult

// ============================================================
// PART 2 — Phase Metadata & Helpers
// ============================================================

const PHASE_META: Record<string, { ko: string; en: string; ja: string; zh: string; icon: React.ReactNode; color: string }> = {
  planning:    { ko: "디렉터",   en: "Director",   ja: "ディレクター", zh: "指挥",   icon: <BrainCircuit size={14} />, color: "#58a6ff" },
  coding:      { ko: "코딩",     en: "Coding",     ja: "コーディング", zh: "编码",   icon: <Zap size={14} />,          color: "#3fb950" },
  reviewing:   { ko: "리뷰",     en: "Review",     ja: "レビュー",     zh: "审查",   icon: <Eye size={14} />,          color: "#d29922" },
  testing:     { ko: "테스트",   en: "Testing",    ja: "テスト",       zh: "测试",   icon: <FlaskConical size={14} />, color: "#bc8cff" },
  security:    { ko: "보안",     en: "Security",   ja: "セキュリティ", zh: "安全",   icon: <Shield size={14} />,       color: "#f85149" },
  chaos:       { ko: "카오스",   en: "Chaos",      ja: "カオス",       zh: "混沌",   icon: <Bug size={14} />,          color: "#f85149" },
  fixing:      { ko: "수정",     en: "Fixing",     ja: "修正",         zh: "修复",   icon: <Wrench size={14} />,       color: "#58a6ff" },
  documenting: { ko: "문서화",   en: "Docs",       ja: "ドキュメント", zh: "文档",   icon: <BookOpen size={14} />,     color: "#3fb950" },
  committing:  { ko: "커밋",     en: "Commit",     ja: "コミット",     zh: "提交",   icon: <GitCommit size={14} />,    color: "#bc8cff" },
};

const PHASE_ORDER: AutopilotPhase[] = [
  "planning", "coding", "reviewing", "testing",
  "security", "chaos", "fixing", "documenting", "committing",
];

function logLevelColor(level: AutopilotLog["level"]): string {
  switch (level) {
    case "success": return "#3fb950";
    case "warning": return "#d29922";
    case "error":   return "#f85149";
    default:        return "#8b949e";
  }
}

function logLevelIcon(level: AutopilotLog["level"]) {
  switch (level) {
    case "success": return <CheckCircle size={10} />;
    case "warning": return <AlertTriangle size={10} />;
    case "error":   return <XCircle size={10} />;
    default:        return null;
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function getDefaultConfig(): AutopilotConfig {
  return {
    enableReview: true, enableStressTest: true, enableChaos: false,
    enableAutoFix: true, enableDocs: true, passThreshold: 77, maxFixIterations: 3,
  };
}

// IDENTITY_SEAL: PART-2 | role=Metadata | inputs=none | outputs=PHASE_META

// ============================================================
// PART 3 — Sub-Components
// ============================================================

function ConfigToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[10px] text-[#8b949e] cursor-pointer select-none">
      <div className={`w-6 h-3.5 rounded-full relative transition-colors cursor-pointer ${checked ? "bg-blue-500" : "bg-[#30363d]"}`}
        onClick={() => onChange(!checked)}>
        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${checked ? "translate-x-3" : "translate-x-0.5"}`} />
      </div>
      <span>{label}</span>
    </label>
  );
}

function ScoreCard({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = score >= 85 ? "#3fb950" : score >= 77 ? "#d29922" : "#f85149";
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#010409] border border-[#30363d]">
      <div className="flex items-center gap-1 text-[9px] text-[#8b949e]">{icon}{label}</div>
      <span className="text-sm font-bold font-mono" style={{ color }}>{score}</span>
      <div className="w-full h-1 bg-[#21262d] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color]" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=SubComponents | inputs=props | outputs=JSX

// ============================================================
// PART 4 — Main Component
// ============================================================

export type AutopilotMode = "autopilot" | "gen-verify-fix";

export function AutopilotPanel({ code, language, fileName, onComplete, onClose }: Props) {
  const { lang } = useLang();
  const [prompt, setPrompt] = useState("");
  const [config, setConfig] = useState<AutopilotConfig>(getDefaultConfig());
  const [showConfig, setShowConfig] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<AutopilotProgress | null>(null);
  const [result, setResult] = useState<AutopilotResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState(false);
  const [mode, setMode] = useState<AutopilotMode>("autopilot");
  const [gvfResult, setGvfResult] = useState<GenVerifyFixResult | null>(null);
  const [_gvfIterations, setGvfIterations] = useState<GenVerifyFixIteration[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [progress?.logs]);

  const abortRef = useRef<AbortController | null>(null);

  const handleStart = useCallback(async () => {
    if (!prompt.trim() || running) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setResult(null);
    setProgress(null);

    let allLogs: AutopilotLog[] = [];

    try {
      const resp = await fetch('/api/code/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, config, code, language, fileName, apiKey: (await import('@/lib/ai-providers').then(m => m.getApiKey('gemini'))) || undefined }),
        signal: ac.signal,
      });

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          // Note: chunks might contain multiple events
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');
          for (const block of lines) {
            const line = block.trim();
            if (line.startsWith('data: ')) {
              try {
                const payload = JSON.parse(line.substring(6));
                if (payload.type === 'progress') {
                  const newLogs = payload.data.logs || [];
                  allLogs = [...allLogs, ...newLogs];
                  setProgress({ ...payload.data, logs: allLogs });
                } else if (payload.type === 'complete') {
                  setResult(payload.data);
                  setRunning(false);
                  onComplete(payload.data);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch {
      setRunning(false);
    }
  }, [prompt, running, config, code, language, fileName, onComplete]);

  const handleReset = useCallback(() => { setResult(null); setProgress(null); setPrompt(""); setGvfResult(null); setGvfIterations([]); }, []);

  const handleCopyReport = useCallback(() => {
    if (!result) return;
    const report = [`# Autopilot Report`, `Score: ${result.pipelineScore}`, result.summary,
      ...result.logs.map((l) => `[${l.level}] ${l.message}`)].join("\n");
    navigator.clipboard.writeText(report).catch(() => {});
  }, [result]);

  const handleStartGVF = useCallback(async () => {
    if (!prompt.trim() || running) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setResult(null);
    setGvfResult(null);
    setGvfIterations([]);
    setProgress(null);

    const allLogs: AutopilotLog[] = [];
    const startTime = Date.now();

    const pushLog = (level: AutopilotLog["level"], message: string) => {
      allLogs.push({ level, message, timestamp: Date.now() });
      setProgress({
        phase: "coding",
        phaseIndex: 1,
        phaseProgress: 0,
        overallProgress: Math.min(95, Math.round((allLogs.length / 20) * 100)),
        currentAction: message,
        elapsedMs: Date.now() - startTime,
        logs: [...allLogs],
      });
    };

    try {
      pushLog("info", L4(lang, { ko: "생성+검증+수정 루프 시작", en: "Starting gen+verify+fix loop", ja: "生成+検証+修正ループ開始", zh: "生成+验证+修复循环开始"}));

      const gvf = await runGenVerifyFixLoop(prompt, {
        maxRounds: config.maxFixIterations,
        targetScore: config.passThreshold,
        language,
        signal: ac.signal,
        onProgress: (iter) => {
          setGvfIterations((prev) => [...prev, iter]);
          pushLog(
            iter.score >= config.passThreshold ? "success" : "warning",
            L4(lang, {
              ko: `라운드 ${iter.round}: 점수 ${iter.score}, 발견 ${iter.findings}, 수정 ${iter.fixes}`,
              en: `Round ${iter.round}: score ${iter.score}, findings ${iter.findings}, fixes ${iter.fixes}`, ja: `ラウンド${iter.round}: スコア${iter.score}, 発見${iter.findings}, 修正${iter.fixes}`, zh: `轮次${iter.round}: 分数${iter.score}, 发现${iter.findings}, 修复${iter.fixes}`}),
          );
        },
      });

      setGvfResult(gvf);

      const elapsed = Date.now() - startTime;
      pushLog(
        gvf.finalScore >= config.passThreshold ? "success" : "warning",
        L4(lang, {
          ko: `완료: 최종 점수 ${gvf.finalScore}, ${gvf.iterations.length}회 반복, 사유: ${gvf.verificationReport.stopReason}`,
          en: `Done: final score ${gvf.finalScore}, ${gvf.iterations.length} rounds, reason: ${gvf.verificationReport.stopReason}`, ja: `完了: 最終スコア${gvf.finalScore}, ${gvf.iterations.length}回反復, 理由: ${gvf.verificationReport.stopReason}`, zh: `完成: 最终分数${gvf.finalScore}, ${gvf.iterations.length}轮迭代, 原因: ${gvf.verificationReport.stopReason}`}),
      );

      const autopilotResult: AutopilotResult = {
        success: gvf.finalScore >= config.passThreshold,
        pipelineScore: gvf.finalScore,
        summary: `Gen+Verify+Fix: ${gvf.verificationReport.stopReason} (${gvf.iterations.length} rounds)`,
        totalTimeMs: elapsed,
        iterations: gvf.iterations.length,
        logs: allLogs,
        files: [{ path: fileName, isNew: false, content: gvf.finalCode }],
      };

      setResult(autopilotResult);
      setProgress((p) => p ? { ...p, phase: "complete", overallProgress: 100 } : p);
      setRunning(false);
      onComplete(autopilotResult);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        pushLog("warning", L4(lang, { ko: "사용자에 의해 중단됨", en: "Aborted by user", ja: "ユーザーにより中断", zh: "用户中断"}));
      } else {
        pushLog("error", L4(lang, { ko: "루프 실행 실패", en: "Loop execution failed", ja: "ループ実行失敗", zh: "循环执行失败"}));
      }
      setRunning(false);
    }
  }, [prompt, running, config, language, fileName, lang, onComplete]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
        <span className="flex items-center gap-2 text-xs font-semibold text-[#e6edf3]">
          <Rocket size={14} className="text-amber-400" /> {L4(lang, { ko: "풀 오토파일럿", en: "Full Autopilot", ja: "フルオートパイロット", zh: "全自动驾驶"})}
          {running && <span className="flex items-center gap-1 text-blue-400"><Loader2 size={10} className="animate-spin" />{L4(lang, { ko: "실행 중", en: "Running", ja: "実行中", zh: "运行中"})}</span>}
          {result?.success && <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-500/15 text-green-400">PASSED</span>}
          {result && !result.success && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400">BELOW</span>}
        </span>
        <div className="flex items-center gap-1">
          {running && <button onClick={() => { abortRef.current?.abort(); setRunning(false); }} aria-label="중지" className="p-1 hover:bg-[#21262d] rounded"><Square size={12} className="text-accent-amber" /></button>}
          {result && <button onClick={handleReset} aria-label="초기화" className="p-1 hover:bg-[#21262d] rounded"><RotateCcw size={12} className="text-[#8b949e]" /></button>}
          <button onClick={onClose} aria-label="닫기" className="p-1 hover:bg-[#21262d] rounded"><XCircle size={12} className="text-[#8b949e]" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Input Area */}
        {!running && !result && (
          <div className="p-3 space-y-3">
            <textarea className="w-full h-24 px-3 py-2 text-xs bg-[#010409] border border-[#30363d] rounded-lg resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-blue-500 text-[#e6edf3] placeholder:text-[#8b949e]"
              placeholder={L4(lang, { ko: "만들거나 수정할 내용을 설명하세요...", en: "Describe what you want to build or fix...", ja: "作成または修正する内容を説明してください...", zh: "请描述要创建或修改的内容..."})} value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleStart(); }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#e6edf3]">
                  <Settings size={10} /> {showConfig ? L4(lang, { ko: "설정 숨기기", en: "Hide Config", ja: "設定を隠す", zh: "隐藏设置"}) : L4(lang, { ko: "설정", en: "Config", ja: "設定", zh: "设置"})} {showConfig ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
                <button
                  onClick={() => setMode(mode === "autopilot" ? "gen-verify-fix" : "autopilot")}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-md border transition-colors ${
                    mode === "gen-verify-fix"
                      ? "border-blue-500 bg-blue-500/15 text-blue-400"
                      : "border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
                  }`}
                  title={L4(lang, { ko: "생성+검증+수정 모드", en: "Gen+Verify+Fix mode", ja: "生成+検証+修正モード", zh: "生成+验证+修复模式"})}
                >
                  <RefreshCw size={10} /> {L4(lang, { ko: "생성+검증+수정", en: "Gen+Verify+Fix", ja: "生成+検証+修正", zh: "生成+验证+修复"})}
                </button>
              </div>
              {mode === "autopilot" ? (
                <button onClick={handleStart} disabled={!prompt.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-800 text-stone-100 hover:opacity-90 disabled:opacity-40 transition-opacity">
                  <Play size={12} /> {L4(lang, { ko: "오토파일럿 시작", en: "Start Autopilot", ja: "オートパイロット開始", zh: "启动自动驾驶"})}
                </button>
              ) : (
                <button onClick={handleStartGVF} disabled={!prompt.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-stone-100 hover:opacity-90 disabled:opacity-40 transition-opacity">
                  <RefreshCw size={12} /> {L4(lang, { ko: "생성+검증+수정 시작", en: "Start GVF Loop", ja: "生成+検証+修正開始", zh: "启动生成+验证+修复"})}
                </button>
              )}
            </div>
            {showConfig && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-[#010409] rounded-lg border border-[#30363d]">
                <ConfigToggle label={L4(lang, { ko: "합의 리뷰", en: "Consensus Review", ja: "コンセンサスレビュー", zh: "共识审查"})} checked={config.enableReview} onChange={(v) => setConfig({ ...config, enableReview: v })} />
                <ConfigToggle label={L4(lang, { ko: "스트레스 테스트", en: "Stress Test", ja: "ストレステスト", zh: "压力测试"})} checked={config.enableStressTest} onChange={(v) => setConfig({ ...config, enableStressTest: v })} />
                <ConfigToggle label={L4(lang, { ko: "카오스 분석", en: "Chaos Analysis", ja: "カオス分析", zh: "混沌分析"})} checked={config.enableChaos} onChange={(v) => setConfig({ ...config, enableChaos: v })} />
                <ConfigToggle label={L4(lang, { ko: "자동 수정", en: "Auto Fix", ja: "自動修正", zh: "自动修复"})} checked={config.enableAutoFix} onChange={(v) => setConfig({ ...config, enableAutoFix: v })} />
                <ConfigToggle label={L4(lang, { ko: "문서화", en: "Documentation", ja: "ドキュメント化", zh: "文档化"})} checked={config.enableDocs} onChange={(v) => setConfig({ ...config, enableDocs: v })} />
                <div className="flex items-center gap-2 text-[10px] text-[#8b949e]">
                  <span>{L4(lang, { ko: "기준점", en: "Threshold", ja: "基準値", zh: "阈值"})}</span>
                  <input type="number" min={0} max={100} value={config.passThreshold}
                    onChange={(e) => setConfig({ ...config, passThreshold: Number(e.target.value) })}
                    className="w-12 px-1 py-0.5 bg-[#0d1117] border border-[#30363d] rounded text-[10px] text-center text-[#e6edf3]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {(running || result) && progress && (
          <div className="p-3 space-y-3">
            <div className="flex gap-0.5">
              {PHASE_ORDER.map((phase, i) => {
                const meta = PHASE_META[phase];
                const isCurrent = progress.phaseIndex === i;
                const isDone = progress.phaseIndex > i || progress.phase === "complete";
                return (
                  <div key={phase} className="flex-1 flex flex-col items-center gap-1" title={L4(lang, { ko: meta.ko, en: meta.en, ja: meta.ja, zh: meta.zh })}>
                    <div className={`w-full h-1 rounded-full transition-[transform,opacity,background-color,border-color,color] ${isDone ? "bg-green-400" : isCurrent ? "bg-blue-400" : "bg-[#30363d]"}`} />
                    <span className={`text-[8px] ${isCurrent ? "text-[#e6edf3] font-semibold" : "text-[#8b949e] truncate overflow-hidden"}`}>{L4(lang, { ko: meta.ko, en: meta.en, ja: meta.ja, zh: meta.zh }).slice(0, 4)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#e6edf3]">{progress.currentAction}</span>
              <span className="text-[#8b949e] flex items-center gap-1"><Clock size={9} />{formatMs(progress.elapsedMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-[transform,opacity,background-color,border-color,color] duration-500 bg-amber-800" style={{ width: `${progress.overallProgress}%` }} />
              </div>
              <span className="text-[9px] text-[#8b949e] font-mono w-8 text-right">{progress.overallProgress}%</span>
            </div>
            <div ref={logRef} className="h-32 overflow-y-auto bg-[#010409] rounded-lg border border-[#30363d] p-2 font-mono text-[10px] space-y-0.5">
              {progress.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5" style={{ color: logLevelColor(log.level) }}>
                  <span className="mt-0.5 shrink-0">{logLevelIcon(log.level)}</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-3 space-y-3 border-t border-[#30363d]">
            <div className="grid grid-cols-4 gap-2">
              <ScoreCard label={L4(lang, { ko: "파이프라인", en: "Pipeline", ja: "パイプライン", zh: "流水线"})} score={result.pipelineScore} icon={<Shield size={12} />} />
              {result.reviewConsensus && <ScoreCard label={L4(lang, { ko: "리뷰", en: "Review", ja: "レビュー", zh: "审查"})} score={result.reviewConsensus.score} icon={<Eye size={12} />} />}
              {result.stressTestScore != null && <ScoreCard label={L4(lang, { ko: "스트레스", en: "Stress", ja: "ストレス", zh: "压力"})} score={result.stressTestScore} icon={<FlaskConical size={12} />} />}
              {result.chaosResilience != null && <ScoreCard label={L4(lang, { ko: "카오스", en: "Chaos", ja: "カオス", zh: "混沌"})} score={result.chaosResilience} icon={<Bug size={12} />} />}
            </div>
            {gvfResult && gvfResult.iterations.length > 0 && (
              <div className="bg-[#010409] rounded-lg border border-[#30363d] p-2 space-y-1">
                <span className="text-[10px] text-[#8b949e] flex items-center gap-1 mb-1"><RefreshCw size={10} />{L4(lang, { ko: "반복 이력", en: "Iteration History", ja: "反復履歴", zh: "迭代历史"})}</span>
                <div className="grid grid-cols-4 gap-1 text-[9px] text-[#8b949e] font-semibold px-1">
                  <span>{L4(lang, { ko: "라운드", en: "Round", ja: "ラウンド", zh: "轮次"})}</span>
                  <span>{L4(lang, { ko: "점수", en: "Score", ja: "スコア", zh: "分数"})}</span>
                  <span>{L4(lang, { ko: "발견", en: "Findings", ja: "発見", zh: "发现"})}</span>
                  <span>{L4(lang, { ko: "수정", en: "Fixes", ja: "修正", zh: "修复"})}</span>
                </div>
                {gvfResult.iterations.map((iter) => (
                  <div key={iter.round} className="grid grid-cols-4 gap-1 text-[10px] px-1 py-0.5 rounded hover:bg-[#21262d]">
                    <span className="text-[#e6edf3] font-mono">#{iter.round}</span>
                    <span className="font-mono" style={{ color: iter.score >= config.passThreshold ? "#3fb950" : iter.score >= config.passThreshold - 15 ? "#d29922" : "#f85149" }}>{iter.score}</span>
                    <span className="text-[#e6edf3] font-mono">{iter.findings}</span>
                    <span className="text-[#e6edf3] font-mono">{iter.fixes}</span>
                  </div>
                ))}
                <div className="text-[9px] text-[#8b949e] pt-1 border-t border-[#30363d]">
                  {L4(lang, { ko: "종료 사유", en: "Stop reason", ja: "終了理由", zh: "终止原因"})}: <span className="text-[#e6edf3]">{gvfResult.verificationReport.stopReason}</span>
                </div>
              </div>
            )}
            {result.files.length > 0 && (
              <div className="bg-[#010409] rounded-lg border border-[#30363d]">
                <button onClick={() => setExpandedFiles(!expandedFiles)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] text-[#e6edf3] hover:bg-[#21262d]">
                  {expandedFiles ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  {result.files.length} {L4(lang, { ko: "개 파일 변경됨", en: "file(s) changed", ja: "ファイル変更", zh: "个文件已更改"})}
                </button>
                {expandedFiles && (
                  <div className="px-2 pb-2 space-y-1">
                    {result.files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-[#0d1117]">
                        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${f.isNew ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                          {f.isNew ? "NEW" : "MOD"}
                        </span>
                        <span className="text-[#e6edf3] font-mono truncate">{f.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {result.commitMessage && (
              <div className="bg-[#010409] rounded-lg border border-[#30363d] p-2">
                <span className="text-[10px] text-[#8b949e] flex items-center gap-1 mb-1"><GitCommit size={10} />Commit</span>
                <code className="text-[10px] text-amber-400 font-mono">{result.commitMessage}</code>
              </div>
            )}
            {showReport && result.documentation && (
              <div className="bg-[#010409] rounded-lg border border-[#30363d] p-2 max-h-48 overflow-y-auto">
                <pre className="text-[10px] text-[#e6edf3] whitespace-pre-wrap font-mono">{result.documentation}</pre>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => onComplete(result)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white hover:opacity-90">
                <CheckCircle size={12} /> {L4(lang, { ko: "적용", en: "Apply", ja: "適用", zh: "应用"})}
              </button>
              {result.documentation && (
                <button onClick={() => setShowReport(!showReport)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#30363d] text-[#e6edf3] hover:bg-[#21262d]">
                  <BookOpen size={12} /> {showReport ? L4(lang, { ko: "숨기기", en: "Hide", ja: "非表示", zh: "隐藏"}) : L4(lang, { ko: "보고서", en: "Report", ja: "レポート", zh: "报告"})}
                </button>
              )}
              <button onClick={handleCopyReport} className="p-1.5 rounded-lg border border-[#30363d] text-[#8b949e] hover:bg-[#21262d]" title={L4(lang, { ko: "보고서 복사", en: "Copy report", ja: "レポートコピー", zh: "复制报告"})} aria-label={L4(lang, { ko: "보고서 복사", en: "Copy report", ja: "レポートコピー", zh: "复制报告"})}><Clipboard size={12} /></button>
              <div className="flex-1" />
              <span className="text-[9px] text-[#8b949e]">{formatMs(result.totalTimeMs)} | {result.files.length} {L4(lang, { ko: "개 파일", en: "files", ja: "ファイル", zh: "个文件"})} | {result.iterations} {L4(lang, { ko: "회 반복", en: "iter", ja: "回反復", zh: "次迭代"})}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=AutopilotUI | inputs=Props | outputs=JSX

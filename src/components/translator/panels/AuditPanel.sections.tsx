"use client";

import { useCallback, useState } from "react";
import { CheckCircle, ListChecks, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useTranslator } from "../core/TranslatorContext";
import {
  applyAutoFix,
  runAIAudit,
  runPublishAudit,
  type AICorrection,
  type PublishAuditReport,
} from "@/lib/translation/publish-audit";
import { CATEGORY_LABEL, SeverityBadge, scoreColor } from "./AuditPanel.helpers";

export function PublishAuditSection() {
  const { result, setResult, provider, getEffectiveApiKeyForProvider } = useTranslator();
  const [report, setReport] = useState<PublishAuditReport | null>(null);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [aiCorrections, setAiCorrections] = useState<AICorrection[]>([]);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    if (!result || result.trim().length < 10) return;
    const reportResult = runPublishAudit(result);
    setReport(reportResult);
    setLastRunAt(Date.now());
  }, [result]);

  const handleAutoFix = useCallback(() => {
    if (!result) return;
    const { fixed, changes } = applyAutoFix(result);
    if (changes > 0) {
      setResult(fixed);
      setTimeout(() => setReport(runPublishAudit(fixed)), 50);
    }
  }, [result, setResult]);

  const handleRunAI = useCallback(async () => {
    if (!result || result.trim().length < 10 || aiRunning) return;
    setAiRunning(true);
    setAiError(null);
    try {
      const apiKey = getEffectiveApiKeyForProvider(provider);
      const corrections = await runAIAudit(result, provider, apiKey);
      setAiCorrections(corrections);
      if (corrections.length === 0) setAiError("노아가 교정 제안을 반환하지 않았습니다. 연결 키를 확인하거나 다시 시도하세요.");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "노아 검수 실패");
      setAiCorrections([]);
    } finally {
      setAiRunning(false);
    }
  }, [result, provider, getEffectiveApiKeyForProvider, aiRunning]);

  const handleApplyAICorrection = useCallback((correction: AICorrection) => {
    if (!result) return;
    const correctionIndex = result.indexOf(correction.original);
    if (correctionIndex < 0) return;
    const fixed = result.slice(0, correctionIndex) + correction.suggested + result.slice(correctionIndex + correction.original.length);
    setResult(fixed);
    setAiCorrections(previousCorrections => previousCorrections.filter(item => item !== correction));
  }, [result, setResult]);

  const canRun = result.trim().length >= 10;
  const autoFixableCount = report?.findings.filter(finding => finding.autoFixable).length ?? 0;

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-text-secondary">
          <ListChecks className="w-3.5 h-3.5 text-accent-green" />
          <span className="text-[12px] font-medium">출판 검수</span>
          <span className="text-[9px] text-text-tertiary">무료 · 로컬</span>
        </div>
        {report && (
          <span className={`text-[11px] font-mono font-bold ${scoreColor(report.overallScore)}`}>
            {report.overallScore}
          </span>
        )}
      </div>

      {!report && (
        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="w-full min-h-[44px] rounded-md bg-accent-green/15 hover:bg-accent-green/25 text-accent-green border border-accent-green/30 text-[12px] font-medium transition-colors disabled:bg-bg-tertiary disabled:text-text-quaternary disabled:opacity-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          title="맞춤법·띄어쓰기·문장부호·구조 자체 검수 실행 (외부 API 없음)"
        >
          {canRun ? "검수 실행" : "번역문 10자 이상 필요"}
        </button>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">총 문자</span>
              <span className="font-mono text-text-secondary">{report.stats.totalChars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">문단</span>
              <span className="font-mono text-text-secondary">{report.stats.totalParagraphs}</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">평균 문장</span>
              <span className="font-mono text-text-secondary">{report.stats.avgSentenceLength}자</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">대사 비율</span>
              <span className="font-mono text-text-secondary">{Math.round(report.stats.dialogueRatio * 100)}%</span>
            </div>
          </div>

          {report.findings.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-accent-green bg-accent-green/5 border border-accent-green/20 rounded p-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>눈에 띄는 문제를 찾지 못했습니다.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {report.findings.map(finding => (
                <div key={finding.id} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={finding.severity} />
                    <span className="text-[9px] text-text-tertiary font-mono">{CATEGORY_LABEL[finding.category]}</span>
                    {finding.autoFixable && (
                      <span className="text-[9px] text-accent-purple font-mono">자동 고침</span>
                    )}
                    <span className="text-[11px] text-text-primary">{finding.title}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">{finding.detail}</div>
                  {finding.suggestion && (
                    <div className="text-[10px] text-accent-amber">→ {finding.suggestion}</div>
                  )}
                  {finding.locations && finding.locations.length > 0 && (
                    <div className="text-[9px] text-text-tertiary font-mono truncate">
                      예: {finding.locations.map(location => `"${location.snippet}"`).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRun}
              className="flex-1 min-h-[44px] rounded-md bg-white/5 hover:bg-white/10 text-text-secondary border border-white/10 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              재검수
            </button>
            {autoFixableCount > 0 && (
              <button
                type="button"
                onClick={handleAutoFix}
                className="flex-1 min-h-[44px] rounded-md bg-accent-purple/15 hover:bg-accent-purple/25 text-accent-purple border border-accent-purple/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                title="중복 문장부호·전각/반각 혼용 등 안전한 항목만 자동 수정"
              >
                <Wand2 className="w-3 h-3" />
                자동 고침 ({autoFixableCount})
              </button>
            )}
          </div>

          {lastRunAt && (
            <div className="text-[9px] text-text-tertiary text-center italic">
              마지막 검수: {new Date(lastRunAt).toLocaleTimeString("ko-KR")}
            </div>
          )}
        </>
      )}

      {canRun && (
        <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-text-secondary">
              <Sparkles className="w-3 h-3 text-accent-purple" />
              <span className="text-[10px] font-medium">노아 교정 (선택)</span>
              <span className="text-[9px] text-text-tertiary">· 연결 키 사용</span>
            </div>
            {aiCorrections.length > 0 && (
              <span className="text-[10px] text-accent-purple font-mono">{aiCorrections.length}건</span>
            )}
          </div>

          {!aiRunning && aiCorrections.length === 0 && (
            <button
              type="button"
              onClick={handleRunAI}
              className="w-full min-h-[44px] rounded-md bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple border border-accent-purple/25 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              title={`${provider}로 1회 호출 — 맞춤법·띄어쓰기·어색한 표현 제안`}
            >
              노아 교정 제안 실행
            </button>
          )}

          {aiRunning && (
            <div className="flex items-center gap-2 text-[10px] text-text-secondary py-1">
              <Loader2 className="w-3 h-3 animate-spin text-accent-purple" />
              <span>노아 교정 중… (최대 45초)</span>
            </div>
          )}

          {aiError && !aiRunning && (
            <div className="text-[10px] text-accent-amber bg-accent-amber/5 border border-accent-amber/20 rounded p-1.5">
              {aiError}
            </div>
          )}

          {aiCorrections.length > 0 && (
            <div className="space-y-1.5">
              {aiCorrections.map((correction, index) => {
                const sevColor = correction.severity === "high" ? "text-accent-red" : correction.severity === "medium" ? "text-accent-amber" : "text-accent-indigo";
                return (
                  <div key={index} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] px-1 py-0.5 rounded border font-mono uppercase ${sevColor}`}>
                        {correction.severity}
                      </span>
                      <span className="text-[10px] text-text-secondary italic">{correction.reason}</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary">
                      <span className="line-through">{correction.original}</span>
                    </div>
                    <div className="text-[11px] text-accent-green">
                      → {correction.suggested}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyAICorrection(correction)}
                      className="w-full mt-1 min-h-[44px] text-[10px] rounded-md bg-accent-green/10 hover:bg-accent-green/20 text-accent-green border border-accent-green/25 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                    >
                      이 교정 적용
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleRunAI}
                className="w-full min-h-[44px] text-[10px] rounded-md bg-white/5 hover:bg-white/10 text-text-tertiary border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              >
                노아 재검수
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

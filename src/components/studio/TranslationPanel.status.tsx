"use client";

import { AlertTriangle } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import type { VoiceViolation } from "@/engine/translation";
import type { RagStatus } from "@/hooks/useTranslation";
import type { TermDriftWarning } from "@/lib/translation/episode-memory";
import type { TranslationProjectContext } from "@/lib/translation/project-bridge";
import { TermTooltip } from "@/components/ui/TermTooltip";

interface TranslationStatusPanelsProps {
  isKO: boolean;
  language: AppLanguage;
  ragStatus: RagStatus;
  projectContext: TranslationProjectContext | null;
  voiceRetryNeeded: boolean;
  voiceRetryHint: string;
  voiceViolations: VoiceViolation[];
  retryWithVoiceHint: () => Promise<void>;
  isTranslating: boolean;
  driftWarnings: TermDriftWarning[];
}

export function TranslationStatusPanels({
  isKO,
  language,
  ragStatus,
  projectContext,
  voiceRetryNeeded,
  voiceRetryHint,
  voiceViolations,
  retryWithVoiceHint,
  isTranslating,
  driftWarnings,
}: TranslationStatusPanelsProps) {
  return (
    <>
      {ragStatus.fetched ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded border border-accent-blue/30 bg-accent-blue/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent-blue"
            title={isKO ? `RAG 활성 — 용어 ${ragStatus.pastTermsCount} · 과거화 ${ragStatus.pastEpisodesCount}` : `RAG active — terms ${ragStatus.pastTermsCount} · past episodes ${ragStatus.pastEpisodesCount}`}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-blue" />
            <span>{isKO ? "RAG 활성" : "RAG Active"}</span>
            <span className="text-text-tertiary">·</span>
            <span>{isKO ? `용어 ${ragStatus.pastTermsCount}` : `Terms ${ragStatus.pastTermsCount}`}</span>
            <span className="text-text-tertiary">·</span>
            <span>{isKO ? `과거화 ${ragStatus.pastEpisodesCount}` : `Past EP ${ragStatus.pastEpisodesCount}`}</span>
            {ragStatus.worldBibleLoaded && (
              <>
                <span className="text-text-tertiary">·</span>
                <span>{isKO ? "세계관" : "World"}</span>
              </>
            )}
          </div>
        </div>
      ) : projectContext ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-yellow-500"
            title={isKO ? "RAG 대기 중 — 번역 시작 시 자동 호출" : "RAG idle — fetched on translation start"}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            <span>{isKO ? "RAG 대기" : "RAG Idle"}</span>
            <span className="text-text-tertiary">·</span>
            <span>{isKO ? `캐릭터 ${projectContext.characters.length}` : `Char ${projectContext.characters.length}`}</span>
            <span className="text-text-tertiary">·</span>
            <span>{isKO ? `용어 ${projectContext.glossary.length}` : `Term ${projectContext.glossary.length}`}</span>
          </div>
        </div>
      ) : null}

      {voiceRetryNeeded && voiceRetryHint && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1 text-xs">
                <div className="mb-0.5 font-medium text-text-primary">
                  {isKO ? "캐릭터 말투 개선 가능" : "Character voice improvements possible"}
                </div>
                <div className="text-text-secondary">
                  {isKO
                    ? `${voiceViolations.filter((violation) => violation.severity === "error").length}건의 심각한 위반 — 힌트를 반영해 다시 번역할 수 있습니다.`
                    : `${voiceViolations.filter((violation) => violation.severity === "error").length} critical violation(s) — re-translate with hint to improve.`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void retryWithVoiceHint();
              }}
              disabled={isTranslating}
              className="flex-shrink-0 rounded bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label={isKO ? "힌트로 재번역 실행" : "Retry translation with hint"}
            >
              {isKO ? "힌트로 재번역" : "Retry with hint"}
            </button>
          </div>
          <div className="mt-2 line-clamp-2 text-xs text-text-tertiary" title={voiceRetryHint}>
            {voiceRetryHint.length > 120 ? `${voiceRetryHint.slice(0, 120)}...` : voiceRetryHint}
          </div>
        </div>
      )}

      {driftWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-text-primary">
              {isKO ? `용어 드리프트 감지 (${driftWarnings.length})` : `Term Drift Detected (${driftWarnings.length})`}
            </span>
          </div>
          <ul className="space-y-1 text-xs">
            {driftWarnings.slice(0, 5).map((warning, index) => (
              <li key={`drift-${index}-${warning.source}`} className="text-text-secondary">
                <span className="font-mono">&quot;{warning.source}&quot;</span>
                {" → "}
                {isKO ? "이전 번역" : "canonical"}{" "}
                <span className="text-amber-300">&quot;{warning.canonicalTarget}&quot;</span>
                {` (${warning.historyCount}${isKO ? "회" : "x"}), `}
                {isKO ? "시도" : "attempted"}{" "}
                <span className="text-accent-red">&quot;{warning.attemptedTarget}&quot;</span>
                {warning.severity === "block" && (
                  <span className="ml-1 font-bold text-accent-red">[{isKO ? "차단" : "BLOCK"}]</span>
                )}
              </li>
            ))}
            {driftWarnings.length > 5 && (
              <li className="italic text-text-tertiary">
                {isKO ? `... 외 ${driftWarnings.length - 5}건` : `... and ${driftWarnings.length - 5} more`}
              </li>
            )}
          </ul>
        </div>
      )}

      {voiceViolations.length > 0 && (
        <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-text-primary">
              {isKO ? (
                <>
                  캐릭터 말투 검증 (<TermTooltip term="Voice Guard" language={language}>Voice Guard</TermTooltip>) — 위반 {voiceViolations.length}건
                </>
              ) : (
                <>
                  Character <TermTooltip term="Voice Guard" language={language}>Voice Guard</TermTooltip> — {voiceViolations.length} violations
                </>
              )}
            </span>
          </div>
          <ul className="space-y-1 text-xs">
            {voiceViolations.slice(0, 5).map((violation, index) => (
              <li key={`voice-${index}-${violation.speaker}`} className="text-text-secondary">
                <span className={violation.severity === "error" ? "text-accent-red" : "text-amber-400"}>
                  [{violation.severity === "error" ? (isKO ? "오류" : "ERR") : (isKO ? "경고" : "WARN")}]
                </span>
                <span className="ml-1 font-mono">{violation.speaker}</span>
                {": "}
                <span>{violation.detail}</span>
                {violation.matched && (
                  <span className="ml-1 text-text-tertiary">
                    ({isKO ? "매치" : "match"}: &quot;{violation.matched}&quot;)
                  </span>
                )}
              </li>
            ))}
            {voiceViolations.length > 5 && (
              <li className="italic text-text-tertiary">
                {isKO ? `... 외 ${voiceViolations.length - 5}건` : `... and ${voiceViolations.length - 5} more`}
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}

"use client";

import { Loader2, Play } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { TranslationTarget } from "@/engine/translation";
import type { TranslationSegment } from "@/lib/translation/editable-segment";
import type { GlossaryCandidate } from "@/lib/translation/glossary-extractor";
import type { TMSuggestion } from "@/lib/translation/translation-memory";

interface LogEntry {
  id: number;
  type: "info" | "warn" | "success" | "error";
  text: string;
  detail?: string;
}

interface GeneralTranslationSectionProps {
  isKO: boolean;
  targetLang: TranslationTarget;
  setTargetLang: (targetLang: TranslationTarget) => void;
  generalDomain: string;
  setGeneralDomain: (domain: string) => void;
  generalText: string;
  setGeneralText: (text: string) => void;
  generalTranslating: boolean;
  handleGeneralTranslate: () => void;
  generalResult: string;
  showSegmentView: boolean;
  setShowSegmentView: (next: boolean) => void;
  segments: TranslationSegment[];
  setSegments: Dispatch<SetStateAction<TranslationSegment[]>>;
  handleSegmentFocus: (segmentText: string) => void;
  tmSuggestions: TMSuggestion[];
  setTmSuggestions: Dispatch<SetStateAction<TMSuggestion[]>>;
  glossaryCandidates: GlossaryCandidate[];
  setGlossaryTerm: (term: string) => void;
  glossary: Record<string, string>;
  tmCount: number;
  setLogs: Dispatch<SetStateAction<LogEntry[]>>;
}

const GENERAL_DOMAIN_IDS = [
  "general",
  "academic",
  "business",
  "essay",
  "legal",
  "medical",
  "it",
  "journalism",
] as const;

function getGeneralDomainLabel(domainId: string, isKO: boolean): string {
  const labels: Record<string, string> = {
    general: isKO ? "범용" : "General",
    academic: isKO ? "학술" : "Academic",
    business: isKO ? "비즈니스" : "Business",
    essay: isKO ? "에세이" : "Essay",
    legal: isKO ? "법률" : "Legal",
    medical: isKO ? "의료" : "Medical",
    it: "IT",
    journalism: isKO ? "저널리즘" : "News",
  };
  return labels[domainId] ?? domainId;
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function GeneralTranslationSection({
  isKO,
  targetLang,
  setTargetLang,
  generalDomain,
  setGeneralDomain,
  generalText,
  setGeneralText,
  generalTranslating,
  handleGeneralTranslate,
  generalResult,
  showSegmentView,
  setShowSegmentView,
  segments,
  setSegments,
  handleSegmentFocus,
  tmSuggestions,
  setTmSuggestions,
  glossaryCandidates,
  setGlossaryTerm,
  glossary,
  tmCount,
  setLogs,
}: GeneralTranslationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {GENERAL_DOMAIN_IDS.map((domainId) => {
          const label = getGeneralDomainLabel(domainId, isKO);
          return (
            <button
              key={domainId}
              onClick={() => setGeneralDomain(domainId)}
              aria-pressed={generalDomain === domainId}
              aria-label={isKO ? `도메인 ${label} 선택` : `Select ${label} domain`}
              className={`rounded-xl border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                generalDomain === domainId
                  ? "border-border bg-[rgba(184,149,92,0.12)] text-text-primary"
                  : "border-white/8 text-text-tertiary hover:border-white/15"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex w-fit gap-2 rounded-xl border border-white/5 bg-black/30 p-1" role="radiogroup" aria-label={isKO ? "대상 언어" : "Target language"}>
        {(["EN", "JP", "CN"] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setTargetLang(lang)}
            role="radio"
            aria-checked={targetLang === lang}
            aria-label={isKO ? `${lang} 언어 선택` : `Select ${lang} language`}
            className={`rounded-lg px-4 py-2 font-mono text-[11px] font-bold tracking-wider transition-[background-color,border-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
              targetLang === lang
                ? "bg-[rgba(184,149,92,0.15)] text-text-primary shadow-[inset_0_0_0_1px_rgba(184,149,92,0.3)]"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <textarea
        value={generalText}
        onChange={(event) => setGeneralText(event.target.value)}
        onPaste={async (event) => {
          const pasted = event.clipboardData.getData("text").trim();
          try {
            const { isUrl, extractTextFromUrl } = await import("@/lib/web-features");
            if (isUrl(pasted)) {
              event.preventDefault();
              setGeneralText(`(${isKO ? "URL에서 텍스트 추출 중" : "Extracting from URL"}...)`);
              setLogs((prev) => [...prev, { id: Date.now(), type: "info", text: `Fetching: ${pasted}` }]);
              const result = await extractTextFromUrl(pasted);
              if (result) {
                setGeneralText(result.text);
                setLogs((prev) => [...prev, { id: Date.now(), type: "success", text: `Extracted: "${result.title}" (${result.wordCount} words, ${result.language})` }]);
              } else {
                setGeneralText(pasted);
                setLogs((prev) => [...prev, { id: Date.now(), type: "warn", text: "URL extraction failed, using raw URL" }]);
              }
            }
          } catch {
            // fallback: 일반 텍스트로 처리
          }
        }}
        placeholder={isKO ? "번역할 텍스트 또는 URL을 붙여넣으세요..." : "Paste text or URL to translate..."}
        className="w-full min-h-[160px] resize-y rounded-xl border border-white/10 bg-bg-tertiary p-4 font-sans text-sm text-text-primary outline-none placeholder-text-tertiary/40 focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-border"
      />

      <button
        onClick={handleGeneralTranslate}
        disabled={!generalText.trim() || generalTranslating}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-[linear-gradient(45deg,rgba(130,95,45,0.6),rgba(184,149,92,0.9))] px-8 py-3 font-mono text-[12px] font-black uppercase tracking-widest text-white shadow-[0_5px_20px_rgba(184,149,92,0.2)] transition-[transform,opacity] hover:scale-[1.02] disabled:opacity-40 sm:w-auto"
      >
        {generalTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isKO ? "4단계 번역 시작" : "4-STAGE TRANSLATE"}
      </button>

      {generalResult && (
        <div className="relative rounded-xl border border-border bg-black/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary">{isKO ? "번역 결과" : "Result"}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSegmentView(!showSegmentView)}
                aria-pressed={showSegmentView}
                aria-label={isKO ? (showSegmentView ? "전체 보기로 전환" : "문장 정렬로 전환") : (showSegmentView ? "Switch to full view" : "Switch to segments view")}
                className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                {showSegmentView ? (isKO ? "전체 보기" : "Full") : (isKO ? "문장 정렬" : "Segments")}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(generalResult)}
                aria-label={isKO ? "번역 결과 복사" : "Copy translation result"}
                className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                {isKO ? "복사" : "Copy"}
              </button>
            </div>
          </div>
          {showSegmentView && segments.length > 0 ? (
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {segments.map((segment, index) => (
                <div key={segment.id} className="group flex gap-2">
                  <span className="w-6 shrink-0 pt-2 text-right text-[10px] text-text-tertiary">{index + 1}</span>
                  <div className="grid flex-1 grid-cols-2 gap-2 rounded-lg border border-white/5 bg-white/2 p-2 transition-colors hover:border-border">
                    <div
                      className="cursor-text text-[12px] leading-relaxed text-text-secondary"
                      onClick={() => handleSegmentFocus(segment.source)}
                    >
                      {segment.source}
                    </div>
                    <input
                      value={segment.target}
                      onFocus={() => handleSegmentFocus(segment.source)}
                      onChange={async (event) => {
                        const { editSegment } = await import("@/lib/translation");
                        const updated = editSegment(segment, event.target.value);
                        setSegments((prev) => prev.map((item) => (item.id === segment.id ? updated : item)));
                      }}
                      className="border-b border-transparent bg-transparent text-[12px] leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-border"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      title={isKO ? "이 문장만 재번역" : "Re-translate this sentence"}
                      onClick={async () => {
                        const { buildPartialRetranslatePrompt } = await import("@/lib/translation");
                        const prev = segments[index - 1];
                        const next = segments[index + 1];
                        const prompt = buildPartialRetranslatePrompt(
                          segment,
                          targetLang,
                          glossary,
                          prev && next ? { prevSource: prev.source, prevTarget: prev.target, nextSource: next.source } : undefined,
                        );
                        let result = "";
                        await (await import("@/lib/ai-providers")).streamChat({
                          systemInstruction: "",
                          messages: [{ role: "user", content: prompt }],
                          temperature: 0.3,
                          onChunk: (chunk: string) => {
                            result += chunk;
                          },
                        });
                        if (result.trim()) {
                          const { editSegment } = await import("@/lib/translation");
                          const updated = editSegment(segment, result.trim());
                          setSegments((prev) => prev.map((item) => (item.id === segment.id ? { ...updated, status: "edited" } : item)));
                        }
                      }}
                      className="rounded px-1.5 py-0.5 text-[10px] text-text-tertiary transition-colors hover:bg-accent-amber/10 hover:text-accent-amber"
                    >
                      ↻
                    </button>
                    <button
                      title={isKO ? "확정" : "Confirm"}
                      onClick={async () => {
                        const { confirmSegment } = await import("@/lib/translation");
                        setSegments((prev) => prev.map((item) => (item.id === segment.id ? confirmSegment(item) : item)));
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        segment.status === "confirmed"
                          ? "bg-accent-green/10 text-accent-green"
                          : "text-text-tertiary hover:bg-accent-green/10 hover:text-accent-green"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{generalResult}</div>
          )}
        </div>
      )}

      {tmSuggestions.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-tertiary p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              {isKO ? `TM 제안 (${tmSuggestions.length})` : `TM Suggestions (${tmSuggestions.length})`}
            </span>
            <button
              type="button"
              onClick={() => setTmSuggestions([])}
              aria-label={isKO ? "제안 닫기" : "Close suggestions"}
              className="rounded px-1.5 text-xs text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              ×
            </button>
          </div>
          <ul className="space-y-1.5">
            {tmSuggestions.map((suggestion, index) => (
              <li key={`${suggestion.source_type}-${index}-${suggestion.source.slice(0, 16)}`} className="rounded-lg border border-white/5 bg-black/20 p-2">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                      suggestion.source_type === "local"
                        ? "border-border bg-[rgba(184,149,92,0.12)] text-text-primary"
                        : "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                    }`}
                  >
                    {suggestion.source_type === "local" ? "TM" : "RAG"}
                  </span>
                  <span className="font-mono text-[10px] text-text-tertiary">
                    {(suggestion.similarity * 100).toFixed(0)}%
                  </span>
                  {suggestion.meta?.episode !== undefined && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      EP {suggestion.meta.episode}
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-text-tertiary" title={suggestion.source}>{suggestion.source}</div>
                <div className="mt-0.5 text-[12px] leading-relaxed text-text-primary">{suggestion.target}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {glossaryCandidates.length > 0 && (
        <details className="rounded-xl border border-white/8 bg-black/20 p-3">
          <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            {isKO ? `추출된 용어 (${glossaryCandidates.length}개)` : `Extracted terms (${glossaryCandidates.length})`}
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {glossaryCandidates.map((candidate, index) => (
              <button
                key={`${candidate.term}-${index}`}
                onClick={() => {
                  setGlossaryTerm(candidate.term);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-[rgba(184,149,92,0.08)] px-2 py-1 font-mono text-[10px] text-text-primary transition-colors hover:bg-[rgba(184,149,92,0.15)]"
              >
                {candidate.term} <span className="text-[8px] text-text-tertiary">{candidate.type}</span>
              </button>
            ))}
          </div>
        </details>
      )}

      {generalResult && (
        <div className="flex flex-wrap gap-2">
          <span className="self-center font-mono text-[10px] text-text-tertiary">{isKO ? "내보내기:" : "Export:"}</span>
          <button
            onClick={async () => {
              if (segments.length === 0) return;
              const { exportXLIFF } = await import("@/lib/translation");
              const xml = exportXLIFF(segments, "ko", targetLang.toLowerCase());
              downloadTextFile(xml, `translation_${targetLang}.xlf`, "application/xml");
            }}
            className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary"
          >
            XLIFF
          </button>
          <button
            onClick={async () => {
              const { loadTM, exportTMX } = await import("@/lib/translation");
              const entries = loadTM();
              if (entries.length === 0) return;
              const xml = exportTMX(entries);
              downloadTextFile(xml, "translation_memory.tmx", "application/xml");
            }}
            className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary"
          >
            TMX ({tmCount})
          </button>
          <button
            onClick={async () => {
              if (Object.keys(glossary).length === 0) return;
              const { exportTBX } = await import("@/lib/translation");
              const xml = exportTBX(glossary, "ko", targetLang.toLowerCase());
              downloadTextFile(xml, "glossary.tbx", "application/xml");
            }}
            className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary"
          >
            TBX
          </button>
          <button
            onClick={() => {
              downloadTextFile(generalResult, `translation_${targetLang}.txt`, "text/plain");
            }}
            className="rounded border border-white/10 px-2 py-1 font-mono text-[10px] text-text-tertiary transition-colors hover:border-white/20 hover:text-text-secondary"
          >
            TXT
          </button>
        </div>
      )}
    </div>
  );
}

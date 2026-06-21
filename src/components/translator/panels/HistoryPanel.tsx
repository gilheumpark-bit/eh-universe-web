import React, { useCallback, useMemo, useState } from "react";
import { Clock, RotateCcw, Check } from "lucide-react";
import { useTranslator } from "../core/TranslatorContext";
import { useLang } from "@/lib/LangContext";
import type { HistoryEntry } from "@/types/translator";

function formatRelativeTime(ts: number, langKo: boolean): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return langKo ? "방금 전" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return langKo ? `${min}분 전` : `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 48) return langKo ? `${h}시간 전` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return langKo ? `${d}일 전` : `${d}d ago`;
}

export function HistoryPanel() {
  const { history, setSource, setResult, setFrom, setTo, chapters, activeChapterIndex } = useTranslator();
  const { lang } = useLang();
  const langKo = lang === "ko";

  const currentChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;

  const sorted = useMemo(
    () => [...history].sort((a, b) => b.time - a.time),
    [history],
  );

  const [restoredId, setRestoredId] = useState<number | null>(null);

  const restore = useCallback(
    (entry: HistoryEntry) => {
      setSource(entry.source);
      setResult(entry.result);
      setFrom(entry.from);
      setTo(entry.to);
      setRestoredId(entry.time);
      setTimeout(() => setRestoredId(null), 2000);
    },
    [setSource, setResult, setFrom, setTo],
  );

  const actionLabel = (entry: HistoryEntry, idx: number) => {
    const pair = `${entry.from}→${entry.to}`;
    const preview = entry.source.slice(0, 48).replace(/\s+/g, " ");
    return langKo
      ? `번역 스냅샷 #${sorted.length - idx} (${pair}) — ${preview}${entry.source.length > 48 ? "…" : ""}`
      : `Translation snapshot #${sorted.length - idx} (${pair}) — ${preview}${entry.source.length > 48 ? "…" : ""}`;
  };

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="w-4 h-4 text-accent-purple" />
            <span className="text-[13px] font-medium">
              {langKo ? "번역 기록" : "Translation history"}
            </span>
          </div>
          <span className="text-[11px] text-text-tertiary px-2 py-0.5 rounded bg-white/5">
            {currentChapter?.name ?? (langKo ? "회차 없음" : "No chapter")}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-text-tertiary leading-relaxed">
          {langKo
            ? "번역 실행 시 자동 저장됩니다. 복원하면 원문·결과·언어 쌍이 편집기에 적용됩니다."
            : "Entries are saved when you translate. Restore applies source, result, and language pair to the editor."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-bg-primary/80 px-4 py-6 text-center shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-accent-purple/25 bg-accent-purple/10 text-accent-purple">
              <Clock className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[13px] font-semibold text-text-primary">
              {langKo ? "아직 쌓인 기록이 없습니다." : "No history yet."}
            </p>
            <p className="mx-auto mt-1 max-w-[220px] text-[11px] leading-relaxed text-text-secondary">
              {langKo
                ? "번역을 실행하면 원문, 결과, 언어 쌍이 자동으로 남습니다."
                : "Run a translation to save source, result, and language pair here."}
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-[14px] bottom-0 w-px bg-white/10 z-0" />
            <div className="space-y-4 relative z-10">
              {sorted.map((item, idx) => (
                <div key={`${item.time}-${idx}`} className="flex gap-3 group">
                  <div
                    className={`w-3.5 h-3.5 rounded-full mt-1 flex items-center justify-center shrink-0 ${
                      idx === 0 ? "bg-accent-purple shadow-[0_0_8px_rgba(168,85,247,0.4)]" : "bg-black border border-white/20"
                    }`}
                  >
                    {idx === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <span className={`text-[13px] ${idx === 0 ? "text-text-primary" : "text-text-secondary"} break-words`}>
                      {actionLabel(item, idx)}
                    </span>
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-text-tertiary font-mono">
                        {formatRelativeTime(item.time, langKo)}
                      </span>
                      <button
                        type="button"
                        onClick={() => restore(item)}
                        className={`min-h-[44px] px-3 rounded-md text-[11px] flex items-center gap-1 shrink-0 transition-[transform,opacity,background-color,border-color,color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                          restoredId === item.time
                            ? 'text-accent-green font-bold bg-accent-green/10'
                            : 'text-accent-purple hover:bg-accent-purple/10'
                        }`}
                      >
                        {restoredId === item.time ? <Check className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                        {restoredId === item.time ? (langKo ? "복원됨!" : "Restored!") : (langKo ? "복원" : "Restore")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

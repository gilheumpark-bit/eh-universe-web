import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Chevron, Clock } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { analyzeText, computeCPM } from "@/lib/desktop/writing-stats";

export const WritingStatsStrip = memo(function WritingStatsStrip({
  text,
  language,
}: {
  text: string;
  language: AppLanguage;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const stats = useMemo(() => analyzeText(text), [text]);
  const startRef = useRef<{ t: number; chars: number } | null>(null);
  const [cpm, setCpm] = useState(0);

  useEffect(() => {
    if (!startRef.current && text.length > 0) startRef.current = { t: Date.now(), chars: text.length };
    if (startRef.current) {
      const delta = text.length - startRef.current.chars;
      setCpm(computeCPM(Math.max(0, delta), Date.now() - startRef.current.t));
    }
  }, [text]);

  return (
    <div className="wr-stats-strip">
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={L4(language, {
          ko: "집필 통계 스트립 접기/펼치기",
          en: "Collapse or expand the writing stats strip",
        })}
        title={L4(language, {
          ko: "검토 참고 지표 — 속도(자/분)는 이 회차 편집 시작 이후 평균",
          en: "Review metrics — speed (chars/min) is the average since editing this episode began",
        })}
        onClick={() => setCollapsed((v) => !v)}
        className="wr-stats-toggle"
      >
        <Clock size={13} />
        <span className="wr-stats-title">{L4(language, { ko: "집필 통계", en: "Writing stats" })}</span>
        {!collapsed && (
          <span className="wr-stats-summary">
            {L4(language, {
              ko: `문장 ${stats.sentences.toLocaleString()} · 평균 ${stats.avgLen}자 · 대사 ${stats.dialoguePct}% · 반복 ${stats.repetitionPct}% · 속도 ${cpm}자/분`,
              en: `${stats.sentences.toLocaleString()} sentences · avg ${stats.avgLen} · dialogue ${stats.dialoguePct}% · repetition ${stats.repetitionPct}% · ${cpm} cpm`,
            })}
          </span>
        )}
        <Chevron
          size={13}
          className={"wr-stats-chevron" + (collapsed ? " is-collapsed" : "")}
        />
      </button>
    </div>
  );
});

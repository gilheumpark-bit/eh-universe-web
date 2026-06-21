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
    <div style={{ margin: "8px 28px 0" }}>
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
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "transparent",
          color: "var(--c-sub, #888)",
          fontSize: 11.5,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Clock size={13} />
        <span style={{ fontWeight: 600 }}>{L4(language, { ko: "집필 통계", en: "Writing stats" })}</span>
        {!collapsed && (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {L4(language, {
              ko: `문장 ${stats.sentences.toLocaleString()} · 평균 ${stats.avgLen}자 · 대사 ${stats.dialoguePct}% · 반복 ${stats.repetitionPct}% · 속도 ${cpm}자/분`,
              en: `${stats.sentences.toLocaleString()} sentences · avg ${stats.avgLen} · dialogue ${stats.dialoguePct}% · repetition ${stats.repetitionPct}% · ${cpm} cpm`,
            })}
          </span>
        )}
        <Chevron
          size={13}
          style={{ marginLeft: "auto", flexShrink: 0, transform: collapsed ? "rotate(-90deg)" : undefined }}
        />
      </button>
    </div>
  );
});

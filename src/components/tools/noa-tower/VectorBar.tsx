import React from "react";
import { type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { VectorScores } from "@/lib/tools/noa-tower/types";

const VECTOR_COLORS: Record<string, string> = {
  insight: "bg-cyan-400",
  consistency: "bg-blue-400",
  delusion: "bg-red-400",
  risk: "bg-amber-400",
};

const VECTOR_LABELS: Record<string, { ko: string; en: string }> = {
  insight: { ko: "I 통찰", en: "I Insight" },
  consistency: { ko: "C 논리", en: "C Consistency" },
  delusion: { ko: "D 과확신", en: "D Delusion" },
  risk: { ko: "R 도약", en: "R Risk" },
};

export function VectorBar({ vectors, lang }: { vectors: VectorScores; lang: Lang }) {
  const keys: (keyof VectorScores)[] = ["insight", "consistency", "delusion", "risk"];
  return (
    <div className="space-y-2">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-20 shrink-0 font-[--font-mono] text-[12px] tracking-wider text-text-tertiary">
            {L4(lang, VECTOR_LABELS[k])}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${VECTOR_COLORS[k]}`}
              style={{ width: `${Math.min(vectors[k] * 100, 100)}%`, opacity: 0.8 }}
            />
          </div>
          <span className="w-10 text-right font-[--font-mono] text-[12px] text-text-tertiary">
            {(vectors[k] * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=vectorbar | inputs=vectors,lang | outputs=JSX

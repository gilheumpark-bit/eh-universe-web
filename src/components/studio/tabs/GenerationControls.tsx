"use client";

import React from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

interface GenerationControlsProps {
  isGenerating: boolean;
  slowWarning: string | null;
  generationTime?: number | null;
  tokenUsage?: { used: number; budget: number } | null;
  language: AppLanguage;
}

/**
 * Shows slow-generation warning and post-generation stats (time + token usage).
 */
export const GenerationControls = React.memo(function GenerationControls({
  isGenerating,
  slowWarning,
  generationTime,
  tokenUsage,
  language,
}: GenerationControlsProps) {
  return (
    <>
      {/* Slow generation warning */}
      {isGenerating && slowWarning && (
        <div
          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-medium rounded-lg mx-3 ${
            slowWarning === "very-slow"
              ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/30"
              : "bg-bg-secondary text-text-secondary border border-border/50"
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
          {slowWarning === "very-slow"
            ? L4(language, {
                ko: "\uC544\uC9C1 \uC0DD\uC131 \uC911\uC785\uB2C8\uB2E4. \uCDE8\uC18C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
                en: "Still generating. You can cancel.",
              })
            : L4(language, {
                ko: "\uC0DD\uC131\uC5D0 \uC2DC\uAC04\uC774 \uAC78\uB9AC\uACE0 \uC788\uC2B5\uB2C8\uB2E4...",
                en: "Generation is taking longer than expected...",
              })}
        </div>
      )}

      {/* Generation stats: time + token usage */}
      {!isGenerating && generationTime != null && (
        <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-mono text-text-tertiary">
          <span>
            {L4(language, {
              ko: `\uC0DD\uC131 \uC644\uB8CC (${generationTime}\uCD08)`,
              en: `Done (${generationTime}s)`,
            })}
          </span>
          {tokenUsage && (
            <span className={tokenUsage.used > tokenUsage.budget * 0.9 ? "text-accent-amber" : ""}>
              {L4(language, {
                ko: `\uC0AC\uC6A9: ${tokenUsage.used.toLocaleString()} / \uC608\uC0B0: ${tokenUsage.budget.toLocaleString()} \uD1A0\uD070`,
                en: `Used: ${tokenUsage.used.toLocaleString()} / Budget: ${tokenUsage.budget.toLocaleString()} tokens`,
              })}
            </span>
          )}
        </div>
      )}
    </>
  );
});

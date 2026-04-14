"use client";

import React from "react";
import type { AppLanguage } from "@/lib/studio-types";

interface CanvasStepIndicatorProps {
  canvasPass: number;
  language: AppLanguage;
}

/**
 * 3-Step canvas progress indicator with emoji steps and connecting bars.
 */
export const CanvasStepIndicator = React.memo(function CanvasStepIndicator({
  canvasPass,
  language,
}: CanvasStepIndicatorProps) {
  const isKO = language === "KO";

  const steps = [
    { emoji: "\uD83E\uDDB4", label: isKO ? "\uBF08\uB300" : "Skeleton", desc: isKO ? "\uAD6C\uC870 \uC7A1\uAE30" : "Outline", pass: 0 },
    { emoji: "\uD83D\uDCDD", label: isKO ? "\uCD08\uC548" : "Draft", desc: isKO ? "\uC0B4 \uBD99\uC774\uAE30" : "Flesh out", pass: 1 },
    { emoji: "\u2728", label: isKO ? "\uB2E4\uB4EC\uAE30" : "Polish", desc: isKO ? "\uC644\uC131" : "Refine", pass: 2 },
  ];

  return (
    <div className="flex items-center gap-1 text-xs mb-4">
      {steps.map((step, i) => (
        <React.Fragment key={step.pass}>
          {i > 0 && (
            <div
              className={`flex-1 h-0.5 rounded-full transition-colors mx-1 ${
                canvasPass >= step.pass ? "bg-accent-green/50" : "bg-white/10"
              }`}
            />
          )}
          <div
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[64px] ${
              canvasPass > step.pass
                ? "bg-accent-green/20 text-accent-green"
                : canvasPass === step.pass
                  ? "bg-accent-green/30 text-accent-green ring-1 ring-accent-green/40 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                  : "bg-bg-secondary text-text-tertiary"
            }`}
          >
            <span className="text-base leading-none">{step.emoji}</span>
            <span className="font-bold text-[10px]">{step.label}</span>
            <span className="text-[8px] opacity-70">{step.desc}</span>
            {canvasPass > step.pass && <span className="text-[9px] text-accent-green">{"\u2713"}</span>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
});

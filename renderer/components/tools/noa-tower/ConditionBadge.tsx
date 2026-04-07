import React from "react";

const CONDITION_COLORS: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/30",
  warning: "text-amber-400 border-amber-400/30",
  distorted: "text-red-400 border-red-400/30",
  breakthrough: "text-cyan-400 border-cyan-400/30",
  collapse: "text-red-500 border-red-500/30",
  withdrew: "text-zinc-500 border-zinc-500/30",
};

export function ConditionBadge({ condition, label }: { condition: string; label: string }) {
  const color = CONDITION_COLORS[condition] ?? CONDITION_COLORS["active"];
  return (
    <span className={`inline-block rounded-full border px-3 py-1 font-[--font-mono] text-[12px] tracking-wider ${color}`}>
      {label}
    </span>
  );
}

// IDENTITY_SEAL: PART-7 | role=condition-badge | inputs=condition,label | outputs=JSX

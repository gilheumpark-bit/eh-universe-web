"use client";

import type { Lang } from "@/lib/LangContext";

// ============================================================
// PART 1 - TAG FILTER CHIPS
// ============================================================

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
  lang: Lang;
}

export function TagFilter({ availableTags, selectedTags, onToggle, onClear, lang }: TagFilterProps) {
  if (availableTags.length === 0) return null;

  const selectedSet = new Set(selectedTags);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
        {lang === "ko" ? "태그" : "Tags"}
      </span>
      {availableTags.slice(0, 20).map((tag) => {
        const active = selectedSet.has(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16 hover:text-text-primary"
            }`}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1 text-xs text-text-tertiary transition hover:border-accent-red/20 hover:text-accent-red"
        >
          {lang === "ko" ? "초기화" : "Clear"}
        </button>
      )}
    </div>
  );

  // IDENTITY_SEAL: PART-1 | role=tag filter chips | inputs=available and selected tags | outputs=interactive filter bar
}

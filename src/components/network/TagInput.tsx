"use client";

import { useCallback, useMemo, useState } from "react";
import type { Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 - PROPS AND AUTOCOMPLETE LOGIC
// ============================================================

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  maxTags?: number;
  lang: Lang;
  placeholder?: string;
}

export function TagInput({
  tags,
  onChange,
  availableTags = [],
  maxTags = 10,
  lang,
  placeholder,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || trimmed.length < 1) return [];
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    return availableTags
      .filter((t) => t.toLowerCase().includes(trimmed) && !tagSet.has(t.toLowerCase()))
      .slice(0, 8);
  }, [input, tags, availableTags]);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (tags.length >= maxTags) return;
      if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
      onChange([...tags, trimmed]);
      setInput("");
    },
    [tags, maxTags, onChange],
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(input);
    }
    if (event.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  // IDENTITY_SEAL: PART-1 | role=tag manipulation logic | inputs=user keyboard events | outputs=tag array mutations

  // ============================================================
  // PART 2 - RENDER
  // ============================================================

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-xs font-medium text-accent-amber"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-0.5 text-accent-amber/60 transition hover:text-accent-amber"
              aria-label={L4(lang, { ko: `${tag} 태그 제거`, en: `Remove tag ${tag}`, ja: `${tag} タグ 削除`, zh: `${tag} 标签 移除` })}
            >
              x
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder ?? L4(lang, { ko: "태그 입력 후 Enter", en: "Type tag, press Enter", ja: "タグを入力してEnter", zh: "输入标签后按 Enter" })}
            className="min-w-[120px] flex-1 bg-transparent text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 placeholder:text-text-tertiary"
          />
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-white/10 bg-surface-primary/95 p-1 backdrop-blur-md">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(suggestion)}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {tags.length >= maxTags && (
        <p className="mt-1 text-[11px] text-text-tertiary">
          {L4(lang, { ko: `최대 ${maxTags}개까지 가능합니다.`, en: `Maximum ${maxTags} tags allowed.`, ja: `最大${maxTags}件まで可能です。`, zh: `最多可添加${maxTags}个。` })}
        </p>
      )}
    </div>
  );

  // IDENTITY_SEAL: PART-2 | role=tag input renderer | inputs=tag state and suggestions | outputs=interactive tag chips
}

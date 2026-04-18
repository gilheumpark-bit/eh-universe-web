"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import React, { useEffect, useMemo, useState } from "react";
import { Hash } from "lucide-react";
import { pluginRegistry } from "@/lib/novel-plugin-registry";
import { logger } from "@/lib/logger";

export interface WordCountBadgeProps {
  /** Raw text to count (whitespace is stripped for the char metric). */
  text: string;
  /** Korean UI? Controls the trailing '자' vs 'ch' suffix. */
  isKO: boolean;
  /** Optional test id override so parents can scope multiple instances. */
  testId?: string;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=WordCountBadgeProps

// ============================================================
// PART 2 — Plugin enablement subscription (registry singleton aware)
// ============================================================

const PLUGIN_ID = "word-count-badge";

/**
 * Returns true while the word-count-badge plugin is enabled.
 * Re-reads on 'noa:plugin-toggled' and storage events so the badge
 * shows up without a full page reload after the user toggles it in
 * the Marketplace.
 */
function useWordCountEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return pluginRegistry.isEnabled(PLUGIN_ID); } catch (err) {
      logger.warn("WordCountBadge", "initial isEnabled failed", err);
      return false;
    }
  });
  useEffect(() => {
    const refresh = () => {
      try { setEnabled(pluginRegistry.isEnabled(PLUGIN_ID)); } catch (err) {
        logger.warn("WordCountBadge", "refresh isEnabled failed", err);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "noa_enabled_plugins") refresh();
    };
    window.addEventListener("noa:plugin-toggled", refresh);
    window.addEventListener("storage", onStorage);
    // Activation event emitted by the plugin itself.
    window.addEventListener("noa:plugin:word-count-badge:enabled", refresh);
    return () => {
      window.removeEventListener("noa:plugin-toggled", refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("noa:plugin:word-count-badge:enabled", refresh);
    };
  }, []);
  return enabled;
}

// IDENTITY_SEAL: PART-2 | role=Hook | inputs=none | outputs=enabled

// ============================================================
// PART 3 — Component (compact, status-bar friendly)
// ============================================================

/**
 * Inline char-count chip rendered when the `word-count-badge` plugin is on.
 * Returns null when disabled — zero DOM cost in the default path.
 */
export default function WordCountBadge({ text, isKO, testId = "word-count-badge" }: WordCountBadgeProps) {
  const enabled = useWordCountEnabled();
  const chars = useMemo(() => {
    const raw = text ?? "";
    // Strip whitespace the same way StudioStatusBar counts — stays consistent.
    return raw.replace(/\s/g, "").length;
  }, [text]);

  if (!enabled) return null;

  return (
    <span
      data-testid={testId}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/30 text-accent-purple font-bold"
      aria-label={isKO ? "플러그인 글자수" : "Plugin char count"}
    >
      <Hash className="w-2.5 h-2.5" />
      <span>{chars.toLocaleString()}{isKO ? "자" : "ch"}</span>
    </span>
  );
}

// IDENTITY_SEAL: PART-3 | role=Component | inputs=WordCountBadgeProps | outputs=WordCountBadge

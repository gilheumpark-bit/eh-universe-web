import type { RelationType, SigClass } from "./types";

const GENRE_TONE_CLASS: Record<string, string> = {
  Fantasy: "ws-tone-fantasy",
  SF: "ws-tone-sf",
  Romance: "ws-tone-romance",
  Thriller: "ws-tone-thriller",
  Horror: "ws-tone-horror",
  "System/Hunter": "ws-tone-system",
  "Fantasy Romance": "ws-tone-fantasy-romance",
};

const COLOR_TONE_CLASS: Record<string, string> = {
  "#e63946": "ws-tone-red-soft",
  "#457b9d": "ws-tone-steel",
  "#2a9d8f": "ws-tone-teal",
  "#e9c46a": "ws-tone-sand",
  "#f4a261": "ws-tone-orange-soft",
  "#264653": "ws-tone-ink",
  "#a855f7": "ws-tone-violet",
  "#06b6d4": "ws-tone-cyan",
  "#059669": "ws-tone-emerald",
  "#d97706": "ws-tone-amber-deep",
  "#1e40af": "ws-tone-blue-deep",
  "#6b7280": "ws-tone-gray",
  "#991b1b": "ws-tone-red-deep",
  "#16a34a": "ws-tone-green",
  "#6b46c1": "ws-tone-fantasy",
  "#2563eb": "ws-tone-sf",
  "#db2777": "ws-tone-romance",
  "#dc2626": "ws-tone-thriller",
  "#7c3aed": "ws-tone-horror",
  "#0891b2": "ws-tone-system",
  "#e11d48": "ws-tone-fantasy-romance",
  "#ef4444": "ws-tone-red",
  "#22c55e": "ws-tone-green-bright",
  "#eab308": "ws-tone-yellow",
  "#3b82f6": "ws-tone-blue",
  "#f97316": "ws-tone-orange",
  "#1f2937": "ws-tone-slate",
  "#38bdf8": "ws-tone-sky",
  "#a78bfa": "ws-tone-lavender",
  "#f87171": "ws-tone-salmon",
  "#34d399": "ws-tone-mint",
};

export const RELATION_TONE_CLASS: Record<RelationType, string> = {
  war: "ws-tone-red",
  alliance: "ws-tone-green-bright",
  trade: "ws-tone-yellow",
  vassal: "ws-tone-violet",
};

export const SIG_CLASS_TONE_CLASS: Record<SigClass, string> = {
  sustained: "ws-tone-sky",
  modulated: "ws-tone-lavender",
  percussive: "ws-tone-salmon",
  cyclic: "ws-tone-mint",
  silent: "ws-tone-gray",
};

export function genreToneClass(genre: string): string {
  return GENRE_TONE_CLASS[genre] ?? "ws-tone-neutral";
}

export function colorToneClass(color?: string | null): string {
  return COLOR_TONE_CLASS[color?.toLowerCase() ?? ""] ?? "ws-tone-neutral";
}

export function signalToneClass(sigClass: SigClass): string {
  return SIG_CLASS_TONE_CLASS[sigClass] ?? "ws-tone-neutral";
}

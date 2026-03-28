"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { L2, useLang } from "@/lib/LangContext";
import { addBookmark, isBookmarked, removeBookmark } from "@/lib/network-firestore";

// ============================================================
// PART 1 - LABELS
// ============================================================

const LABELS = {
  bookmark: { ko: "북마크", en: "Bookmark" },
  bookmarked: { ko: "북마크됨", en: "Bookmarked" },
  loginRequired: { ko: "로그인 후 북마크할 수 있습니다.", en: "Sign in to bookmark." },
} as const;

// IDENTITY_SEAL: PART-1 | role=bookmark labels | inputs=none | outputs=i18n labels

// ============================================================
// PART 2 - COMPONENT
// ============================================================

interface BookmarkButtonProps {
  planetId: string;
  compact?: boolean;
}

export function BookmarkButton({ planetId, compact }: BookmarkButtonProps) {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errShake, setErrShake] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const result = await isBookmarked(user.uid, planetId);
        if (!cancelled) setSaved(result);
      } catch {
        /* silent */
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [planetId, user]);

  const handleToggle = useCallback(async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      if (saved) {
        await removeBookmark(user.uid, planetId);
        setSaved(false);
      } else {
        await addBookmark(user.uid, planetId);
        setSaved(true);
      }
    } catch {
      setErrShake(true);
      setTimeout(() => setErrShake(false), 600);
    } finally {
      setLoading(false);
    }
  }, [loading, planetId, saved, signInWithGoogle, user]);

  const label = saved ? L2(LABELS.bookmarked, lang) : L2(LABELS.bookmark, lang);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleToggle()}
      title={label}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        errShake ? "animate-[shake_0.3s_ease-in-out_2] border-accent-red/40" :
        saved
          ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
          : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16"
      } disabled:opacity-40`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 2.5a1.5 1.5 0 00-1.5 1.5v13.25l6.5-4.5 6.5 4.5V4A1.5 1.5 0 0015 2.5H5z" />
      </svg>
      {compact ? null : <span>{label}</span>}
    </button>
  );
}

// IDENTITY_SEAL: PART-2 | role=bookmark toggle button | inputs=planetId | outputs=bookmark state toggle

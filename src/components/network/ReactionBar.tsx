"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { L2, useLang } from "@/lib/LangContext";
import { getReactions, toggleReaction } from "@/lib/network-firestore";
import { REACTION_EMOJI, REACTION_TYPES, type ReactionRecord, type ReactionType } from "@/lib/network-types";

// ============================================================
// PART 1 - LABELS
// ============================================================

const REACTION_LABELS: Record<ReactionType, { ko: string; en: string }> = {
  like: { ko: "좋아요", en: "Like" },
  fire: { ko: "뜨거운", en: "Hot" },
  insight: { ko: "통찰", en: "Insight" },
  touching: { ko: "감동", en: "Touching" },
  warning: { ko: "주의", en: "Warning" },
};

const LABELS = {
  loginRequired: { ko: "로그인 후 반응할 수 있습니다.", en: "Sign in to react." },
} as const;

// IDENTITY_SEAL: PART-1 | role=reaction labels | inputs=none | outputs=i18n labels

// ============================================================
// PART 2 - COMPONENT
// ============================================================

interface ReactionBarProps {
  targetType: "planet" | "post";
  targetId: string;
}

export function ReactionBar({ targetType, targetId }: ReactionBarProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const [reactions, setReactions] = useState<ReactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<ReactionType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const records = await getReactions(targetId);
        if (!cancelled) setReactions(records);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [targetId]);

  const handleToggle = useCallback(
    async (type: ReactionType) => {
      if (!user || toggling) return;
      try {
        setToggling(type);
        const added = await toggleReaction({ targetType, targetId, userId: user.uid, reactionType: type });

        setReactions((prev) => {
          if (added) {
            return [
              ...prev,
              {
                id: `${targetId}_${user.uid}_${type}`,
                targetType,
                targetId,
                userId: user.uid,
                reactionType: type,
                createdAt: new Date().toISOString(),
              },
            ];
          }
          return prev.filter((r) => !(r.userId === user.uid && r.reactionType === type));
        });
      } catch {
        /* silent */
      } finally {
        setToggling(null);
      }
    },
    [targetId, targetType, toggling, user],
  );

  const countByType = (type: ReactionType) => reactions.filter((r) => r.reactionType === type).length;
  const userHas = (type: ReactionType) => !!user && reactions.some((r) => r.userId === user.uid && r.reactionType === type);

  if (loading) return <div className="h-8 animate-pulse rounded bg-white/[0.02]" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTION_TYPES.map((type) => {
        const active = userHas(type);
        const count = countByType(type);
        return (
          <button
            key={type}
            type="button"
            disabled={!user || toggling === type}
            title={user ? L2(REACTION_LABELS[type], lang) : L2(LABELS.loginRequired, lang)}
            onClick={() => void handleToggle(type)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition ${
              active
                ? "border-accent-purple/30 bg-accent-purple/10 text-accent-purple"
                : "border-white/8 bg-white/[0.02] text-text-tertiary hover:border-white/16"
            } disabled:opacity-40`}
          >
            <span>{REACTION_EMOJI[type]}</span>
            {count > 0 ? <span>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=reaction bar UI | inputs=targetType, targetId | outputs=toggle buttons with counts

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { CommentSection } from "@/components/network/CommentSection";
import { ReactionBar } from "@/components/network/ReactionBar";
import { ReportButton } from "@/components/network/ReportButton";
import { SettlementBadge } from "@/components/network/SettlementBadge";
import { getNetworkUserRecord, getPlanetById, getPostById } from "@/lib/network-firestore";
import {
  BOARD_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";
import type { PlanetRecord, PostRecord, UserRecord } from "@/lib/network-types";

// ============================================================
// PART 1 - HELPERS
// ============================================================

function relativeTime(isoDate: string, lang: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return lang === "ko" ? "방금 전" : "Just now";
  if (minutes < 60) return lang === "ko" ? `${minutes}분 전` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ko" ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return lang === "ko" ? `${days}일 전` : `${days}d ago`;
  return new Date(isoDate).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US");
}

// IDENTITY_SEAL: PART-1 | role=helpers | inputs=iso date | outputs=relative time string

// ============================================================
// PART 2 - COMPONENT
// ============================================================

interface BoardPostDetailClientProps {
  postId: string;
}

export function BoardPostDetailClient({ postId }: BoardPostDetailClientProps) {
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<PostRecord | null>(null);
  const [author, setAuthor] = useState<UserRecord | null>(null);
  const [planet, setPlanet] = useState<PlanetRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const postRecord = await getPostById(postId);
        if (!postRecord) {
          throw new Error(lang === "ko" ? "게시글을 찾을 수 없습니다." : "Post not found.");
        }

        const [authorRecord, planetRecord] = await Promise.all([
          getNetworkUserRecord(postRecord.authorId),
          postRecord.planetId ? getPlanetById(postRecord.planetId) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setPost(postRecord);
          setAuthor(authorRecord);
          setPlanet(planetRecord);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : lang === "ko" ? "불러오기에 실패했습니다." : "Failed to load.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [lang, postId]);

  if (loading) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell space-y-6 py-8 md:py-10">
          <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
            &larr; NETWORK
          </Link>
          <div className="premium-panel-soft min-h-[400px] animate-pulse p-6" />
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell space-y-6 py-8 md:py-10">
          <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
            &larr; NETWORK
          </Link>
          <section className="premium-panel p-8 text-center">
            <p className="text-sm text-accent-red">{error ?? (lang === "ko" ? "게시글을 찾을 수 없습니다." : "Post not found.")}</p>
          </section>
        </div>
      </main>
    );
  }

  const isIfPost = post.boardType === "if";

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-6 py-8 md:py-10">
        <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
          &larr; NETWORK
        </Link>

        {/* Post header */}
        <article className="premium-panel p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge badge-amber">
              {pickNetworkLabel(REPORT_TYPE_LABELS[post.reportType], lang)}
            </span>
            <span
              className={
                isIfPost
                  ? "inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] font-semibold tracking-[0.12em] text-purple-300 uppercase"
                  : "badge badge-redacted"
              }
            >
              {isIfPost && <span className="text-[11px]" aria-hidden="true">IF</span>}
              {pickNetworkLabel(BOARD_TYPE_LABELS[post.boardType], lang)}
            </span>
            {post.followupStatus ? <SettlementBadge status={post.followupStatus} lang={lang} /> : null}
          </div>

          <h1 className={`mt-6 text-2xl font-semibold md:text-3xl ${isIfPost ? "text-purple-200" : "text-text-primary"}`}>
            {post.title}
          </h1>

          {/* Author and date */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-tertiary">
            <span className="font-medium text-text-secondary">{author?.nickname ?? `Explorer-${post.authorId.slice(0, 6)}`}</span>
            <span>{relativeTime(post.createdAt, lang)}</span>
            {planet ? (
              <Link href={`/network/planets/${planet.id}`} className="transition hover:text-accent-amber">
                {planet.name}
              </Link>
            ) : null}
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-0.5 text-[10px] text-text-tertiary">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Post body */}
          <div className="mt-8 text-sm leading-8 text-text-secondary whitespace-pre-line">
            {post.content}
          </div>

          {/* Metrics bar */}
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/8 pt-5 text-xs text-text-tertiary">
            <span>{lang === "ko" ? `조회 ${post.metrics.viewCount}` : `${post.metrics.viewCount} views`}</span>
            <span>{lang === "ko" ? `댓글 ${post.metrics.commentCount}` : `${post.metrics.commentCount} comments`}</span>
            <span>{lang === "ko" ? `반응 ${post.metrics.reactionCount}` : `${post.metrics.reactionCount} reactions`}</span>
          </div>
        </article>

        {/* Reactions */}
        <section className="premium-panel-soft p-5">
          <ReactionBar targetType="post" targetId={post.id} />
        </section>

        {/* Comments */}
        <section className="premium-panel-soft p-5">
          <CommentSection planetId={post.planetId || post.id} postId={post.id} />
        </section>

        {/* Report */}
        <div className="flex justify-end">
          <ReportButton targetType="post" targetId={post.id} />
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=post detail renderer | inputs=postId | outputs=full post view with reactions, comments, and report

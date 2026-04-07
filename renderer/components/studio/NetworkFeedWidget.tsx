"use client";

// ============================================================
// PART 1 — Network Feed Widget for Studio sidebar/modal
// Shows recent network posts relevant to the current project world
// ============================================================

import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import type { AppLanguage } from '@/lib/studio-types';
import { listLatestPosts } from '@/lib/network-firestore';
import type { PostRecord } from '@/lib/network-types';

interface Props {
  language: AppLanguage;
  /** Tags from the current project world to filter relevant posts */
  worldTags?: string[];
  /** Optional: current project title for matching */
  projectTitle?: string;
  onClose?: () => void;
  /** Compact mode for sidebar embedding (no close button, smaller) */
  compact?: boolean;
}

function relativeTime(isoDate: string, isKO: boolean): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return isKO ? '방금 전' : 'Just now';
  if (minutes < 60) return isKO ? `${minutes}분 전` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isKO ? `${hours}시간 전` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isKO ? `${days}일 전` : `${days}d ago`;
}

// IDENTITY_SEAL: PART-1 | role=network feed widget | inputs=language, world tags | outputs=recent posts feed UI

// ============================================================
// PART 2 — Component
// ============================================================

export default function NetworkFeedWidget({ language, worldTags, projectTitle, onClose, compact }: Props) {
  const isKO = language === 'KO';
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    setError(false);
    try {
      const allPosts = await listLatestPosts(20);

      // Filter by relevance: match any world tags or project title
      let relevant = allPosts;
      if (worldTags && worldTags.length > 0) {
        const tagSet = new Set(worldTags.map(t => t.toLowerCase()));
        const matched = allPosts.filter(p =>
          (p.tags ?? []).some(t => tagSet.has(t.toLowerCase())),
        );
        if (matched.length > 0) relevant = matched;
      }

      setPosts(relevant.slice(0, 8));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerClass = compact
    ? 'space-y-3'
    : 'bg-bg-primary border border-border rounded-2xl p-4 space-y-3';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-accent-amber" />
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
            {isKO ? '네트워크 피드' : 'Network Feed'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="p-1 text-text-tertiary hover:text-white transition"
            title={isKO ? '새로고침' : 'Refresh'}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!compact && onClose && (
            <button type="button" onClick={onClose} className="p-1 text-text-tertiary hover:text-white transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Relevance hint */}
      {worldTags && worldTags.length > 0 && (
        <div className="text-[9px] text-text-tertiary">
          {isKO
            ? `"${projectTitle || worldTags[0]}" 관련 게시물`
            : `Posts related to "${projectTitle || worldTags[0]}"`
          }
        </div>
      )}

      {/* Post list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[10px] text-text-tertiary text-center py-3">
          {isKO ? '피드를 불러올 수 없습니다.' : 'Could not load feed.'}
        </p>
      ) : posts.length === 0 ? (
        <p className="text-[10px] text-text-tertiary text-center py-3">
          {isKO ? '관련 게시물이 없습니다.' : 'No related posts.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {posts.map(post => (
            <li key={post.id}>
              <Link
                href={`/network/posts/${post.id}`}
                target="_blank"
                className="group flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-white/[0.04] transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-text-primary truncate group-hover:text-accent-amber transition">
                    {post.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] text-text-tertiary">#{tag}</span>
                    ))}
                    <span className="text-[9px] text-text-tertiary">{relativeTime(post.createdAt, isKO)}</span>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition mt-0.5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Footer link */}
      <div className="pt-1 border-t border-white/5">
        <Link
          href="/network"
          target="_blank"
          className="text-[9px] font-medium text-text-tertiary hover:text-accent-amber transition"
        >
          {isKO ? '네트워크 전체 보기 →' : 'View full Network →'}
        </Link>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=feed widget renderer | inputs=posts array, loading state | outputs=compact feed list UI

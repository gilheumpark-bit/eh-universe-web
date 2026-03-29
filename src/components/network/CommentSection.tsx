"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { L2, useLang } from "@/lib/LangContext";
import {
  addComment,
  deleteComment,
  listCommentsForPost,
  updateComment,
} from "@/lib/network-firestore";
import type { CommentRecord } from "@/lib/network-types";

// ============================================================
// PART 1 - LABELS AND SPAM GUARD
// ============================================================

const LABELS = {
  title: { ko: "댓글", en: "Comments" },
  placeholder: { ko: "댓글을 입력하세요 (10자 이상)", en: "Write a comment (min 10 chars)" },
  submit: { ko: "등록", en: "Submit" },
  edit: { ko: "수정", en: "Edit" },
  delete: { ko: "삭제", en: "Delete" },
  cancel: { ko: "취소", en: "Cancel" },
  save: { ko: "저장", en: "Save" },
  loginRequired: { ko: "댓글을 쓰려면 로그인하세요.", en: "Sign in to comment." },
  tooShort: { ko: "10자 이상 입력해주세요.", en: "Minimum 10 characters." },
  rateLimited: { ko: "잠시 후 다시 시도하세요.", en: "Please wait before posting again." },
  duplicate: { ko: "동일한 내용은 연속 등록할 수 없습니다.", en: "Duplicate content is not allowed." },
  noComments: { ko: "아직 댓글이 없습니다.", en: "No comments yet." },
  confirmDelete: { ko: "정말 삭제하시겠습니까?", en: "Delete this comment?" },
} as const;

const MIN_CONTENT_LENGTH = 10;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const DUPLICATE_WINDOW_MS = 60_000;

interface SpamGuardState {
  timestamps: number[];
  lastContent: string;
  lastContentAt: number;
}

function checkSpamGuard(guard: SpamGuardState, content: string): string | null {
  const now = Date.now();
  const recentTimestamps = guard.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recentTimestamps.length >= RATE_LIMIT_MAX) return "rateLimited";
  if (guard.lastContent === content && now - guard.lastContentAt < DUPLICATE_WINDOW_MS) return "duplicate";
  return null;
}

// IDENTITY_SEAL: PART-1 | role=labels and spam prevention | inputs=content and timestamps | outputs=validation result

// ============================================================
// PART 2 - COMPONENT
// ============================================================

interface CommentSectionProps {
  planetId: string;
  postId: string;
}

export function CommentSection({ planetId, postId }: CommentSectionProps) {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const spamRef = useRef<SpamGuardState>({ timestamps: [], lastContent: "", lastContentAt: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const records = await listCommentsForPost(postId);
      setComments(records);
    } catch {
      setError(lang === "ko" ? "댓글을 불러오지 못했습니다." : "Failed to load comments.");
    } finally {
      setLoading(false);
    }
  }, [postId, lang]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    const trimmed = draft.trim();
    if (trimmed.length < MIN_CONTENT_LENGTH) {
      setError(L2(LABELS.tooShort, lang));
      return;
    }

    const spamResult = checkSpamGuard(spamRef.current, trimmed);
    if (spamResult) {
      setError(L2(LABELS[spamResult as "rateLimited" | "duplicate"], lang));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const record = await addComment({
        postId,
        planetId,
        authorId: user.uid,
        authorName: user.displayName ?? `Explorer-${user.uid.slice(0, 6)}`,
        authorPhoto: user.photoURL ?? undefined,
        content: trimmed,
      });

      const now = Date.now();
      spamRef.current = {
        timestamps: [...spamRef.current.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS), now],
        lastContent: trimmed,
        lastContentAt: now,
      };

      setComments((prev) => [record, ...prev]);
      setDraft("");
      setSuccessMsg(lang === "ko" ? "댓글이 등록되었습니다" : "Comment posted");
      setTimeout(() => setSuccessMsg(null), 2500);
      // scroll to bottom after state update
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError(lang === "ko" ? "등록에 실패했습니다." : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }, [draft, lang, planetId, postId, user]);

  const handleUpdate = useCallback(
    async (commentId: string) => {
      const trimmed = editDraft.trim();
      if (trimmed.length < MIN_CONTENT_LENGTH) {
        setError(L2(LABELS.tooShort, lang));
        return;
      }
      try {
        setSubmitting(true);
        setError(null);
        await updateComment(commentId, trimmed, user!.uid);
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: trimmed, updatedAt: new Date().toISOString() } : c)),
        );
        setEditingId(null);
        setEditDraft("");
      } catch {
        setError(lang === "ko" ? "수정에 실패했습니다." : "Failed to update.");
      } finally {
        setSubmitting(false);
      }
    },
    [editDraft, lang],
  );

  const handleDelete = useCallback(
    async (comment: CommentRecord) => {
      if (!window.confirm(L2(LABELS.confirmDelete, lang))) return;
      try {
        await deleteComment(comment.id, comment.postId, user!.uid);
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      } catch {
        setError(lang === "ko" ? "삭제에 실패했습니다." : "Failed to delete comment.");
      }
    },
    [lang],
  );

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments],
  );

  return (
    <section className="space-y-4">
      <h3 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple">
        {L2(LABELS.title, lang)} ({comments.length})
      </h3>

      {successMsg && (
        <p className="text-xs text-accent-green">{successMsg}</p>
      )}

      {user ? (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded-lg border border-white/8 bg-white/[0.02] p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-purple/40 focus:outline-none"
            rows={3}
            maxLength={2000}
            placeholder={L2(LABELS.placeholder, lang)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{draft.length}/2000</div>
          <div className="flex items-center justify-between gap-3">
            {error ? <span className="text-xs text-accent-red">{error}</span> : <span />}
            <button
              type="button"
              disabled={submitting || draft.trim().length < MIN_CONTENT_LENGTH}
              onClick={() => void handleSubmit()}
              className="rounded-lg bg-accent-purple/20 px-4 py-2 text-xs font-medium text-accent-purple transition hover:bg-accent-purple/30 disabled:opacity-40"
            >
              {L2(LABELS.submit, lang)}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-text-tertiary">{L2(LABELS.loginRequired, lang)}</p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-lg bg-accent-purple/20 px-3 py-1.5 text-xs font-medium text-accent-purple transition hover:bg-accent-purple/30"
          >
            Google {lang === "ko" ? "로그인" : "Sign In"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="premium-panel-soft min-h-[60px] animate-pulse p-4" />
      ) : sortedComments.length === 0 ? (
        <p className="text-sm text-text-tertiary">{L2(LABELS.noComments, lang)}</p>
      ) : (
        <div className="space-y-3">
          {sortedComments.map((comment, idx) => (
            <div key={comment.id} className="premium-panel-soft p-4">
              <div className="flex items-center gap-2">
                {comment.authorPhoto ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- external user avatar URL */
                  <img src={comment.authorPhoto} alt={`${comment.authorName} 프로필`} className="h-5 w-5 rounded-full" />
                ) : null}
                <span className="text-xs font-medium text-text-primary">{comment.authorName}</span>
                <span className="text-xs text-text-tertiary">
                  {new Date(comment.createdAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}
                </span>
                {comment.updatedAt && comment.updatedAt !== comment.createdAt ? (
                  <span className="text-xs text-text-tertiary">({lang === "ko" ? "수정됨" : "edited"})</span>
                ) : null}
              </div>

              {editingId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full resize-none rounded-lg border border-white/8 bg-white/[0.02] p-2 text-sm text-text-primary focus:border-accent-purple/40 focus:outline-none"
                    rows={2}
                    maxLength={2000}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleUpdate(comment.id)}
                      className="rounded bg-accent-purple/20 px-3 py-1 text-xs text-accent-purple"
                    >
                      {L2(LABELS.save, lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setEditDraft(""); setError(null); }}
                      className="rounded bg-white/5 px-3 py-1 text-xs text-text-secondary"
                    >
                      {L2(LABELS.cancel, lang)}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{comment.content}</p>
              )}

              {user?.uid === comment.authorId && editingId !== comment.id ? (
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditingId(comment.id); setEditDraft(comment.content); setError(null); }}
                    className="text-xs text-text-tertiary hover:text-accent-purple"
                  >
                    {L2(LABELS.edit, lang)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(comment)}
                    className="text-xs text-text-tertiary hover:text-accent-red"
                  >
                    {L2(LABELS.delete, lang)}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}

// IDENTITY_SEAL: PART-2 | role=comment section UI | inputs=planetId, postId | outputs=comment list with CRUD

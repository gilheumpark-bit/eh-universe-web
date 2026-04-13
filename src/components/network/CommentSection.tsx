"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import { type Lang, L2, useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
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
  replyPlaceholder: { ko: "답글을 입력하세요 (10자 이상)", en: "Write a reply (min 10 chars)" },
  submit: { ko: "등록", en: "Submit" },
  edit: { ko: "수정", en: "Edit" },
  delete: { ko: "삭제", en: "Delete" },
  cancel: { ko: "취소", en: "Cancel" },
  save: { ko: "저장", en: "Save" },
  reply: { ko: "답글", en: "Reply" },
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
const MAX_THREAD_DEPTH = 3;

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
// PART 2 - THREADING HELPERS
// ============================================================

/** Build a map of parentId -> child comments, sorted by createdAt ascending */
function buildChildrenMap(comments: CommentRecord[]): Map<string, CommentRecord[]> {
  const map = new Map<string, CommentRecord[]>();
  for (const c of comments) {
    const pid = c.parentId ?? "__root__";
    const list = map.get(pid);
    if (list) {
      list.push(c);
    } else {
      map.set(pid, [c]);
    }
  }
  // Sort each group by createdAt ascending
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}

/**
 * Resolve the effective depth for a reply target.
 * If the target is already at MAX_THREAD_DEPTH - 1, the reply attaches to
 * the same parent so we don't exceed the limit.
 */
function resolveReplyParentId(
  targetId: string,
  targetDepth: number,
  targetParentId: string | undefined,
): string {
  if (targetDepth >= MAX_THREAD_DEPTH - 1) {
    // Collapse: attach to the same parent as the target instead of going deeper
    return targetParentId ?? targetId;
  }
  return targetId;
}

// IDENTITY_SEAL: PART-2 | role=thread tree builder | inputs=flat comments | outputs=parentId->children map

// ============================================================
// PART 3 - COMMENT THREAD COMPONENT
// ============================================================

interface CommentThreadProps {
  comment: CommentRecord;
  depth: number;
  childrenMap: Map<string, CommentRecord[]>;
  lang: Lang;
  user: { uid: string; displayName: string | null; photoURL: string | null } | null;
  editingId: string | null;
  editDraft: string;
  replyingTo: string | null;
  replyDraft: string;
  submitting: boolean;
  onStartEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditDraftChange: (val: string) => void;
  onDelete: (comment: CommentRecord) => void;
  onStartReply: (id: string, depth: number, parentId?: string) => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onReplyDraftChange: (val: string) => void;
}

function CommentThread({
  comment,
  depth,
  childrenMap,
  lang,
  user,
  editingId,
  editDraft,
  replyingTo,
  replyDraft,
  submitting,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
  onDelete,
  onStartReply,
  onCancelReply,
  onSubmitReply,
  onReplyDraftChange,
}: CommentThreadProps) {
  const children = childrenMap.get(comment.id) ?? [];
  // Tailwind doesn't support dynamic class generation, use style for indent
  const indentPx = depth * 24; // 6 * 4px = 24px per level

  return (
    <div style={depth > 0 ? { marginLeft: `${indentPx}px` } : undefined}>
      <div className="premium-panel-soft p-4">
        {/* Author row */}
        <div className="flex items-center gap-2">
          {comment.authorPhoto ? (
            <Image
              src={comment.authorPhoto}
              alt={`${comment.authorName} 프로필`}
              width={20}
              height={20}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : null}
          <span className="text-xs font-medium text-text-primary">{comment.authorName}</span>
          <span className="text-xs text-text-tertiary">
            {new Date(comment.createdAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}
          </span>
          {comment.updatedAt && comment.updatedAt !== comment.createdAt ? (
            <span className="text-xs text-text-tertiary">({L4(lang, { ko: "수정됨", en: "edited" })})</span>
          ) : null}
        </div>

        {/* Edit mode */}
        {editingId === comment.id ? (
          <div className="mt-2 space-y-2">
            <textarea
              className="w-full resize-none rounded-lg border border-white/8 bg-white/2 p-2 text-sm text-text-primary focus:border-accent-purple/40 focus:outline-none"
              rows={2}
              maxLength={2000}
              value={editDraft}
              onChange={(e) => onEditDraftChange(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => onSaveEdit(comment.id)}
                className="rounded bg-accent-purple/20 px-3 py-1 text-xs text-accent-purple"
              >
                {L2(LABELS.save, lang)}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded bg-white/5 px-3 py-1 text-xs text-text-secondary"
              >
                {L2(LABELS.cancel, lang)}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{comment.content}</p>
        )}

        {/* Action buttons */}
        {editingId !== comment.id ? (
          <div className="mt-2 flex gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => onStartReply(comment.id, depth, comment.parentId)}
                className="text-xs text-text-tertiary hover:text-accent-purple"
              >
                {L2(LABELS.reply, lang)}
              </button>
            ) : null}
            {user?.uid === comment.authorId ? (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(comment.id, comment.content)}
                  className="text-xs text-text-tertiary hover:text-accent-purple"
                >
                  {L2(LABELS.edit, lang)}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment)}
                  className="text-xs text-text-tertiary hover:text-accent-red"
                >
                  {L2(LABELS.delete, lang)}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Inline reply form */}
        {replyingTo === comment.id && user ? (
          <div className="mt-3 space-y-2 border-l-2 border-accent-purple/20 pl-3">
            <textarea
              className="w-full resize-none rounded-lg border border-white/8 bg-white/2 p-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-purple/40 focus:outline-none"
              rows={2}
              maxLength={2000}
              placeholder={L2(LABELS.replyPlaceholder, lang)}
              value={replyDraft}
              onChange={(e) => onReplyDraftChange(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting || replyDraft.trim().length < MIN_CONTENT_LENGTH}
                onClick={onSubmitReply}
                className="rounded bg-accent-purple/20 px-3 py-1 text-xs text-accent-purple disabled:opacity-40"
              >
                {L2(LABELS.reply, lang)}
              </button>
              <button
                type="button"
                onClick={onCancelReply}
                className="rounded bg-white/5 px-3 py-1 text-xs text-text-secondary"
              >
                {L2(LABELS.cancel, lang)}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recursive children */}
      {children.length > 0 ? (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <CommentThread
              key={child.id}
              comment={child}
              depth={Math.min(depth + 1, MAX_THREAD_DEPTH - 1)}
              childrenMap={childrenMap}
              lang={lang}
              user={user}
              editingId={editingId}
              editDraft={editDraft}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              submitting={submitting}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onEditDraftChange={onEditDraftChange}
              onDelete={onDelete}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              onReplyDraftChange={onReplyDraftChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=recursive thread renderer | inputs=comment+depth+childrenMap | outputs=nested comment UI

// ============================================================
// PART 4 - MAIN COMPONENT
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
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
      setError(L4(lang, { ko: "댓글을 불러오지 못했습니다.", en: "Failed to load comments." }));
    } finally {
      setLoading(false);
    }
  }, [postId, lang]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  // ---- Top-level comment submit ----
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
      setSuccessMsg(L4(lang, { ko: "댓글이 등록되었습니다", en: "Comment posted" }));
      setTimeout(() => setSuccessMsg(null), 2500);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError(L4(lang, { ko: "등록에 실패했습니다.", en: "Failed to post comment." }));
    } finally {
      setSubmitting(false);
    }
  }, [draft, lang, planetId, postId, user]);

  // ---- Reply submit ----
  const handleReplySubmit = useCallback(async () => {
    if (!user || !replyParentId) return;
    const trimmed = replyDraft.trim();
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
        parentId: replyParentId,
      });

      const now = Date.now();
      spamRef.current = {
        timestamps: [...spamRef.current.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS), now],
        lastContent: trimmed,
        lastContentAt: now,
      };

      setComments((prev) => [record, ...prev]);
      setReplyingTo(null);
      setReplyParentId(null);
      setReplyDraft("");
      setSuccessMsg(L4(lang, { ko: "답글이 등록되었습니다", en: "Reply posted" }));
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch {
      setError(L4(lang, { ko: "등록에 실패했습니다.", en: "Failed to post reply." }));
    } finally {
      setSubmitting(false);
    }
  }, [replyDraft, replyParentId, lang, planetId, postId, user]);

  // ---- Edit / Delete ----
  const handleUpdate = useCallback(
    async (commentId: string) => {
      const trimmed = editDraft.trim();
      if (trimmed.length < MIN_CONTENT_LENGTH) {
        setError(L2(LABELS.tooShort, lang));
        return;
      }
      try {
        if (!user) return;
        setSubmitting(true);
        setError(null);
        await updateComment(commentId, trimmed, user.uid);
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: trimmed, updatedAt: new Date().toISOString() } : c)),
        );
        setEditingId(null);
        setEditDraft("");
      } catch {
        setError(L4(lang, { ko: "수정에 실패했습니다.", en: "Failed to update." }));
      } finally {
        setSubmitting(false);
      }
    },
    [editDraft, lang, user],
  );

  const handleDelete = useCallback(
    async (comment: CommentRecord) => {
      if (!user) return;
      if (!window.confirm(L2(LABELS.confirmDelete, lang))) return;
      try {
        await deleteComment(comment.id, comment.postId, user.uid);
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      } catch {
        setError(L4(lang, { ko: "삭제에 실패했습니다.", en: "Failed to delete comment." }));
      }
    },
    [lang, user],
  );

  // ---- Reply callbacks ----
  const handleStartReply = useCallback(
    (targetId: string, targetDepth: number, targetParentId?: string) => {
      const effectiveParentId = resolveReplyParentId(targetId, targetDepth, targetParentId);
      setReplyingTo(targetId);
      setReplyParentId(effectiveParentId);
      setReplyDraft("");
      setError(null);
    },
    [],
  );

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyParentId(null);
    setReplyDraft("");
  }, []);

  // ---- Build thread tree ----
  const childrenMap = useMemo(() => buildChildrenMap(comments), [comments]);
  const rootComments = useMemo(
    () => (childrenMap.get("__root__") ?? []),
    [childrenMap],
  );

  return (
    <section className="space-y-4">
      <h3 className="font-[--font-mono] text-[10px] uppercase tracking-[0.2em] text-accent-purple">
        {L2(LABELS.title, lang)} ({comments.length})
      </h3>

      {successMsg && (
        <p className="text-xs text-accent-green">{successMsg}</p>
      )}

      {user ? (
        <div className="space-y-2">
          <textarea
            className="w-full resize-none rounded-lg border border-white/8 bg-white/2 p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-purple/40 focus:outline-none"
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
            {L4(lang, { ko: "Google 로그인", en: "Google Sign In" })}
          </button>
        </div>
      )}

      {loading ? (
        <div className="premium-panel-soft min-h-[60px] animate-pulse p-4" />
      ) : rootComments.length === 0 ? (
        <p className="text-sm text-text-tertiary">{L2(LABELS.noComments, lang)}</p>
      ) : (
        <div className="space-y-3">
          {rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              depth={0}
              childrenMap={childrenMap}
              lang={lang}
              user={user}
              editingId={editingId}
              editDraft={editDraft}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              submitting={submitting}
              onStartEdit={(id, content) => { setEditingId(id); setEditDraft(content); setError(null); }}
              onCancelEdit={() => { setEditingId(null); setEditDraft(""); setError(null); }}
              onSaveEdit={(id) => void handleUpdate(id)}
              onEditDraftChange={setEditDraft}
              onDelete={(c) => void handleDelete(c)}
              onStartReply={handleStartReply}
              onCancelReply={handleCancelReply}
              onSubmitReply={() => void handleReplySubmit()}
              onReplyDraftChange={setReplyDraft}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </section>
  );
}

// IDENTITY_SEAL: PART-4 | role=comment section with threading | inputs=planetId, postId | outputs=threaded comment list with CRUD + reply

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { L2, useLang } from "@/lib/LangContext";
import { TagInput } from "@/components/network/TagInput";
import {
  createBoardPost,
  ensureNetworkUserRecord,
  getAllUniqueTags,
  listPlanetsByOwner,
} from "@/lib/network-firestore";
import { BOARD_TYPE_LABELS, pickNetworkLabel } from "@/lib/network-labels";
import { BOARD_TYPES, type BoardType, type PlanetRecord } from "@/lib/network-types";

// ============================================================
// PART 1 - LABELS AND CONSTANTS
// ============================================================

const LABELS = {
  pageKicker: { ko: "게시글 작성", en: "Write Post" },
  pageTitle: { ko: "네트워크에 새 글을 작성합니다.", en: "Write a new post to the Network." },
  boardType: { ko: "게시판 유형", en: "Board Type" },
  title: { ko: "제목", en: "Title" },
  titlePlaceholder: { ko: "제목을 입력하세요", en: "Enter a title" },
  content: { ko: "본문", en: "Content" },
  contentPlaceholder: { ko: "본문을 작성하세요 (마크다운 가능)", en: "Write your content (markdown supported)" },
  tags: { ko: "태그", en: "Tags" },
  planet: { ko: "연결 행성 (선택)", en: "Linked Planet (optional)" },
  planetNone: { ko: "없음", en: "None" },
  submit: { ko: "게시하기", en: "Publish" },
  submitting: { ko: "저장 중...", en: "Saving..." },
  preview: { ko: "미리보기", en: "Preview" },
  edit: { ko: "편집", en: "Edit" },
  loginRequired: { ko: "로그인이 필요합니다.", en: "Sign in required." },
  loginButton: { ko: "Google 로그인", en: "Sign In with Google" },
  titleRequired: { ko: "제목을 입력해주세요.", en: "Title is required." },
  contentRequired: { ko: "본문을 입력해주세요.", en: "Content is required." },
} as const;

const WRITABLE_BOARD_TYPES: BoardType[] = BOARD_TYPES.filter((bt) => bt !== "notice");

// IDENTITY_SEAL: PART-1 | role=labels and constants | inputs=none | outputs=i18n labels and board types

// ============================================================
// PART 2 - COMPONENT
// ============================================================

export function BoardPostNewClient() {
  const router = useRouter();
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();

  const [boardType, setBoardType] = useState<BoardType>("log");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [planetId, setPlanetId] = useState("");
  const [planets, setPlanets] = useState<PlanetRecord[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [ownedPlanets, tagList] = await Promise.all([
          listPlanetsByOwner(user.uid),
          getAllUniqueTags(50),
        ]);
        if (!cancelled) {
          setPlanets(ownedPlanets);
          setAvailableTags(tagList);
        }
      } catch {
        /* silent */
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError(L2(LABELS.titleRequired, lang));
      return;
    }
    if (!trimmedContent) {
      setError(L2(LABELS.contentRequired, lang));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await ensureNetworkUserRecord({ uid: user.uid, displayName: user.displayName });

      const post = await createBoardPost({
        authorId: user.uid,
        boardType,
        title: trimmedTitle,
        content: trimmedContent,
        tags,
        planetId: planetId || undefined,
      });

      router.push(`/network/posts/${post.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : lang === "ko" ? "저장에 실패했습니다." : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }, [boardType, content, lang, planetId, router, tags, title, user]);

  if (!user) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
            &larr; NETWORK
          </Link>
          <section className="premium-panel mt-6 p-8 text-center">
            <div className="site-kicker">{L2(LABELS.loginRequired, lang)}</div>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => void signInWithGoogle()} className="premium-button">
                {L2(LABELS.loginButton, lang)}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-6 py-8 md:py-10">
        <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
          &larr; NETWORK
        </Link>

        <section className="premium-panel p-6 md:p-8">
          <div className="site-kicker">{L2(LABELS.pageKicker, lang)}</div>
          <h1 className="site-title mt-3 text-3xl font-semibold">{L2(LABELS.pageTitle, lang)}</h1>

          <div className="mt-8 grid gap-5">
            {/* Board type selector */}
            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{L2(LABELS.boardType, lang)}</div>
              <select
                value={boardType}
                onChange={(e) => setBoardType(e.target.value as BoardType)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
              >
                {WRITABLE_BOARD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {pickNetworkLabel(BOARD_TYPE_LABELS[bt], lang)}
                  </option>
                ))}
              </select>
            </label>

            {/* Title input */}
            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{L2(LABELS.title, lang)}</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder={L2(LABELS.titlePlaceholder, lang)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-amber/40"
              />
            </label>

            {/* Content textarea / Preview toggle */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-text-secondary">{L2(LABELS.content, lang)}</span>
                <button
                  type="button"
                  onClick={() => setShowPreview((prev) => !prev)}
                  className="text-xs text-text-tertiary transition hover:text-accent-amber"
                >
                  {showPreview ? L2(LABELS.edit, lang) : L2(LABELS.preview, lang)}
                </button>
              </div>
              {showPreview ? (
                <div className="min-h-[240px] rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-text-secondary whitespace-pre-line">
                  {content || (lang === "ko" ? "(내용 없음)" : "(empty)")}
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={10000}
                  placeholder={L2(LABELS.contentPlaceholder, lang)}
                  className="min-h-[240px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent-amber/40"
                />
              )}
              <div className="mt-1 text-right text-[11px] text-text-tertiary">{content.length}/10000</div>
            </div>

            {/* Tag input */}
            <div>
              <div className="mb-2 text-sm text-text-secondary">{L2(LABELS.tags, lang)}</div>
              <TagInput
                tags={tags}
                onChange={setTags}
                availableTags={availableTags}
                maxTags={8}
                lang={lang}
              />
            </div>

            {/* Planet selector (optional) */}
            {planets.length > 0 && (
              <label className="block">
                <div className="mb-2 text-sm text-text-secondary">{L2(LABELS.planet, lang)}</div>
                <select
                  value={planetId}
                  onChange={(e) => setPlanetId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
                >
                  <option value="">{L2(LABELS.planetNone, lang)}</option>
                  {planets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {error ? <p className="mt-5 text-sm text-accent-red">{error}</p> : null}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="premium-button"
            >
              {submitting ? L2(LABELS.submitting, lang) : L2(LABELS.submit, lang)}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=board post creation form | inputs=auth state, board type, title, content, tags | outputs=new post creation UI

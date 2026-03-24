"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import {
  getAllUniqueTags,
  getNetworkUserRecord,
  getPlanetsByIds,
  listBookmarks,
  listLatestPlanets,
  listLatestPosts,
  listLatestSettlements,
} from "@/lib/network-firestore";
import type {
  BoardType,
  BookmarkRecord,
  PlanetRecord,
  PostRecord,
  SettlementRecord,
  UserRecord,
} from "@/lib/network-types";
import { BOARD_TYPES } from "@/lib/network-types";
import { BookmarkButton } from "@/components/network/BookmarkButton";
import {
  BOARD_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";
import { SettlementBadge } from "@/components/network/SettlementBadge";
import { TagFilter } from "@/components/network/TagFilter";

// ============================================================
// PART 1 - TYPES, HELPERS, AND DATA LOADING
// ============================================================

interface DashboardState {
  planets: PlanetRecord[];
  posts: PostRecord[];
  settlements: SettlementRecord[];
  planetMap: Record<string, PlanetRecord>;
  authorMap: Record<string, UserRecord>;
  allTags: string[];
}

type BoardFilter = "all" | BoardType;

const BOARD_FILTER_LABELS: Record<"all", { ko: string; en: string }> = {
  all: { ko: "전체", en: "All" },
};

const SAMPLE_PLANETS = [
  {
    id: "sample-1",
    genre: "Sci-Fi",
    name: { ko: "아르카디아-7", en: "Arcadia-7" },
    summary: {
      ko: "GREEN 구역 외곽에 위치한 자원 행성. 최근 미확인 에너지 파동이 감지되었습니다.",
      en: "A resource planet on the edge of the GREEN zone. Unidentified energy waves recently detected.",
    },
    tags: ["GREEN", "Resource", "Anomaly"],
  },
  {
    id: "sample-2",
    genre: "Military",
    name: { ko: "요새 헬리오스", en: "Fortress Helios" },
    summary: {
      ko: "BLUE 구역 방어선의 핵심 거점. 3개 함대가 주둔 중입니다.",
      en: "A key stronghold on the BLUE zone defense line. Three fleets are stationed here.",
    },
    tags: ["BLUE", "Defense", "Fleet"],
  },
  {
    id: "sample-3",
    genre: "Exploration",
    name: { ko: "네뷸라 드리프트", en: "Nebula Drift" },
    summary: {
      ko: "YELLOW 구역 미탐사 성운 지대. 탐사 허가 대기 중입니다.",
      en: "An unexplored nebula zone in the YELLOW sector. Awaiting exploration clearance.",
    },
    tags: ["YELLOW", "Nebula", "Uncharted"],
  },
];

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

export function NetworkHomeClient() {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>({
    planets: [],
    posts: [],
    settlements: [],
    planetMap: {},
    authorMap: {},
    allTags: [],
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [planets, posts, settlements, bookmarks, allTags] = await Promise.all([
          listLatestPlanets(6),
          listLatestPosts(30),
          listLatestSettlements(6),
          user ? listBookmarks(user.uid) : Promise.resolve([] as BookmarkRecord[]),
          getAllUniqueTags(50),
        ]);

        const planetIds = [
          ...planets.map((planet) => planet.id),
          ...posts.map((post) => post.planetId).filter(Boolean),
          ...settlements.map((settlement) => settlement.planetId),
        ];
        const planetMap = await getPlanetsByIds(planetIds);

        const uniqueAuthorIds = Array.from(new Set(posts.map((p) => p.authorId)));
        const authorEntries = await Promise.all(
          uniqueAuthorIds.map(async (uid) => {
            const record = await getNetworkUserRecord(uid);
            return [uid, record] as const;
          }),
        );
        const authorMap: Record<string, UserRecord> = {};
        for (const [uid, record] of authorEntries) {
          if (record) authorMap[uid] = record;
        }

        if (!cancelled) {
          setState({ planets, posts, settlements, planetMap, authorMap, allTags });
          setBookmarkedIds(new Set(bookmarks.map((b) => b.planetId)));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : lang === "ko" ? "불러오기에 실패했습니다." : "Failed to load.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [lang, user]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleTagClear = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const boardTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of state.posts) {
      counts[post.boardType] = (counts[post.boardType] ?? 0) + 1;
    }
    return counts;
  }, [state.posts]);

  const filteredPosts = useMemo(() => {
    let posts = state.posts;
    if (boardFilter !== "all") {
      posts = posts.filter((p) => p.boardType === boardFilter);
    }
    if (selectedTags.length > 0) {
      const tagSet = new Set(selectedTags.map((t) => t.toLowerCase()));
      posts = posts.filter((p) =>
        (p.tags ?? []).some((t) => tagSet.has(t.toLowerCase())),
      );
    }
    return posts.slice(0, 12);
  }, [state.posts, boardFilter, selectedTags]);

  const filteredPlanets = useMemo(() => {
    let planets = state.planets;
    if (showBookmarksOnly) {
      planets = planets.filter((p) => bookmarkedIds.has(p.id));
    }
    if (selectedTags.length > 0) {
      const tagSet = new Set(selectedTags.map((t) => t.toLowerCase()));
      planets = planets.filter((p) =>
        [...(p.representativeTags ?? []), ...(p.tags ?? [])].some((t) => tagSet.has(t.toLowerCase())),
      );
    }
    return planets;
  }, [state.planets, showBookmarksOnly, bookmarkedIds, selectedTags]);

  // IDENTITY_SEAL: PART-1 | role=dashboard data loader and filters | inputs=language, firestore state, filter state | outputs=filtered records

  // ============================================================
  // PART 2 - RENDER
  // ============================================================

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-8 py-8 md:space-y-10 md:py-10">
        <Link
          href="/"
          className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary hover:text-accent-amber transition-colors"
        >
          &larr; HOME
        </Link>
        <section className="premium-panel p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="site-kicker">NMF — Narrative Management Foundation</div>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-text-tertiary">
                {lang === "ko" ? "기록하라. 관리하라. 정산하라." : "Narrate. Manage. Finalize."}
              </p>
              <h1 className="site-title mt-3 text-4xl font-semibold md:text-5xl">
                {lang === "ko"
                  ? "행성을 만들고, 첫 로그를 남기고, 정산으로 세계를 쌓아가세요."
                  : "Register planets, publish first logs, and grow a world through settlement records."}
              </h1>
              <p className="site-lede mt-4 max-w-2xl text-sm md:text-base">
                {lang === "ko"
                  ? "EH Network는 행성 등록소, 관측 로그, 정산 결과를 한 흐름으로 묶는 세계관 게시판입니다."
                  : "EH Network links planet registry, observation logs, and settlement outcomes into one narrative board."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/network/new" className="premium-button">
                {lang === "ko" ? "행성 등록하기" : "Register a Planet"}
              </Link>
              <Link href="/network/posts/new" className="premium-button secondary">
                {lang === "ko" ? "글쓰기" : "Write Post"}
              </Link>
              {!user ? (
                <button type="button" onClick={() => void signInWithGoogle()} className="premium-button secondary">
                  {lang === "ko" ? "Google 로그인" : "Sign In with Google"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: lang === "ko" ? "행성 등록소" : "Planet Registry",
                body: lang === "ko" ? "세계관 허브와 운영 목표를 등록합니다." : "Register the world hub and operating goal.",
              },
              {
                title: lang === "ko" ? "관측 로그" : "Observation Logs",
                body: lang === "ko" ? "이야기, 보고서, 회수문서를 같은 흐름에 쌓습니다." : "Stack stories, reports, and recovered files in one stream.",
              },
              {
                title: lang === "ko" ? "정산 결과" : "Settlement Results",
                body: lang === "ko" ? "행성 상태 판정과 위험도 기록을 운영 축으로 남깁니다." : "Track verdicts and risk changes as the operational layer.",
              },
            ].map((item) => (
              <div key={item.title} className="premium-panel-soft p-5">
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber">
                  {item.title}
                </div>
                <p className="mt-3 text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Board Type Filter Tabs with counts */}
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setBoardFilter("all"); document.getElementById("board-posts")?.scrollIntoView({ behavior: "smooth" }); }}
              className={`rounded-full border px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.14em] transition ${
                boardFilter === "all"
                  ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                  : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16 hover:text-text-primary"
              }`}
            >
              {lang === "ko" ? BOARD_FILTER_LABELS.all.ko : BOARD_FILTER_LABELS.all.en}
              {state.posts.length > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">{state.posts.length}</span>
              )}
            </button>
            {BOARD_TYPES.filter((bt) => bt !== "notice").map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => { setBoardFilter(bt); document.getElementById("board-posts")?.scrollIntoView({ behavior: "smooth" }); }}
                className={`rounded-full border px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.14em] transition ${
                  boardFilter === bt
                    ? bt === "if"
                      ? "border-purple-400/40 bg-purple-400/10 text-purple-300"
                      : "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                    : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16 hover:text-text-primary"
                }`}
              >
                {pickNetworkLabel(BOARD_TYPE_LABELS[bt], lang)}
                {(boardTypeCounts[bt] ?? 0) > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">{boardTypeCounts[bt]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tag Filter */}
          {state.allTags.length > 0 && (
            <TagFilter
              availableTags={state.allTags}
              selectedTags={selectedTags}
              onToggle={handleTagToggle}
              onClear={handleTagClear}
              lang={lang}
            />
          )}
        </section>

        {error ? <p className="text-sm text-accent-red">{error}</p> : null}

        {/* Planets section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="site-kicker">{lang === "ko" ? "추천 행성" : "Featured Planets"}</div>
              <h2 className="site-title mt-2 text-2xl font-semibold">{lang === "ko" ? "최근 갱신된 행성" : "Recently Updated Planets"}</h2>
            </div>
            {user && bookmarkedIds.size > 0 ? (
              <button
                type="button"
                onClick={() => setShowBookmarksOnly((prev) => !prev)}
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  showBookmarksOnly
                    ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                    : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16"
                }`}
              >
                {lang === "ko" ? (showBookmarksOnly ? "전체 보기" : "북마크만") : (showBookmarksOnly ? "Show All" : "Bookmarked")}
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="premium-panel-soft min-h-[220px] animate-pulse p-6" />
                ))
              : !loading && filteredPlanets.length === 0 && state.planets.length === 0
                ? SAMPLE_PLANETS.map((sample) => (
                  <div key={sample.id} className="premium-link-card relative p-6 opacity-75">
                    <span className="absolute right-4 top-4 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-amber">
                      {lang === "ko" ? "샘플" : "Sample"}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="site-kicker">{sample.genre}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold text-text-primary">{lang === "ko" ? sample.name.ko : sample.name.en}</h3>
                    <p className="mt-3 text-sm leading-7 text-text-secondary">{lang === "ko" ? sample.summary.ko : sample.summary.en}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {sample.tags.map((tag) => (
                        <span key={tag} className="badge badge-blue">{tag}</span>
                      ))}
                    </div>
                    <div className="mt-6 text-center">
                      <Link
                        href="/network/new"
                        className="inline-block rounded-lg bg-accent-amber/20 px-5 py-2.5 text-sm font-medium text-accent-amber transition hover:bg-accent-amber/30"
                      >
                        {lang === "ko" ? "실제 행성을 등록해보세요" : "Register your own planet"}
                      </Link>
                    </div>
                  </div>
                ))
              : filteredPlanets.map((planet) => (
                  <div key={planet.id} className="premium-link-card p-6">
                    <Link href={`/network/planets/${planet.id}`} className="block">
                      <div className="flex items-center justify-between gap-3">
                        <span className="site-kicker">{planet.genre}</span>
                        <SettlementBadge status={planet.status} lang={lang} />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-text-primary">{planet.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-text-secondary">{planet.summary}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {planet.representativeTags.slice(0, 3).map((tag) => (
                          <span key={tag} className="badge badge-blue">
                            {tag}
                          </span>
                        ))}
                        {(planet.tags ?? []).slice(0, 2).map((tag) => (
                          <span key={`t-${tag}`} className="badge badge-blue">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="mt-6 flex items-center justify-between text-xs text-text-tertiary">
                        <span>{lang === "ko" ? `최근 로그 ${planet.stats.logCount}개` : `${planet.stats.logCount} recent logs`}</span>
                        <span>{lang === "ko" ? `정산 ${planet.stats.settlementCount}` : `${planet.stats.settlementCount} settlements`}</span>
                      </div>
                    </Link>
                    <div className="mt-3 flex justify-end">
                      <BookmarkButton planetId={planet.id} compact />
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {/* Posts list section */}
        <section id="board-posts" className="space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <div className="site-kicker">{lang === "ko" ? "최신 관측 로그" : "Latest Logs"}</div>
              <h2 className="site-title mt-2 text-2xl font-semibold">{lang === "ko" ? "이야기와 기록 스트림" : "Story and record stream"}</h2>
            </div>
            <Link
              href="/network/posts/new"
              className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.12em] text-accent-amber transition hover:bg-accent-amber/20"
            >
              + {lang === "ko" ? "글쓰기" : "Write"}
            </Link>
          </div>

          <div className="grid gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="premium-panel-soft min-h-[140px] animate-pulse p-5" />
                ))
              : filteredPosts.length === 0
                ? (
                  <div className="premium-panel-soft flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-sm text-text-tertiary">
                      {lang === "ko" ? "아직 게시글이 없습니다." : "No posts yet."}
                    </p>
                    <Link
                      href="/network/posts/new"
                      className="mt-4 rounded-lg bg-accent-amber/20 px-5 py-2.5 text-sm font-medium text-accent-amber transition hover:bg-accent-amber/30"
                    >
                      {lang === "ko" ? "첫 글을 작성해보세요" : "Write the first post"}
                    </Link>
                  </div>
                )
                : filteredPosts.map((post) => {
                  const planet = state.planetMap[post.planetId];
                  const author = state.authorMap[post.authorId];
                  const isIfPost = post.boardType === "if";
                  return (
                    <Link
                      key={post.id}
                      href={`/network/posts/${post.id}`}
                      className={`premium-panel-soft p-5 transition ${
                        isIfPost
                          ? "border-purple-400/20 hover:border-purple-400/40"
                          : "hover:border-accent-amber/20"
                      }`}
                    >
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
                          {isIfPost && (
                            <span className="text-[11px]" aria-hidden="true">
                              IF
                            </span>
                          )}
                          {pickNetworkLabel(BOARD_TYPE_LABELS[post.boardType], lang)}
                        </span>
                        {post.followupStatus ? <SettlementBadge status={post.followupStatus} lang={lang} /> : null}
                      </div>

                      <h3 className={`mt-4 text-lg font-semibold ${isIfPost ? "text-purple-200" : "text-text-primary"}`}>
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-text-secondary">{post.summary}</p>

                      {(post.tags ?? []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {post.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/8 bg-white/[0.02] px-2 py-0.5 text-[10px] text-text-tertiary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
                        <span className="font-medium text-text-secondary">
                          {author?.nickname ?? `Explorer-${post.authorId.slice(0, 6)}`}
                        </span>
                        <span>{relativeTime(post.createdAt, lang)}</span>
                        <span>{planet?.name ?? (post.planetId || (lang === "ko" ? "일반" : "General"))}</span>
                        <span className="ml-auto flex items-center gap-3">
                          {post.metrics.commentCount > 0 && (
                            <span>{lang === "ko" ? `댓글 ${post.metrics.commentCount}` : `${post.metrics.commentCount} comments`}</span>
                          )}
                          {post.metrics.reactionCount > 0 && (
                            <span>{lang === "ko" ? `반응 ${post.metrics.reactionCount}` : `${post.metrics.reactionCount} reactions`}</span>
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>

        {/* Settlements section */}
        <section className="space-y-4">
          <div>
            <div className="site-kicker">{lang === "ko" ? "최신 정산" : "Latest Settlements"}</div>
            <h2 className="site-title mt-2 text-2xl font-semibold">{lang === "ko" ? "위험도와 판정 변화" : "Risk and verdict changes"}</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="premium-panel-soft min-h-[180px] animate-pulse p-5" />
                ))
              : state.settlements.map((settlement) => {
                  const planet = state.planetMap[settlement.planetId];
                  return (
                    <div key={settlement.id} className="premium-panel-soft p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="site-kicker">{planet?.name ?? settlement.planetId}</div>
                        <SettlementBadge status={settlement.verdict} lang={lang} />
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-text-secondary">
                        <div className="flex items-center justify-between gap-3">
                          <span>{lang === "ko" ? "EH 수치" : "EH Value"}</span>
                          <span className="text-text-primary">{settlement.ehValue ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{lang === "ko" ? "위험도" : "Risk"}</span>
                          <span className="text-text-primary">{settlement.risk ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{lang === "ko" ? "보관 등급" : "Archive"}</span>
                          <span className="text-text-primary">{settlement.archiveLevel ?? "-"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>
        {/* NMF Footer */}
        <section className="mt-4 flex items-center justify-center">
          <Link
            href="/network/guidelines"
            className="font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary hover:text-accent-amber transition-colors"
          >
            {lang === "ko" ? "NMF 2차 창작 가이드라인" : "NMF Creative Guidelines"} &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=dashboard renderer | inputs=dashboard state and filter state | outputs=network landing UI with board tabs, post cards, and tag filters

"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { netT } from "@/lib/network-translations";
import { logger } from "@/lib/logger";
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
type FeedSort = "latest" | "popular" | "recommended";

const BOARD_FILTER_LABELS: Record<"all", { ko: string; en: string; ja: string; zh: string }> = {
  all: { ko: "전체", en: "All", ja: "すべて", zh: "全部" },
};

const FEED_SORT_LABELS: Record<FeedSort, { ko: string; en: string; ja: string; zh: string }> = {
  latest: { ko: "최신", en: "Latest", ja: "最新", zh: "最新" },
  popular: { ko: "인기", en: "Popular", ja: "人気", zh: "热门" },
  recommended: { ko: "추천", en: "Recommended", ja: "おすすめ", zh: "推荐" },
};

function scorePosts(
  posts: PostRecord[],
  selectedTags: string[],
): (PostRecord & { _score: number })[] {
  const now = Date.now();
  const tagSet = new Set(selectedTags.map((t) => t.toLowerCase()));
  return posts.map((post) => {
    const ageMs = now - new Date(post.createdAt).getTime();
    const ageHours = Math.max(1, ageMs / 3_600_000);
    const recency = 100 / Math.sqrt(ageHours);
    const reactions = (post.metrics.reactionCount ?? 0) * 5 + (post.metrics.commentCount ?? 0) * 3;
    let tagOverlap = 0;
    if (tagSet.size > 0) {
      for (const t of post.tags ?? []) {
        if (tagSet.has(t.toLowerCase())) tagOverlap += 15;
      }
    }
    return { ...post, _score: recency + reactions + tagOverlap };
  });
}

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

// Keep this below the E2E "stuck loading" regression threshold.
// If the backend is unavailable/blocked, we fall back to sample data and show retry UI.
const NETWORK_LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = NETWORK_LOAD_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`NETWORK_LOAD_TIMEOUT:${label}`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function relativeTime(isoDate: string, lang: Lang): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return L4(lang, { ko: "방금 전", en: "Just now", ja: "たった今", zh: "刚刚" });
  if (minutes < 60) return L4(lang, { ko: `${minutes}분 전`, en: `${minutes}m ago`, ja: `${minutes}m ago`, zh: `${minutes}m ago` });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return L4(lang, { ko: `${hours}시간 전`, en: `${hours}h ago`, ja: `${hours}h ago`, zh: `${hours}h ago` });
  const days = Math.floor(hours / 24);
  if (days < 30) return L4(lang, { ko: `${days}일 전`, en: `${days}d ago`, ja: `${days}d ago`, zh: `${days}d ago` });
  return new Date(isoDate).toLocaleDateString(L4(lang, { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" }));
}

// ============================================================
// PART 1-B — Memoized List Item Components
// ============================================================

interface PlanetCardProps {
  planet: PlanetRecord;
  lang: Lang;
}

const PlanetCard = memo(function PlanetCard({ planet, lang }: PlanetCardProps) {
  return (
    <div className="premium-link-card p-6">
      <Link href={`/network/planets/${planet.id}`} className="block">
        <div className="flex items-center justify-between gap-3">
          <span className="site-kicker">{planet.genre}</span>
          <SettlementBadge status={planet.status} lang={lang} />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-text-primary">{planet.name}</h3>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{planet.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {planet.representativeTags.slice(0, 3).map((tag) => (
            <span key={tag} className="badge badge-blue">{tag}</span>
          ))}
          {(planet.tags ?? []).slice(0, 2).map((tag) => (
            <span key={`t-${tag}`} className="badge badge-blue">{tag}</span>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between text-xs text-text-tertiary">
          <span>{L4(lang, { ko: `최근 로그 ${planet.stats.logCount}개`, en: `${planet.stats.logCount} recent logs`, ja: `最近のログ${planet.stats.logCount}件`, zh: `最近${planet.stats.logCount}条日志` })}</span>
          <span>{L4(lang, { ko: `정산 ${planet.stats.settlementCount}`, en: `${planet.stats.settlementCount} settlements`, ja: `${planet.stats.settlementCount} settlements`, zh: `${planet.stats.settlementCount} settlements` })}</span>
        </div>
      </Link>
      <div className="mt-3 flex justify-end">
        <BookmarkButton planetId={planet.id} compact />
      </div>
    </div>
  );
});

interface PostCardProps {
  post: PostRecord;
  planet?: PlanetRecord;
  author?: UserRecord;
  lang: Lang;
}

const PostCard = memo(function PostCard({ post, planet, author, lang }: PostCardProps) {
  const isIfPost = post.boardType === "if";
  return (
    <Link
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
            <span className="text-[11px]" aria-hidden="true">IF</span>
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
        <span>{planet?.name ?? (post.planetId || (L4(lang, { ko: "일반", en: "General", ja: "General", zh: "General" })))}</span>
        <span className="ml-auto flex items-center gap-3">
          {post.metrics.commentCount > 0 && (
            <span>{L4(lang, { ko: `댓글 ${post.metrics.commentCount}`, en: `${post.metrics.commentCount} comments`, ja: `コメント ${post.metrics.commentCount}`, zh: `评论 ${post.metrics.commentCount}` })}</span>
          )}
          {post.metrics.reactionCount > 0 && (
            <span>{L4(lang, { ko: `반응 ${post.metrics.reactionCount}`, en: `${post.metrics.reactionCount} reactions`, ja: `リアクション ${post.metrics.reactionCount}`, zh: `反应 ${post.metrics.reactionCount}` })}</span>
          )}
        </span>
      </div>
    </Link>
  );
});

export function NetworkHomeClient() {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial filter state from URL — validate against known types
  const rawBoard = searchParams.get("board") || "all";
  const initialBoard: BoardFilter = rawBoard === "all" || (BOARD_TYPES as readonly string[]).includes(rawBoard)
    ? (rawBoard as BoardFilter)
    : "all";
  const initialTagsRaw = searchParams.get("tags") || "";
  const initialTags = initialTagsRaw ? initialTagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];
  const initialBookmarks = searchParams.get("bookmarks") === "1";

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
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(initialBookmarks);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>(initialBoard);
  const [feedSort, setFeedSort] = useState<FeedSort>("latest");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [showSamples, setShowSamples] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Re-sync filter state from URL on browser back/forward — with validation
  useEffect(() => {
    const rawB = searchParams.get('board') || 'all';
    const board: BoardFilter = rawB === 'all' || (BOARD_TYPES as readonly string[]).includes(rawB)
      ? (rawB as BoardFilter)
      : 'all';
    const tags = searchParams.get('tags')?.split(',').map(t => t.trim()).filter(Boolean) || [];
    const bookmarks = searchParams.get('bookmarks') === '1';
    setBoardFilter(board);
    setSelectedTags(tags);
    setShowBookmarksOnly(bookmarks);
  }, [searchParams]);

  // Sync filter state to URL query params
  useEffect(() => {
    const currentSearch = searchParams.toString();
    const params = new URLSearchParams(currentSearch);
    if (boardFilter !== "all") params.set("board", boardFilter);
    else params.delete("board");
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    else params.delete("tags");
    if (showBookmarksOnly) params.set("bookmarks", "1");
    else params.delete("bookmarks");
    const qs = params.toString();
    if (qs === currentSearch) return;
    const target = qs ? `?${qs}` : "/network";
    router.replace(target, { scroll: false });
  }, [boardFilter, selectedTags, showBookmarksOnly, router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [planetResult, postResult, settlementResult, bookmarkResult, tagResult] = await Promise.allSettled([
          withTimeout(listLatestPlanets(6), "planets"),
          withTimeout(listLatestPosts(30), "posts"),
          withTimeout(listLatestSettlements(6), "settlements"),
          withTimeout(user ? listBookmarks(user.uid) : Promise.resolve([] as BookmarkRecord[]), "bookmarks"),
          withTimeout(getAllUniqueTags(50), "tags"),
        ]);

        const planets = planetResult.status === "fulfilled" ? planetResult.value : [];
        const posts = postResult.status === "fulfilled" ? postResult.value : [];
        const settlements = settlementResult.status === "fulfilled" ? settlementResult.value : [];
        const bookmarks = bookmarkResult.status === "fulfilled" ? bookmarkResult.value : [];
        const allTags = tagResult.status === "fulfilled" ? tagResult.value : [];

        const rejectedLoads = [
          planetResult,
          postResult,
          settlementResult,
          bookmarkResult,
          tagResult,
        ].filter((result): result is PromiseRejectedResult => result.status === "rejected");

        if (rejectedLoads.length > 0) {
          logger.warn("NetworkHome", "Partial dashboard load failure", rejectedLoads.map((result) => result.reason));
        }

        const planetIds = [
          ...planets.map((planet) => planet.id),
          ...posts.map((post) => post.planetId).filter(Boolean),
          ...settlements.map((settlement) => settlement.planetId),
        ];
        // Skip downstream fetches when no primary data loaded — prevents cascading timeouts
        const planetMap = planetIds.length > 0
          ? await withTimeout(getPlanetsByIds(planetIds), "planetMap").catch(() => ({} as Record<string, PlanetRecord>))
          : {} as Record<string, PlanetRecord>;

        const uniqueAuthorIds = Array.from(new Set(posts.map((p) => p.authorId)));
        const authorMap: Record<string, UserRecord> = {};
        if (uniqueAuthorIds.length > 0) {
          try {
            const authorEntries = await withTimeout(Promise.all(
              uniqueAuthorIds.map(async (uid) => {
                const record = await getNetworkUserRecord(uid);
                return [uid, record] as const;
              }),
            ), "authors");
            for (const [uid, record] of authorEntries) {
              if (record) authorMap[uid] = record;
            }
          } catch {
            logger.warn("NetworkHome", "Author lookup timed out — using fallback names");
          }
        }

        if (!cancelled) {
          setState({ planets, posts, settlements, planetMap, authorMap, allTags });
          setBookmarkedIds(new Set(bookmarks.map((b) => b.planetId)));
          if (rejectedLoads.length > 0) {
            setError(L4(lang, {
              ko: "일부 데이터를 불러오지 못했습니다. 다시 시도하면 최신 상태로 갱신됩니다.",
              en: "Some dashboard data could not be loaded. Retry to refresh the latest state.",
            }));
          }
        }
      } catch (caught) {
        if (!cancelled) {
          const msg = caught instanceof Error ? caught.message : "";
          // Graceful fallback: show sample planets when Firestore is completely unreachable
          setShowSamples(true);
          if (msg.includes("Firestore is not available")) {
            setError(L4(lang, { ko: "데이터베이스에 연결할 수 없습니다. 샘플 데이터를 표시합니다.", en: "Unable to connect to the database. Showing sample data.", ja: "データベースに接続できません。サンプルデータを表示します。", zh: "无法连接数据库。正在显示示例数据。" }));
          } else if (msg.startsWith("NETWORK_LOAD_TIMEOUT:")) {
            setError(L4(lang, {
              ko: "응답이 지연되어 샘플 데이터를 표시합니다. 다시 시도하면 최신 데이터로 갱신됩니다.",
              en: "Response was slow. Showing sample data. Retry to fetch the latest.",
            }));
          } else {
            setError(msg || (L4(lang, { ko: "불러오기에 실패했습니다.", en: "Failed to load.", ja: "読み込みに失敗しました。", zh: "加载失败。" })));
          }
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
  }, [lang, user, retryKey]);

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
    if (feedSort === "popular") {
      posts = [...posts].sort((a, b) => (b.metrics.reactionCount ?? 0) - (a.metrics.reactionCount ?? 0));
    } else if (feedSort === "recommended") {
      const scored = scorePosts(posts, selectedTags);
      scored.sort((a, b) => b._score - a._score);
      posts = scored;
    }
    return posts.slice(0, 12);
  }, [state.posts, boardFilter, selectedTags, feedSort]);

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
        {/* Header provides navigation — back link removed */}
        <section className="premium-panel p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="site-kicker">NMF — Narrative Management Foundation</div>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-text-tertiary">
                {L4(lang, { ko: "기록하라. 관리하라. 정산하라.", en: "Narrate. Manage. Finalize.", ja: "記録せよ。管理せよ。精算せよ。", zh: "记录。管理。结算。" })}
              </p>
              <h1 className="site-title mt-3 text-4xl font-semibold md:text-5xl">
                {L4(lang, { ko: "행성을 만들고, 첫 로그를 남기고, 정산으로 세계를 쌓아가세요.", en: "Register planets, publish first logs, and grow a world through settlement records.", ja: "惑星を作り、最初のログを残し、精算で世界を積み上げていきましょう。", zh: "创建星球，留下首条日志，通过结算累积世界。" })}
              </h1>
              <p className="site-lede mt-4 max-w-2xl text-sm md:text-base">
                {L4(lang, { ko: "EH Network는 행성 등록소, 관측 로그, 정산 결과를 한 흐름으로 묶는 세계관 게시판입니다.", en: "EH Network links planet registry, observation logs, and settlement outcomes into one narrative board.", ja: "EH Networkは、惑星登録所、観測ログ、精算結果を一つの流れで束ねる世界観掲示板です。", zh: "EH Network 是将星球登记处、观测日志与结算结果串联为一条脉络的世界观公告板。" })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 2026-04-21: 히어로 CTA를 2개로 압축 + 브랜드 amber 통일.
                  NOA 검색은 필터 탭에서 접근, Google 로그인은 별도 inline 링크로 이동. */}
              <Link href="/network/new" className="premium-button primary">
                {L4(lang, { ko: "행성 등록하기", en: "Register a Planet", ja: "惑星を登録", zh: "登记星球" })}
              </Link>
              <a href="#board-posts" className="premium-button secondary">
                {netT('latestLogs', lang)}
              </a>
              {!user ? (
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="text-[11px] font-[family-name:var(--font-mono)] tracking-[0.14em] uppercase text-text-tertiary hover:text-accent-amber transition-colors underline-offset-4 hover:underline"
                >
                  {L4(lang, { ko: "Google로 로그인 →", en: "Sign In with Google →", ja: "Googleでログイン →", zh: "用 Google 登录 →" })}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: L4(lang, { ko: "행성 등록소", en: "Planet Registry", ja: "惑星登録所", zh: "星球登记处" }),
                body: L4(lang, { ko: "세계관 허브와 운영 목표를 등록합니다.", en: "Register the world hub and operating goal.", ja: "世界観ハブと運用目標を登録します。", zh: "登记世界观中心与运营目标。" }),
              },
              {
                title: L4(lang, { ko: "관측 로그", en: "Observation Logs", ja: "観測ログ", zh: "观测日志" }),
                body: L4(lang, { ko: "이야기, 보고서, 회수문서를 같은 흐름에 쌓습니다.", en: "Stack stories, reports, and recovered files in one stream.", ja: "物語、レポート、回収文書を同じ流れに積み重ねます。", zh: "将故事、报告、回收文档汇入同一条脉络中。" }),
              },
              {
                title: L4(lang, { ko: "정산 결과", en: "Settlement Results", ja: "精算結果", zh: "结算结果" }),
                body: L4(lang, { ko: "행성 상태 판정과 위험도 기록을 운영 축으로 남깁니다.", en: "Track verdicts and risk changes as the operational layer.", ja: "惑星の状態判定とリスク記録を運用軸として残します。", zh: "将星球状态判定与风险记录作为运营主轴留存。" }),
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

          {/* NOA 검색 어시스턴트 — 히어로 CTA에서 이동. 탐색 니즈 명확한 유저 대상 보조 링크. */}
          <div className="mt-6 flex items-center justify-end">
            <Link
              href="/network/agent"
              className="text-[11px] font-[family-name:var(--font-mono)] tracking-[0.14em] uppercase text-accent-blue hover:text-accent-amber transition-colors underline-offset-4 hover:underline"
            >
              {L4(lang, { ko: "NOA 검색 어시스턴트 →", en: "NOA Search Assistant →", ja: "NOA 検索アシスタント →", zh: "NOA 搜索助手 →" })}
            </Link>
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
              {L4(lang, BOARD_FILTER_LABELS.all)}
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
              <div className="site-kicker">{netT('latestPlanets', lang)}</div>
              <h2 className="site-title mt-2 text-2xl font-semibold">{netT('latestPlanets', lang)}</h2>
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
                {showBookmarksOnly ? L4(lang, { ko: "전체 보기", en: "Show All", ja: "すべて表示", zh: "全部显示" }) : L4(lang, { ko: "북마크만", en: "Bookmarked", ja: "ブックマークのみ", zh: "仅收藏" })}
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {loading
              ? (
                  <>
                    {/* Loading skeleton cards */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="premium-panel-soft p-5 animate-pulse space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-bg-tertiary/50" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 bg-bg-tertiary/50 rounded w-3/4" />
                            <div className="h-2.5 bg-bg-tertiary/30 rounded w-1/2" />
                          </div>
                        </div>
                        <div className="h-2.5 bg-bg-tertiary/30 rounded w-full" />
                        <div className="h-2.5 bg-bg-tertiary/30 rounded w-5/6" />
                        <div className="flex gap-2 mt-2">
                          <div className="h-5 w-12 bg-bg-tertiary/20 rounded-full" />
                          <div className="h-5 w-16 bg-bg-tertiary/20 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </>
                )
              : !loading && error && state.planets.length === 0
                ? (
                  <div className="premium-panel-soft col-span-full flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-sm text-accent-red mb-3">
                      {L4(lang, { ko: "데이터를 불러오는 데 실패했습니다", en: "Failed to load data", ja: "データの読み込みに失敗しました", zh: "数据加载失败" })}
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-5 py-2.5 text-xs font-medium text-accent-amber transition hover:bg-accent-amber/20"
                    >
                      {L4(lang, { ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
                    </button>
                  </div>
                )
              : !loading && filteredPlanets.length === 0 && state.planets.length === 0
                ? (
                  <>
                    {/* Empty state */}
                    <div className="premium-panel-soft col-span-full flex flex-col items-center justify-center p-10 text-center">
                      <p className="text-lg font-semibold text-text-primary">
                        {L4(lang, { ko: "아직 행성이 없습니다.", en: "No planets yet.", ja: "まだ惑星がありません。", zh: "暂无星球。" })}
                      </p>
                      <p className="mt-2 text-sm text-text-secondary">
                        {L4(lang, { ko: "첫 번째 행성을 만들어보세요!", en: "Create the first one!", ja: "最初の惑星を作ってみましょう！", zh: "来创建第一个星球吧！" })}
                      </p>
                      <Link
                        href="/network/new"
                        className="mt-5 inline-block rounded-lg bg-accent-amber/20 px-6 py-3 text-sm font-medium text-accent-amber transition hover:bg-accent-amber/30"
                      >
                        {L4(lang, { ko: "행성 등록하기", en: "Register a Planet", ja: "惑星を登録", zh: "登记星球" })}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowSamples((prev) => !prev)}
                        className="mt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors underline underline-offset-2"
                      >
                        {showSamples
                          ? (L4(lang, { ko: "샘플 숨기기", en: "Hide samples", ja: "Hide samples", zh: "Hide samples" }))
                          : (L4(lang, { ko: "샘플 보기", en: "Show samples", ja: "Show samples", zh: "Show samples" }))}
                      </button>
                    </div>
                    {/* Sample planets — only shown on explicit toggle */}
                    {showSamples && SAMPLE_PLANETS.map((sample) => (
                      <div key={sample.id} className="premium-link-card relative p-6 opacity-60">
                        <span className="absolute right-4 top-4 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-amber">
                          {L4(lang, { ko: "샘플", en: "Sample", ja: "Sample", zh: "Sample" })}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="site-kicker">{sample.genre}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-text-primary">{L4(lang, sample.name)}</h3>
                        <p className="mt-3 text-sm leading-7 text-text-secondary">{L4(lang, sample.summary)}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {sample.tags.map((tag) => (
                            <span key={tag} className="badge badge-blue">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )
              : filteredPlanets.length === 0 && state.planets.length > 0
                ? (
                  <div className="premium-panel-soft col-span-full flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-sm text-text-tertiary">
                      {L4(lang, { ko: "필터 결과가 없습니다.", en: "No results match the current filters.", ja: "フィルター 結果がありません。", zh: "筛选 没有结果。" })}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setBoardFilter("all"); setSelectedTags([]); setShowBookmarksOnly(false); }}
                      className="mt-4 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
                    >
                      {L4(lang, { ko: "필터 해제", en: "Clear Filters", ja: "フィルター解除", zh: "清除筛选" })}
                    </button>
                  </div>
                )
              : filteredPlanets.map((planet) => (
                  <PlanetCard key={planet.id} planet={planet} lang={lang} />
                ))}
          </div>
        </section>

        {/* Posts list section */}
        <section id="board-posts" className="space-y-4 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <div className="site-kicker">{L4(lang, { ko: "최신 관측 로그", en: "Latest Logs", ja: "最新 観測 ログ", zh: "最新 观测 日志" })}</div>
              <h2 className="site-title mt-2 text-2xl font-semibold">{L4(lang, { ko: "이야기와 기록 스트림", en: "Story and record stream", ja: "Story and record stream", zh: "Story and record stream" })}</h2>
            </div>
            <Link
              href="/network/posts/new"
              className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.12em] text-accent-amber transition hover:bg-accent-amber/20"
            >
              + {L4(lang, { ko: "글쓰기", en: "Write", ja: "投稿する", zh: "发帖" })}
            </Link>
          </div>

          {/* Feed Sort Tabs */}
          <div className="flex gap-2">
            {(["latest", "popular", "recommended"] as const).map((sort) => (
              <button
                key={sort}
                type="button"
                onClick={() => setFeedSort(sort)}
                className={`rounded-full border px-4 py-2 text-[11px] font-medium tracking-wide transition ${
                  feedSort === sort
                    ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                    : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16 hover:text-text-primary"
                }`}
              >
                {L4(lang, FEED_SORT_LABELS[sort])}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {loading
              ? (
                  <>
                    {/* Post loading skeletons */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="premium-panel-soft p-4 animate-pulse space-y-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bg-tertiary/50" />
                          <div className="h-3 bg-bg-tertiary/40 rounded w-24" />
                          <div className="h-2.5 bg-bg-tertiary/20 rounded w-16 ml-auto" />
                        </div>
                        <div className="h-4 bg-bg-tertiary/40 rounded w-3/4" />
                        <div className="h-2.5 bg-bg-tertiary/20 rounded w-full" />
                        <div className="h-2.5 bg-bg-tertiary/20 rounded w-2/3" />
                      </div>
                    ))}
                  </>
                )
              : error && state.posts.length === 0
                ? (
                  <div className="premium-panel-soft flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-sm text-accent-red mb-3">
                      {L4(lang, { ko: "게시글을 불러오는 데 실패했습니다", en: "Failed to load posts", ja: "投稿の読み込みに失敗しました", zh: "帖子加载失败" })}
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-5 py-2.5 text-xs font-medium text-accent-amber transition hover:bg-accent-amber/20"
                    >
                      {L4(lang, { ko: "다시 시도", en: "Retry", ja: "再試行", zh: "重试" })}
                    </button>
                  </div>
                )
              : filteredPosts.length === 0
                ? (
                  <div className="premium-panel-soft flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-sm text-text-tertiary">
                      {L4(lang, { ko: "아직 게시글이 없습니다.", en: "No posts yet.", ja: "まだ投稿がありません。", zh: "暂无帖子。" })}
                    </p>
                    <Link
                      href="/network/posts/new"
                      className="mt-4 rounded-lg bg-accent-amber/20 px-5 py-2.5 text-sm font-medium text-accent-amber transition hover:bg-accent-amber/30"
                    >
                      {L4(lang, { ko: "첫 글을 작성해보세요", en: "Write the first post", ja: "最初の記事を書いてみましょう", zh: "来撰写第一篇帖子吧" })}
                    </Link>
                  </div>
                )
                : filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      planet={state.planetMap[post.planetId]}
                      author={state.authorMap[post.authorId]}
                      lang={lang}
                    />
                  ))}
          </div>
        </section>

        {/* Settlements section */}
        <section className="space-y-4">
          <div>
            <div className="site-kicker">{L4(lang, { ko: "최신 정산", en: "Latest Settlements", ja: "最新の精算", zh: "最新结算" })}</div>
            <h2 className="site-title mt-2 text-2xl font-semibold">{L4(lang, { ko: "위험도와 판정 변화", en: "Risk and verdict changes", ja: "Risk and verdict changes", zh: "Risk and verdict changes" })}</h2>
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
                          <span>{L4(lang, { ko: "EH 수치", en: "EH Value", ja: "EH Value", zh: "EH Value" })}</span>
                          <span className="text-text-primary">{settlement.ehValue ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{L4(lang, { ko: "위험도", en: "Risk", ja: "Risk", zh: "Risk" })}</span>
                          <span className="text-text-primary">{settlement.risk ?? "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>{L4(lang, { ko: "보관 등급", en: "Archive", ja: "アーカイブ等級", zh: "归档等级" })}</span>
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
            {L4(lang, { ko: "NMF 2차 창작 가이드라인", en: "NMF Creative Guidelines", ja: "NMF Creative Guidelines", zh: "NMF Creative Guidelines" })} &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=dashboard renderer | inputs=dashboard state and filter state | outputs=network landing UI with board tabs, post cards, and tag filters

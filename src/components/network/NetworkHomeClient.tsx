"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import {
  getPlanetsByIds,
  listBookmarks,
  listLatestPlanets,
  listLatestPosts,
  listLatestSettlements,
} from "@/lib/network-firestore";
import type { BookmarkRecord, PlanetRecord, PostRecord, SettlementRecord } from "@/lib/network-types";
import { BookmarkButton } from "@/components/network/BookmarkButton";
import {
  BOARD_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";
import { SettlementBadge } from "@/components/network/SettlementBadge";

interface DashboardState {
  planets: PlanetRecord[];
  posts: PostRecord[];
  settlements: SettlementRecord[];
  planetMap: Record<string, PlanetRecord>;
}

// ============================================================
// PART 1 - DATA LOADING
// ============================================================

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
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [planets, posts, settlements, bookmarks] = await Promise.all([
          listLatestPlanets(6),
          listLatestPosts(8),
          listLatestSettlements(6),
          user ? listBookmarks(user.uid) : Promise.resolve([] as BookmarkRecord[]),
        ]);

        const planetIds = [
          ...planets.map((planet) => planet.id),
          ...posts.map((post) => post.planetId),
          ...settlements.map((settlement) => settlement.planetId),
        ];
        const planetMap = await getPlanetsByIds(planetIds);

        if (!cancelled) {
          setState({ planets, posts, settlements, planetMap });
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

  // IDENTITY_SEAL: PART-1 | role=dashboard data loader | inputs=language and firestore state | outputs=dashboard records

  // ============================================================
  // PART 2 - RENDER
  // ============================================================

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-8 py-8 md:space-y-10 md:py-10">
        <section className="premium-panel p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="site-kicker">{lang === "ko" ? "세계관 기반 관측 네트워크" : "Worldbuilding Observation Network"}</div>
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
              <a href="#latest-logs" className="premium-button secondary">
                {lang === "ko" ? "최신 로그 보기" : "View Latest Logs"}
              </a>
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

        {error ? <p className="text-sm text-accent-red">{error}</p> : null}

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
              : (showBookmarksOnly ? state.planets.filter((p) => bookmarkedIds.has(p.id)) : state.planets).map((planet) => (
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

        <section id="latest-logs" className="space-y-4">
          <div>
            <div className="site-kicker">{lang === "ko" ? "최신 관측 로그" : "Latest Logs"}</div>
            <h2 className="site-title mt-2 text-2xl font-semibold">{lang === "ko" ? "이야기와 기록 스트림" : "Story and record stream"}</h2>
          </div>

          <div className="grid gap-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="premium-panel-soft min-h-[140px] animate-pulse p-5" />
                ))
              : state.posts.map((post) => {
                  const planet = state.planetMap[post.planetId];
                  return (
                    <Link key={post.id} href={`/network/planets/${post.planetId}`} className="premium-panel-soft p-5 transition hover:border-accent-amber/20">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="badge badge-amber">
                          {pickNetworkLabel(REPORT_TYPE_LABELS[post.reportType], lang)}
                        </span>
                        <span className="badge badge-redacted">
                          {pickNetworkLabel(BOARD_TYPE_LABELS[post.boardType], lang)}
                        </span>
                        {post.followupStatus ? <SettlementBadge status={post.followupStatus} lang={lang} /> : null}
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-text-primary">{post.title}</h3>
                      <p className="mt-2 text-sm text-text-secondary">{post.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-tertiary">
                        <span>{planet?.name ?? post.planetId}</span>
                        <span>{post.eventCategory ?? (lang === "ko" ? "미분류" : "Unclassified")}</span>
                        <span>{new Date(post.createdAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}</span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </section>

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
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=dashboard renderer | inputs=dashboard state | outputs=network landing UI

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { logger } from "@/lib/logger";
import { _netT } from "@/lib/network-translations";
import { L4 } from "@/lib/i18n";
import { BookmarkButton } from "@/components/network/BookmarkButton";
import { CommentSection } from "@/components/network/CommentSection";
import { PlanetHeaderCard } from "@/components/network/PlanetHeaderCard";
import { ReactionBar } from "@/components/network/ReactionBar";
import { ReportButton } from "@/components/network/ReportButton";
import { SettlementBadge } from "@/components/network/SettlementBadge";
import {
  getNetworkUserRecord,
  getPlanetById,
  getPostById,
  listPlanetPosts,
  listPlanetSettlements,
} from "@/lib/network-firestore";
import { canManagePlanet, canWritePlanetLog } from "@/lib/network-permissions";
import type { PlanetRecord, PostRecord, SettlementRecord, UserRecord } from "@/lib/network-types";
import { REPORT_TYPE_LABELS, pickNetworkLabel } from "@/lib/network-labels";

interface PlanetDetailClientProps {
  planetId: string;
}

type DetailTab = "logs" | "if" | "settlements" | "feedback";

// ============================================================
// PART 1 - DATA LOADING
// ============================================================

export function PlanetDetailClient({ planetId }: PlanetDetailClientProps) {
  const { lang } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planet, setPlanet] = useState<PlanetRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [ownerRecord, setOwnerRecord] = useState<UserRecord | null>(null);
  const [viewerRecord, setViewerRecord] = useState<UserRecord | null>(null);
  const [featuredPost, setFeaturedPost] = useState<PostRecord | null>(null);
  const [tab, setTab] = useState<DetailTab>("logs");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const planetRecord = await getPlanetById(planetId);
        if (!planetRecord) {
          throw new Error(L4(lang, { ko: "행성을 찾을 수 없습니다.", en: "Planet not found." }));
        }

        const [postRecords, settlementRecords, nextOwner, nextViewer] = await Promise.all([
          listPlanetPosts(planetId),
          listPlanetSettlements(planetId),
          getNetworkUserRecord(planetRecord.ownerId),
          user ? getNetworkUserRecord(user.uid) : Promise.resolve(null),
        ]);

        const featured =
          (planetRecord.stats.featuredPostId
            ? await getPostById(planetRecord.stats.featuredPostId)
            : null) ?? postRecords[0] ?? null;

        if (!cancelled) {
          setPlanet(planetRecord);
          setPosts(postRecords);
          setSettlements(settlementRecords);
          setOwnerRecord(nextOwner);
          setViewerRecord(nextViewer);
          setFeaturedPost(featured);
        }
      } catch (caught) {
        if (!cancelled) {
          // User-friendly error — never expose raw Firestore/internal messages
          logger.error('PlanetDetailClient', caught);
          const userMsg = L4(lang, {
            ko: "데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
            en: "Something went wrong while loading data. Please try again shortly.",
            ja: "データの読み込み中に問題が発生しました。しばらくしてからもう一度お試しください。",
            zh: "加载数据时出现问题，请稍后重试。",
          });
          setError(userMsg);
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
  }, [lang, planetId, user]);

  // IDENTITY_SEAL: PART-1 | role=planet detail loader | inputs=planet id and viewer | outputs=planet, posts, settlements

  // ============================================================
  // PART 2 - DERIVED STATE
  // ============================================================

  const isManager = canManagePlanet(user?.uid, viewerRecord, planet);
  const canWriteLog = canWritePlanetLog(user?.uid, viewerRecord, planet);

  const topReadPost = useMemo(() => {
    return [...posts].sort((left, right) => right.metrics.viewCount - left.metrics.viewCount)[0] ?? null;
  }, [posts]);

  const recentActivity = useMemo(() => {
    const events = [
      ...posts.map((post) => ({
        id: post.id,
        label: post.title,
        date: post.createdAt,
        kind: L4(lang, { ko: "로그", en: "Log" }),
      })),
      ...settlements.map((settlement) => ({
        id: settlement.id,
        label: settlement.action ?? settlement.verdict,
        date: settlement.createdAt,
        kind: L4(lang, { ko: "정산", en: "Settlement" }),
      })),
    ];

    return events.sort((left, right) => right.date.localeCompare(left.date)).slice(0, 5);
  }, [lang, posts, settlements]);

  const filteredPosts = useMemo(() => {
    if (tab === "logs") {
      return posts.filter((post) => post.boardType === "log");
    }
    if (tab === "if") {
      return posts.filter((post) => post.boardType === "if");
    }
    if (tab === "feedback") {
      return posts.filter((post) => post.boardType === "feedback");
    }
    return posts;
  }, [posts, tab]);

  // IDENTITY_SEAL: PART-2 | role=detail view derivations | inputs=loaded records | outputs=tab data and widget data

  // ============================================================
  // PART 3 - RENDER
  // ============================================================

  if (loading) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <div className="premium-panel-soft min-h-[320px] animate-pulse p-8" />
        </div>
      </main>
    );
  }

  if (!planet) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section data-testid="error-fallback" className="premium-panel p-8 text-center">
            <div className="site-kicker">{L4(lang, { ko: "행성 상세", en: "Planet Detail", ja: "惑星詳細", zh: "星球详情" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "행성을 찾을 수 없습니다.", en: "Planet not found.", ja: "惑星が見つかりません。", zh: "未找到星球。" })}
            </h1>
            <p className="site-lede mt-4">
              {error ?? L4(lang, { ko: "유효한 행성 ID를 확인하세요.", en: "Check the requested planet id.", ja: "有効な惑星IDを確認してください。", zh: "请检查请求的星球ID。" })}
            </p>
            <div className="mt-8">
              <Link href="/network" className="premium-button inline-block">
                {L4(lang, { ko: "← 네트워크로 돌아가기", en: "← Back to Network", ja: "← ネットワークに戻る", zh: "← 返回网络" })}
              </Link>
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
        <PlanetHeaderCard
          planet={planet}
          lang={lang}
          ownerName={ownerRecord?.nickname}
          actions={
            <>
              {canWriteLog ? (
                <Link href={`/network/logs/new?planetId=${planet.id}`} className="premium-button">
                  {L4(lang, { ko: "새 로그 작성", en: "Write New Log" })}
                </Link>
              ) : null}
              {isManager ? (
                <Link href="/network/admin/settlements" className="premium-button secondary">
                  {L4(lang, { ko: "정산 워크벤치", en: "Settlement Workbench" })}
                </Link>
              ) : null}
              <button
                onClick={() => {
                  const worldPayload = {
                    name: planet.name,
                    summary: planet.summary,
                    tags: planet.representativeTags,
                    coreRules: planet.coreRules,
                    civilizationLevel: planet.civilizationLevel,
                    goal: planet.goal,
                  };
                  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(worldPayload))));
                  router.push(`/studio?worldImport=${encoded}`);
                }}
                className="premium-button secondary"
              >
                {L4(lang, { ko: "이 세계관으로 집필 시작", en: "Start Writing with this World" })}
              </button>
              <BookmarkButton planetId={planet.id} />
              <ReportButton targetType="planet" targetId={planet.id} />
            </>
          }
        />

        {error ? (
          <div className="premium-panel-soft p-6 text-center space-y-4">
            <p className="text-sm text-accent-red">{error}</p>
            <Link href="/network" className="premium-button inline-block">
              {L4(lang, { ko: "네트워크로 돌아가기", en: "Back to Network", ja: "ネットワークに戻る", zh: "返回网络" })}
            </Link>
          </div>
        ) : null}

        <div className="premium-panel-soft p-4">
          <ReactionBar targetType="planet" targetId={planet.id} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
          <section className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {([
                ["logs", L4(lang, { ko: "최근 관측 로그", en: "Logs" })],
                ["if", L4(lang, { ko: "IF / 분기 루트", en: "IF / Side Route" })],
                ["settlements", L4(lang, { ko: "정산 기록", en: "Settlements" })],
                ["feedback", L4(lang, { ko: "피드백", en: "Feedback" })],
              ] as [DetailTab, string][]).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    tab === key
                      ? "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
                      : "border-white/8 bg-white/[0.02] text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "settlements" ? (
              <div className="space-y-4">
                {settlements.length === 0 ? (
                  <div className="premium-panel-soft p-6 text-sm text-text-secondary">
                    {L4(lang, { ko: "아직 정산 기록이 없습니다.", en: "No settlements have been posted yet." })}
                  </div>
                ) : (
                  settlements.map((settlement) => (
                    <article key={settlement.id} className="premium-panel-soft p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="site-kicker">{settlement.archiveLevel ?? L4(lang, { ko: "보관 등급 없음", en: "No archive level" })}</div>
                        <SettlementBadge status={settlement.verdict} lang={lang} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-text-secondary md:grid-cols-3">
                        <div>{L4(lang, { ko: `EH 수치 ${settlement.ehValue ?? "-"}`, en: `EH ${settlement.ehValue ?? "-"}` })}</div>
                        <div>{L4(lang, { ko: `위험도 ${settlement.risk ?? "-"}`, en: `Risk ${settlement.risk ?? "-"}` })}</div>
                        <div>{new Date(settlement.createdAt).toLocaleString(L4(lang, { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" }))}</div>
                      </div>
                      {settlement.action ? <p className="mt-4 text-sm text-text-primary">{settlement.action}</p> : null}
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <div className="premium-panel-soft p-6 text-sm text-text-secondary">
                    {tab === "logs"
                      ? L4(lang, { ko: "관측 로그가 아직 없습니다.", en: "There are no logs yet." })
                      : L4(lang, { ko: "아직 문서가 없습니다.", en: "No records yet." })}
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <article key={post.id} className="premium-panel-soft p-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="badge badge-amber">{pickNetworkLabel(REPORT_TYPE_LABELS[post.reportType], lang)}</span>
                        {post.followupStatus ? <SettlementBadge status={post.followupStatus} lang={lang} /> : null}
                      </div>
                      <h2 className="text-lg font-semibold text-text-primary">{post.title}</h2>
                      <div className="text-xs text-text-tertiary">
                        {post.eventCategory ?? L4(lang, { ko: "미분류", en: "Unclassified" })} ·{" "}
                        {new Date(post.createdAt).toLocaleString(L4(lang, { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" }))}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">{post.content}</p>

                      <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
                        <ReactionBar targetType="post" targetId={post.id} />
                        <ReportButton targetType="post" targetId={post.id} />
                      </div>

                      <CommentSection planetId={planet.id} postId={post.id} />
                    </article>
                  ))
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="premium-panel-soft p-5">
              <div className="site-kicker">{L4(lang, { ko: "대표 로그", en: "Featured Log" })}</div>
              {featuredPost ? (
                <>
                  <h3 className="mt-3 text-lg font-semibold text-text-primary">{featuredPost.title}</h3>
                  <p className="mt-3 text-sm text-text-secondary">{featuredPost.summary}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">{L4(lang, { ko: "대표 로그가 없습니다.", en: "No featured log yet." })}</p>
              )}
            </div>

            <div className="premium-panel-soft p-5">
              <div className="site-kicker">{L4(lang, { ko: "가장 많이 읽힌 로그", en: "Most Read" })}</div>
              {topReadPost ? (
                <>
                  <h3 className="mt-3 text-lg font-semibold text-text-primary">{topReadPost.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{topReadPost.metrics.viewCount} {L4(lang, { ko: "조회", en: "views" })}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">{L4(lang, { ko: "아직 집계 전입니다.", en: "No reads tracked yet." })}</p>
              )}
            </div>

            <div className="premium-panel-soft p-5">
              <div className="site-kicker">{L4(lang, { ko: "최근 정산 결과", en: "Latest Settlement" })}</div>
              {settlements[0] ? (
                <>
                  <div className="mt-3 flex items-center gap-3">
                    <SettlementBadge status={settlements[0].verdict} lang={lang} />
                    <span className="text-sm text-text-secondary">{settlements[0].archiveLevel ?? "-"}</span>
                  </div>
                  {settlements[0].action ? <p className="mt-3 text-sm text-text-secondary">{settlements[0].action}</p> : null}
                </>
              ) : (
                <p className="mt-3 text-sm text-text-secondary">{L4(lang, { ko: "정산이 아직 없습니다.", en: "No settlement yet." })}</p>
              )}
            </div>

            <div className="premium-panel-soft p-5">
              <div className="site-kicker">{L4(lang, { ko: "최근 활동", en: "Recent Activity" })}</div>
              <ul className="mt-4 space-y-3 text-sm text-text-secondary">
                {recentActivity.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-text-primary">{item.label}</div>
                      <div className="text-xs text-text-tertiary">{item.kind}</div>
                    </div>
                    <div className="text-xs text-text-tertiary">
                      {new Date(item.date).toLocaleDateString(L4(lang, { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" }))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-3 | role=planet detail renderer | inputs=tab state and derived records | outputs=detail screen

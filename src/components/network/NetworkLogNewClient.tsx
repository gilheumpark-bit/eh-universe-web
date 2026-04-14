"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useNetworkAgent } from "@/lib/hooks/useNetworkAgent";
import { LogComposer, type LogComposerValue } from "@/components/network/LogComposer";
import { createPost, ensureNetworkUserRecord, listPlanetsByOwner } from "@/lib/network-firestore";
import { REPORT_TYPE_TEMPLATES } from "@/lib/network-labels";
import type { PlanetRecord, ReportType } from "@/lib/network-types";
import { logger } from "@/lib/logger";

const LOG_REPORT_TYPES: ReportType[] = ["observation", "incident", "testimony", "recovered"];

// ============================================================
// PART 1 - LOG COMPOSER SCREEN
// ============================================================

export function NetworkLogNewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ingestAgent } = useNetworkAgent();
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [planets, setPlanets] = useState<PlanetRecord[]>([]);
  const [loadingPlanets, setLoadingPlanets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<LogComposerValue>({
    planetId: searchParams.get("planetId") ?? "",
    reportType: "observation",
    title: "",
    eventCategory: "",
    content: REPORT_TYPE_TEMPLATES.observation[lang === "ko" ? "ko" : "en"],
    region: "",
    intervention: false,
    ehImpact: null,
    followupStatus: null,
  });

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      try {
        setLoadingPlanets(true);
        const ownedPlanets = await listPlanetsByOwner(user.uid);
        if (!cancelled) {
          setPlanets(ownedPlanets);
          setValue((current) => ({
            ...current,
            planetId: current.planetId || ownedPlanets[0]?.id || "",
          }));
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : L4(lang, { ko: "행성 목록을 불러오지 못했습니다.", en: "Failed to load planets.", ja: "惑星一覧을 불러오지 못했습니다.", zh: "星球列表을 불러오지 못했습니다." }));
        }
      } finally {
        if (!cancelled) {
          setLoadingPlanets(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [lang, user]);

  const planetOptions = useMemo(
    () => planets.map((planet) => ({ id: planet.id, name: planet.name })),
    [planets],
  );

  const handleInsertTemplate = () => {
    setValue((current) => ({
      ...current,
      content: REPORT_TYPE_TEMPLATES[current.reportType][lang === "ko" ? "ko" : "en"],
    }));
  };

  const handleSubmit = async () => {
    if (!user || !value.planetId || !value.title.trim() || !value.content.trim() || !value.eventCategory.trim()) {
      setError(lang === "ko" ? "필수 항목을 입력해주세요." : "Please fill in required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await ensureNetworkUserRecord({
        uid: user.uid,
        displayName: user.displayName,
      });

      const post = await createPost({
        authorId: user.uid,
        planetId: value.planetId,
        reportType: value.reportType,
        title: value.title,
        content: value.content,
        eventCategory: value.eventCategory,
        region: value.region,
        intervention: value.intervention,
        ehImpact: value.ehImpact,
        followupStatus: value.followupStatus,
      });

      // 구글 Agent Builder 엔진에 방금 쓴 로그 밀어넣기!
      const idToken = await user.getIdToken();
      ingestAgent({
        documentId: post.id,
        title: `게시글: ${value.title}`,
        content: `분류: ${value.reportType}\n사건 유형: ${value.eventCategory}\n\n${value.content}`,
        planetId: value.planetId,
        isPublic: true,
      }, idToken).catch((err: unknown) => {
        logger.warn('NetworkLogNewClient', 'ingestAgent failed', err);
      });

      router.push(`/network/planets/${post.planetId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : L4(lang, { ko: "로그 저장에 실패했습니다.", en: "Failed to save the log.", ja: "ログ 保存に失敗しました。", zh: "日志 保存失败。" }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{L4(lang, { ko: "로그인 필요", en: "Authentication Required", ja: "ログイン 필요", zh: "登录 필요" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "관측 로그를 쓰려면 로그인하세요.", en: "Sign in to publish a log.", ja: "観測 ログ를 쓰려면 ログイン하세요.", zh: "观测 日志를 쓰려면 登录하세요." })}
            </h1>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => void signInWithGoogle()} className="premium-button">
                {L4(lang, { ko: "Google 로그인", en: "Sign In with Google", ja: "Googleログイン", zh: "Google登录" })}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadingPlanets) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 flex flex-col items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-amber border-t-transparent mb-3" />
            <p className="text-sm text-text-tertiary">{L4(lang, { ko: "행성 목록을 불러오는 중...", en: "Loading planets...", ja: "惑星一覧을 불러오는 중...", zh: "星球列表을 불러오는 중..." })}</p>
          </section>
        </div>
      </main>
    );
  }

  if (planets.length === 0) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{L4(lang, { ko: "먼저 행성을 등록하세요", en: "Create a Planet First", ja: "먼저 惑星을 登録하세요", zh: "먼저 星球을 提交하세요" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "로그는 소속 행성이 있어야 쌓입니다.", en: "Logs need a planet anchor before they can be published.", ja: "ログ는 所属惑星이 있어야 쌓입니다.", zh: "日志는 所属星球이 있어야 쌓입니다." })}
            </h1>
            <div className="mt-8 flex justify-center">
              <Link href="/network/new" className="premium-button">
                {L4(lang, { ko: "신규 행성 만들기", en: "Create New Planet", ja: "신규 惑星を作成", zh: "신규 创建星球" })}
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
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="site-kicker">{L4(lang, { ko: "관측 로그 작성", en: "Write Observation Log", ja: "観測 ログ 作成", zh: "观测 日志 撰写" })}</div>
            <h1 className="site-title mt-2 text-3xl font-semibold">
              {L4(lang, { ko: "이야기부터 떠오른 사람을 위한 빠른 작성 화면", en: "A fast composer for writers who start from the scene first.", ja: "이야기부터 떠오른 사람을 위한 빠른 作成 화면", zh: "이야기부터 떠오른 사람을 위한 빠른 撰写 화면" })}
            </h1>
          </div>
          <Link href="/network/new" className="premium-button secondary">
            {L4(lang, { ko: "신규 행성 만들기", en: "Create New Planet", ja: "신규 惑星を作成", zh: "신규 创建星球" })}
          </Link>
        </section>

        {error ? <p className="text-sm text-accent-red">{error}</p> : null}

        <LogComposer
          lang={lang}
          value={value}
          reportTypeOptions={LOG_REPORT_TYPES}
          planetOptions={planetOptions}
          showPlanetSelect
          submitting={submitting}
          submitLabel={L4(lang, { ko: "관측 로그 저장", en: "Publish Log", ja: "観測 ログ 保存", zh: "观测 日志 保存" })}
          onChange={setValue}
          onInsertTemplate={handleInsertTemplate}
          onSubmit={() => void handleSubmit()}
        />
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-1 | role=log composer entry page | inputs=auth user and owned planets | outputs=standalone log creation flow

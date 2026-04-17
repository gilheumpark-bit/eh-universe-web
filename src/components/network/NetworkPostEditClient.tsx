"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useNetworkAgent } from "@/lib/hooks/useNetworkAgent";
import { logger } from "@/lib/logger";
import { LogComposer, type LogComposerValue } from "@/components/network/LogComposer";
import { updatePost, getPostById, getPlanetById } from "@/lib/network-firestore";
import type { ReportType, PostRecord, PlanetRecord } from "@/lib/network-types";

const LOG_REPORT_TYPES: ReportType[] = ["observation", "incident", "testimony", "recovered"];

export function NetworkPostEditClient({ postId }: { postId: string }) {
  const router = useRouter();
  const { ingestAgent } = useNetworkAgent();
  const { lang } = useLang();
  const { user } = useAuth();
  
  const [post, setPost] = useState<PostRecord | null>(null);
  const [planet, setPlanet] = useState<PlanetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [value, setValue] = useState<LogComposerValue>({
    planetId: "",
    reportType: "observation",
    title: "",
    eventCategory: "",
    content: "",
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
        setLoading(true);
        const postData = await getPostById(postId);
        if (!postData) throw new Error("게시글을 찾을 수 없습니다.");
        
        if (postData.authorId !== user.uid) {
          throw new Error("수정 권한이 없습니다.");
        }

        const planetData = await getPlanetById(postData.planetId);

        if (!cancelled) {
          setPost(postData);
          setPlanet(planetData);
          setValue({
            planetId: postData.planetId,
            reportType: postData.reportType as Extract<ReportType, "observation" | "incident" | "testimony" | "recovered">,
            title: postData.title,
            eventCategory: postData.eventCategory || "",
            content: postData.content,
            region: postData.region || "",
            intervention: postData.intervention || false,
            ehImpact: postData.ehImpact || null,
            followupStatus: postData.followupStatus || null,
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : L4(lang, { ko: "데이터를 불러오지 못했습니다.", en: "Failed to load data.", ja: "データを読み込めませんでした。", zh: "无法加载数据。" }));
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
  }, [lang, user, postId]);

  const handleSubmit = async () => {
    if (!user || !post || !value.title.trim() || !value.content.trim() || !value.eventCategory.trim()) {
      setError(lang === "ko" ? "필수 항목을 입력해주세요." : "Please fill in required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const _updated = await updatePost({
        postId: post.id,
        updaterId: user.uid,
        title: value.title,
        content: value.content,
        reportType: value.reportType,
        eventCategory: value.eventCategory,
        region: value.region,
        intervention: value.intervention,
        ehImpact: value.ehImpact,
        followupStatus: value.followupStatus,
      });

      // 구글 Agent Builder 엔진에 덮어쓰기 (같은 documentId이므로 업데이트됨)
      const idToken = await user.getIdToken();
      ingestAgent({
        documentId: post.id,
        title: `게시글: ${value.title}`,
        content: `분류: ${value.reportType}\n사건 유형: ${value.eventCategory}\n\n${value.content}`,
        planetId: value.planetId,
        isPublic: true,
      }, idToken).catch((err: unknown) => {
        logger.warn('NetworkPostEditClient', 'ingestAgent failed', err);
      });

      router.push(`/network/posts/${post.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : L4(lang, { ko: "로그 수정에 실패했습니다.", en: "Failed to update the log.", ja: "ログ 編集に失敗しました。", zh: "日志 编辑失败。" }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 flex flex-col items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-amber border-t-transparent mb-3" />
            <p className="text-sm text-text-tertiary">{L4(lang, { ko: "게시글을 불러오는 중...", en: "Loading post...", ja: "投稿を読み込み中...", zh: "正在加载帖子..." })}</p>
          </section>
        </div>
      </main>
    );
  }

  if (error && !post) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center text-accent-red">
            {error}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-6 py-8 md:py-10">
        <Link href={`/network/posts/${postId}`} className="inline-flex items-center gap-1 font-mono text-xs tracking-widest text-text-tertiary transition hover:text-accent-amber">
          &larr; BACK TO POST
        </Link>
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="site-kicker">{L4(lang, { ko: "관측 로그 수정", en: "Edit Observation Log", ja: "観測 ログ 編集", zh: "观测 日志 编辑" })}</div>
            <h1 className="site-title mt-2 text-3xl font-semibold">
              {value.title}
            </h1>
          </div>
        </section>

        {error ? <p className="text-sm text-accent-red">{error}</p> : null}

        <LogComposer
          lang={lang}
          value={value}
          reportTypeOptions={LOG_REPORT_TYPES}
          planetOptions={planet ? [{ id: planet.id, name: planet.name }] : []}
          showPlanetSelect={false}
          submitting={submitting}
          submitLabel={L4(lang, { ko: "수정 완료", en: "Save Changes", ja: "編集完了", zh: "编辑完成" })}
          onChange={setValue}
          onInsertTemplate={() => {}} // 템플릿 삽입 없음
          onSubmit={() => void handleSubmit()}
        />
      </div>
    </main>
  );
}

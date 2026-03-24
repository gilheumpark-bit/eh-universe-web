"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { SettlementBadge } from "@/components/network/SettlementBadge";
import {
  createSettlement,
  ensureNetworkUserRecord,
  getPlanetsByIds,
  getNetworkUserRecord,
  listLatestPosts,
  listLatestSettlements,
} from "@/lib/network-firestore";
import { canCreateSettlement } from "@/lib/network-permissions";
import { PLANET_STATUSES, type PlanetStatus, type PostRecord, type SettlementRecord, type UserRecord } from "@/lib/network-types";
import { PLANET_STATUS_LABELS, pickNetworkLabel } from "@/lib/network-labels";

// ============================================================
// PART 1 - DATA AND STATE
// ============================================================

export function SettlementWorkbench() {
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();
  const [viewerRecord, setViewerRecord] = useState<UserRecord | null>(null);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [planetMap, setPlanetMap] = useState<Record<string, { id: string; name: string }>>({});
  const [selectedPostId, setSelectedPostId] = useState("");
  const [verdict, setVerdict] = useState<PlanetStatus>("maintain");
  const [ehValue, setEhValue] = useState<number | null>(null);
  const [risk, setRisk] = useState<number | null>(null);
  const [action, setAction] = useState("");
  const [archiveLevel, setArchiveLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      try {
        setError(null);
        await ensureNetworkUserRecord({
          uid: user.uid,
          displayName: user.displayName,
        });

        const [record, latestPosts, latestSettlements] = await Promise.all([
          getNetworkUserRecord(user.uid),
          listLatestPosts(20, "log"),
          listLatestSettlements(10),
        ]);
        const planets = await getPlanetsByIds(latestPosts.map((post) => post.planetId));

        if (!cancelled) {
          setViewerRecord(record);
          setPosts(latestPosts);
          setSettlements(latestSettlements);
          setPlanetMap(
            Object.fromEntries(
              Object.values(planets).map((planet) => [planet.id, { id: planet.id, name: planet.name }]),
            ),
          );
          setSelectedPostId((current) => current || latestPosts[0]?.id || "");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : lang === "ko" ? "정산 데이터를 불러오지 못했습니다." : "Failed to load settlements.");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [lang, user]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const canSubmit = Boolean(
    user && selectedPost && canCreateSettlement(viewerRecord) && !submitting,
  );

  const handleSubmit = async () => {
    if (!user || !selectedPost || !canCreateSettlement(viewerRecord)) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await createSettlement({
        operatorId: user.uid,
        planetId: selectedPost.planetId,
        postId: selectedPost.id,
        verdict,
        ehValue,
        risk,
        action,
        archiveLevel,
      });

      setSettlements((current) => [created, ...current]);
      setAction("");
      setArchiveLevel("");
      setEhValue(null);
      setRisk(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : lang === "ko" ? "정산 저장에 실패했습니다." : "Failed to save settlement.");
    } finally {
      setSubmitting(false);
    }
  };

  // IDENTITY_SEAL: PART-1 | role=workbench data loader | inputs=auth user and latest logs | outputs=settlement form state

  // ============================================================
  // PART 2 - RENDER
  // ============================================================

  if (!user) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{lang === "ko" ? "운영자 로그인 필요" : "Administrator Sign-In Required"}</div>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => void signInWithGoogle()} className="premium-button">
                {lang === "ko" ? "Google 로그인" : "Sign In with Google"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!canCreateSettlement(viewerRecord)) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{lang === "ko" ? "권한 필요" : "Permission Required"}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {lang === "ko" ? "정산 워크벤치는 운영자 전용입니다." : "The settlement workbench is for administrators only."}
            </h1>
            <p className="site-lede mt-4 text-sm md:text-base">
              {lang === "ko"
                ? "현재 계정은 회원 권한으로 인식되었습니다. Firestore users 문서의 role 값을 admin으로 지정하면 사용할 수 있습니다."
                : "This account is currently recognized as a member. Set users/{uid}.role to admin in Firestore to enable this screen."}
            </p>
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
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="premium-panel p-6 md:p-8">
          <div className="site-kicker">{lang === "ko" ? "정산 워크벤치" : "Settlement Workbench"}</div>
          <h1 className="site-title mt-3 text-3xl font-semibold">
            {lang === "ko" ? "관측 로그를 선택하고 상태 판정을 부여하세요." : "Select a log and attach the current verdict."}
          </h1>

          <div className="mt-8 grid gap-4">
            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대상 로그" : "Target Log"}</div>
              <select
                value={selectedPostId}
                onChange={(event) => setSelectedPostId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
              >
                {posts.map((post) => (
                  <option key={post.id} value={post.id}>
                    {planetMap[post.planetId]?.name ?? post.planetId} · {post.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "판정" : "Verdict"}</div>
              <select
                value={verdict}
                onChange={(event) => setVerdict(event.target.value as PlanetStatus)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
              >
                {PLANET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "EH 수치" : "EH Value"}</div>
                <input
                  type="number"
                  min={-100}
                  max={100}
                  value={ehValue ?? ""}
                  onChange={(event) => setEhValue(event.target.value === "" ? null : Number.parseInt(event.target.value, 10))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
                />
              </label>
              <label className="block">
                <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "위험도" : "Risk"}</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={risk ?? ""}
                  onChange={(event) => setRisk(event.target.value === "" ? null : Number.parseInt(event.target.value, 10))}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "보관 등급" : "Archive Level"}</div>
              <input
                value={archiveLevel}
                onChange={(event) => setArchiveLevel(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "권고 조치" : "Recommended Action"}</div>
              <textarea
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="min-h-[180px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
              />
            </label>
          </div>

          {error ? <p className="mt-5 text-sm text-accent-red">{error}</p> : null}

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit} className="premium-button">
              {submitting ? (lang === "ko" ? "저장 중..." : "Saving...") : lang === "ko" ? "정산 기록 저장" : "Save Settlement"}
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="premium-panel-soft p-5">
            <div className="site-kicker">{lang === "ko" ? "대상 미리보기" : "Selected Log Preview"}</div>
            {selectedPost ? (
              <>
                <h2 className="mt-3 text-lg font-semibold text-text-primary">{selectedPost.title}</h2>
                <p className="mt-3 text-sm text-text-secondary">{selectedPost.summary}</p>
                <div className="mt-4 text-xs text-text-tertiary">
                  {planetMap[selectedPost.planetId]?.name ?? selectedPost.planetId}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">{lang === "ko" ? "선택된 로그가 없습니다." : "No log selected."}</p>
            )}
          </div>

          <div className="premium-panel-soft p-5">
            <div className="site-kicker">{lang === "ko" ? "최근 정산" : "Recent Settlements"}</div>
            <div className="mt-4 space-y-3">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text-primary">{planetMap[settlement.planetId]?.name ?? settlement.planetId}</span>
                    <SettlementBadge status={settlement.verdict} lang={lang} />
                  </div>
                  <div className="mt-2 text-xs text-text-tertiary">
                    {new Date(settlement.createdAt).toLocaleString(lang === "ko" ? "ko-KR" : "en-US")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=settlement workbench renderer | inputs=admin state and latest logs | outputs=settlement creation UI

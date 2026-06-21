"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Alert, Check, Sync, Wand, X } from "@/components/loreguard/icons";
import type { EpisodeManuscript } from "@/lib/studio-types";
import { analyzeRevision, revisionIssues } from "@/lib/desktop/revision-analysis";
import { scanAISignature } from "@/lib/creative/ai-signature-scan";
import { analyzeRhythm } from "@/lib/creative/rhythm-analysis";
import { auditManuscript, auditVerdict } from "@/lib/creative/qa-auditor";
import {
  buildChapterReactionForecast,
  buildEpisodeReactionForecasts,
} from "@/lib/creative/chapter-reaction-forecast";
import { computeIntegratedGrade } from "@/lib/creative/integrated-grade";
import RevisionCompressionCard from "./RevisionCompressionCard";
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import { lazyFirebaseAuth } from "@/lib/firebase";
import {
  buildCharacterDnaBlock,
  buildSceneSheetBlock,
  buildStorySummaryBlock,
  CRITIQUE_LABEL,
  CRITIQUE_ORDER,
  FINDING_TYPE_LABEL,
  MAX_AI_CHARS,
  parseProofreadFindings,
  PROOFREAD_SCHEMA,
  REACTION_RISK_LABEL,
  SEVERITY_LABEL,
  type ProofreadFinding,
} from "./RevisionPanel.proofread";

type AiStatus = "idle" | "working" | "success" | "error";

// ============================================================
// PART 4 — 메인 컴포넌트
// ============================================================

export default function RevisionPanel() {
  const { currentSession, language, hasAiAccess, setShowApiKeyModal } = useStudio();

  const [open, setOpen] = useState(false);
  /** 이벤트 detail.episode 로 지정된 회차 (null = config.episode 따름). */
  const [requestedEpisode, setRequestedEpisode] = useState<number | null>(null);

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFindings, setAiFindings] = useState<ProofreadFinding[] | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  // (g) 신호 압축 — raw 전체 보기 토글 (기본 = vital-few 압축 표시·raw 접근 유지)
  const [showRaw, setShowRaw] = useState(false);

  // ----- 오픈 이벤트 청취 — unmount 시 cleanup (CpJournalPanel 동일 패턴) -----
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ episode?: unknown }>).detail;
      const ep = detail && typeof detail.episode === "number" ? detail.episode : null;
      setRequestedEpisode(ep); // 미지정 오픈은 현재 회차로 리셋 (stale 바인딩 차단)
      setOpen(true);
    };
    window.addEventListener("loreguard:open-revision", onOpen);
    return () => window.removeEventListener("loreguard:open-revision", onOpen);
  }, []);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ----- 닫힘/unmount 시 진행 중 AI 요청 중단 (cleanup) -----
  // (near-miss 기록은 RevisionCompressionCard 가 자기 unmount 에서 수행)
  useEffect(() => {
    if (open) return;
    aiAbortRef.current?.abort();
  }, [open]);
  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

  // ----- 대상 원고 해석 — manuscripts[requested ?? config.episode] ?? 최신 -----
  const config = currentSession?.config;
  const sessionId = currentSession?.id ?? null;

  const manuscripts = useMemo<EpisodeManuscript[]>(() => {
    const list = config?.manuscripts ?? [];
    return [...list].sort((a, b) => a.episode - b.episode);
  }, [config]);

  const target = useMemo<EpisodeManuscript | null>(() => {
    const byReq =
      requestedEpisode != null
        ? manuscripts.find((m) => m.episode === requestedEpisode)
        : undefined;
    const byCur =
      config?.episode != null ? manuscripts.find((m) => m.episode === config.episode) : undefined;
    return byReq ?? byCur ?? manuscripts[manuscripts.length - 1] ?? null;
  }, [manuscripts, requestedEpisode, config?.episode]);

  // ----- 세션 전환 시 회차 지정·AI 결과 폐기 (cross-session 오귀속 차단) -----
  useEffect(() => {
    setRequestedEpisode(null);
    aiAbortRef.current?.abort();
    setAiStatus("idle");
    setAiError(null);
    setAiFindings(null);
    setShowRaw(false);
  }, [sessionId]);

  // ----- 대상 회차 전환 시 AI 결과 폐기 (보고서는 특정 본문에 귀속) -----
  const targetEpisode = target?.episode ?? null;
  useEffect(() => {
    aiAbortRef.current?.abort();
    setAiStatus("idle");
    setAiError(null);
    setAiFindings(null);
  }, [targetEpisode]);

  // ----- (a)-(f) 분석 — 오픈 중에만 계산 (전부 빈 입력 안전 순수 함수) -----
  const text = open && target?.content ? target.content : "";

  const metrics = useMemo(() => analyzeRevision(text), [text]);
  const issues = useMemo(() => revisionIssues(metrics), [metrics]);
  const sig = useMemo(() => scanAISignature(text), [text]);
  const rhythm = useMemo(() => analyzeRhythm(text), [text]);
  const audit = useMemo(() => auditManuscript(text), [text]);
  const verdict = useMemo(() => auditVerdict(audit), [audit]);
  const reactionForecast = useMemo(() => buildChapterReactionForecast(text, "basic-16"), [text]);
  const episodeReactionForecast = useMemo(
    () =>
      buildEpisodeReactionForecasts(
        open
          ? manuscripts.map((manuscript) => ({
              episode: manuscript.episode,
              title: manuscript.title,
              content: manuscript.content,
            }))
          : [],
        "basic-16",
      ),
    [manuscripts, open],
  );

  // (f) 통합등급 — writing/revision 실측 + 4축 config 보유 프록시 (데스크톱 동일 정신·판단용)
  const grade = useMemo(() => {
    const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
    const sheet = config?.episodeSceneSheets?.find((s) => s.episode === targetEpisode);
    const hasWorld = Boolean(
      config?.corePremise?.trim() || config?.worldHistory?.trim() || config?.worldSimData,
    );
    const hasCharacter = Boolean(config?.characters?.some((c) => c.name.trim()));
    const hasScene = Boolean((config?.episodeSceneSheets?.length ?? 0) > 0);
    const hasDirection = Boolean(
      sheet?.directionSnapshot ||
        config?.sceneDirection ||
        sheet?.scenes?.some((s) => s.tone.trim() || s.summary.trim()),
    );
    return computeIntegratedGrade({
      writing: clamp(100 - sig.score),
      revision: clamp(100 - metrics.tellPct - metrics.repetitionPct / 2),
      world: hasWorld ? 75 : 45,
      character: hasCharacter ? 75 : 45,
      scene: hasScene ? 75 : 45,
      direction: hasDirection ? 75 : 45,
    });
  }, [config, targetEpisode, sig.score, metrics.tellPct, metrics.repetitionPct]);

  // ----- 노아 퇴고 보고서 — studio-proofread 경유 (진단 표시만·자동 수정 금지) -----
  const handleAiReport = useCallback(async () => {
    if (aiStatus === "working" || !config || !target?.content?.trim()) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setAiStatus("working");
    setAiError(null);
    try {
      const provider = getActiveProvider();
      const apiKey = getApiKey(provider);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // 호스팅 크레딧 사용자 (BYOK 없음) — Firebase JWT 첨부 (TabDirection 동일 패턴)
      try {
        const auth = await lazyFirebaseAuth();
        const u = auth?.currentUser;
        if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
      } catch {
        /* BYOK-only flow 는 토큰 없이도 동작 */
      }
      // system = 선등록 studio-proofread (리포트 전용·재작성 금지 duty + no-yap-json 가드
      // 자동 주입). 라우트는 passthrough → 가드 주입 지점은 여기(클라이언트)뿐.
      const system = buildAgentSystemPrompt(
        "studio-proofread",
        {
          "character-dna": buildCharacterDnaBlock(config.characters ?? []),
          "scene-sheet": buildSceneSheetBlock(
            config.episodeSceneSheets?.find((s) => s.episode === target.episode),
          ),
          "story-summary": buildStorySummaryBlock(config),
        },
        { autoTrim: true },
      );
      const truncated = target.content.length > MAX_AI_CHARS;
      const body = target.content.slice(0, MAX_AI_CHARS);
      const userBlock = `[퇴고 진단 대상 원고 — ${target.episode}화${target.title ? ` · ${target.title}` : ""}]${
        truncated ? `\n(원고가 길어 앞 ${MAX_AI_CHARS.toLocaleString()}자만 진단 대상입니다)` : ""
      }\n${body}`;
      const res = await fetch("/api/structured-generate", {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          provider,
          prompt: `${system}\n\n${userBlock}`,
          schema: PROOFREAD_SCHEMA,
          apiKey: apiKey || undefined,
          fallback: { findings: [] },
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const paywallMsg = checkPaywallJson(data);
        if (paywallMsg) throw new Error(paywallMsg);
        const serverError = (data as { error?: unknown } | null)?.error;
        throw new Error(
          typeof serverError === "string" ? serverError : `요청 실패 (HTTP ${res.status})`,
        );
      }
      // [N4] 차단 계약 {blocked, reason, gradeRequired} → toast 고지 + 인라인 에러 표시
      const blockedMsg = checkBlockedJson(data, "revision-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      // findings 0건은 유효한 결과 ("발견 없음") — 에러로 위장하지 않는다 (정직 표면화)
      setAiFindings(parseProofreadFindings(data));
      setAiStatus("success");
    } catch (err) {
      // 중단(AbortError)은 에러 아님 — 새 요청/닫기가 상태를 이어받는다
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setAiStatus("error");
        setAiError(err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160));
      }
    }
  }, [aiStatus, config, target, hasAiAccess, setShowApiKeyModal]);

  // ----- 가드: 미오픈/세션 없음 → 미렌더 (CpJournalPanel gating 동일) -----
  if (!open || !currentSession) return null;

  const judgementLabel = L4(language, {
    ko: "작가 결정",
    en: "Author decides",
  });
  const hasText = text.trim().length > 0;
  const aiTruncNotice = (target?.content?.length ?? 0) > MAX_AI_CHARS;

  /** 중립 지표 셀 — 점수 색 경고 없음 (전부 동일 톤·판단은 작가 몫). */
  const metric = (label: string, val: string) => (
    <div
      key={label}
      style={{
        border: "1px solid var(--line)",
        background: "var(--card-2)",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)" }}>{val}</div>
    </div>
  );

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "퇴고 패널", en: "Revision panel" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Wand size={16} />
          {L4(language, { ko: "퇴고", en: "Revision" })}
          <span className="pill gray">{judgementLabel}</span>
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* 대상 회차 — 표시 + (복수 회차 시) 선택. 쓰기 0 (읽기 전용 패널) */}
        {manuscripts.length > 0 && target && (
          <div className="wr-srow" style={{ gap: 10 }}>
            <label
              htmlFor="rv-episode"
              style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}
            >
              {L4(language, { ko: "대상 회차", en: "Target episode" })}
            </label>
            {manuscripts.length > 1 ? (
              <select
                id="rv-episode"
                value={target.episode}
                onChange={(e) => setRequestedEpisode(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 9,
                  border: "1px solid var(--line)",
                  background: "var(--card-2)",
                  color: "inherit",
                  font: "inherit",
                  fontSize: 12.5,
                }}
              >
                {manuscripts.map((m) => (
                  <option key={m.episode} value={m.episode}>
                    {L4(language, {
                      ko: `EP.${m.episode}${m.title ? ` · ${m.title}` : ""} (${m.content.length.toLocaleString()}자)`,
                      en: `EP.${m.episode}${m.title ? ` · ${m.title}` : ""} (${m.content.length.toLocaleString()} chars)`,
                    })}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                {L4(language, {
                  ko: `EP.${target.episode}${target.title ? ` · ${target.title}` : ""}`,
                  en: `EP.${target.episode}${target.title ? ` · ${target.title}` : ""}`,
                })}
              </span>
            )}
          </div>
        )}

        {/* 빈 상태 — 정직 표면화 (원고 없으면 분석 0) */}
        {!hasText && (
          <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
            {L4(language, {
              ko: "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 문장 상태가 표시됩니다",
              en: "No saved episode manuscript — save a draft in the Writing tab to see revision status",
            })}
          </div>
        )}

        {hasText && (
          <>
            {/* (g) 신호 압축 — 하인리히 300→29→1: vital-few + 1 verdict 우선 표시.
                unmount(닫힘) 시 잔존 WARN 을 near-miss 로 누적 (카드 내부 책임) */}
            <RevisionCompressionCard
              metrics={metrics}
              issues={issues}
              sigHits={sig.hits}
              sigScore={sig.score}
              audit={audit}
              language={language}
              judgementLabel={judgementLabel}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw((v) => !v)}
            />

            {/* (a) 기본 지표 — revision-analysis */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "문장 상태", en: "Revision status" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                {metric(L4(language, { ko: "글자 수", en: "Characters" }), metrics.chars.toLocaleString())}
                {metric(L4(language, { ko: "설명형 문장", en: "Telling" }), `${metrics.tellPct}%`)}
                {metric(L4(language, { ko: "반복어", en: "Repetition" }), `${metrics.repetitionPct}%`)}
                {metric(L4(language, { ko: "대사 비율", en: "Dialogue" }), `${metrics.dialoguePct}%`)}
                {metric(
                  L4(language, { ko: "문장 다양성", en: "Sentence variety" }),
                  `${metrics.sentenceVariety}`,
                )}
                {metric(
                  L4(language, { ko: "평균 문장", en: "Avg sentence" }),
                  L4(language, { ko: `${metrics.avgLen}자`, en: `${metrics.avgLen} chars` }),
                )}
              </div>
              {/* 퇴고 이슈 raw — 신호 압축에 병합됨 · "전체 보기" 토글 시에만 (정보 은닉 아님) */}
              {showRaw && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 6 }}>
                    {L4(language, { ko: `세부 후보 (${issues.length})`, en: `Detailed findings (${issues.length})` })}
                  </div>
                  {issues.length === 0 ? (
                    <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                      {L4(language, { ko: "지금 바로 볼 후보는 없습니다", en: "No immediate findings" })}
                    </div>
                  ) : (
                    <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
                      {issues.map((it, i) => (
                        <li key={i} className="wr-srow" style={{ alignItems: "flex-start" }}>
                          <Alert size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--ink-3)" }} aria-hidden />
                          <span>{it.hint}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* (e)(b)(c) 독자 반응 — 예측 가치를 먼저 보여주고, 문장 지표는 보조로 둔다. */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "사전 독자 반응", en: "Pre-reader response" })}
                <span className="pill gray">{L4(language, { ko: "16관점", en: "16 views" })}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                {metric(
                  L4(language, { ko: "예상 몰입도", en: "Expected engagement" }),
                  `${reactionForecast.avgEngagement}`,
                )}
                {metric(
                  L4(language, { ko: "이탈 신호", en: "Dropout signals" }),
                  `${reactionForecast.dropoutCount}/16`,
                )}
                {metric(
                  L4(language, { ko: "위험 최고 회차", en: "Highest-risk episode" }),
                  `${episodeReactionForecast.maxDropoutCount}/16`,
                )}
              </div>

              <div className="wr-srow" style={{ alignItems: "flex-start", marginTop: 8 }}>
                <span className="rdot blue" style={{ marginTop: 4 }} />
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {L4(language, { ko: "다음 화 클릭 이유", en: "Next-click reason" })}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-1)", margin: "2px 0 0", lineHeight: 1.5 }}>
                    {reactionForecast.summary.nextClickReason}
                  </p>
                </div>
              </div>
              {episodeReactionForecast.worstEpisode && (
                <p style={{ fontSize: 11, color: "var(--ink-2)", margin: "8px 0 0" }}>
                  {L4(language, {
                    ko: `우선 손볼 회차: EP.${episodeReactionForecast.worstEpisode.episode} · 이탈 신호 ${episodeReactionForecast.worstEpisode.dropoutCount}/16`,
                    en: `Review first: EP.${episodeReactionForecast.worstEpisode.episode} · dropout signals ${episodeReactionForecast.worstEpisode.dropoutCount}/16`,
                  })}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {metric(
                  L4(language, {
                    ko: "표현 습관",
                    en: "Writing style",
                    ja: "表現のクセ",
                    zh: "表达习惯",
                  }),
                  `${sig.score}`,
                )}
                {metric(
                  L4(language, { ko: "문장 리듬 변화", en: "Rhythm variance" }),
                  rhythm.micro.burstiness.toFixed(2),
                )}
                {metric(
                  L4(language, { ko: "단락 수", en: "Paragraphs" }),
                  `${rhythm.macro.paragraphCount}`,
                )}
              </div>
              {/* 표현 습관 raw — 압축에 병합 · 토글 시에만 */}
              {showRaw && sig.hits.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                  {L4(language, {
                    ko: "어색한 표현 후보:",
                    en: "Awkward phrasing:",
                    ja: "違和感のある表現:",
                    zh: "生硬表达：",
                  })}{" "}
                  {sig.hits.slice(0, 4).map((h) => `${h.pattern}(${h.count})`).join(" · ")}
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                {L4(language, {
                  ko: `${reactionForecast.modeLabel} · 사전 예측 점검`,
                  en: `${reactionForecast.modeLabel} — virtual review, not real reader data.`,
                })}
              </p>
              {showRaw && (
                <div style={{ marginTop: 8 }}>
                  <div className="wr-srow">
                    <span className="rdot blue" />
                    {L4(language, { ko: "이탈 위험", en: "Dropout risk" })}
                    <b>{L4(language, REACTION_RISK_LABEL[reactionForecast.summary.dropoutRisk])}</b>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "4px 0" }}>
                    {reactionForecast.summary.immersionPoint}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "4px 0" }}>
                    {reactionForecast.summary.confusionPoint}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "4px 0" }}>
                    {reactionForecast.summary.nextClickReason}
                  </p>
                </div>
              )}
            </div>

            {/* (d) 감평 시스템 — 평론가·작가·편집자 관점. 독자 반응 예측과 분리해 상시 표시. */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "감평 시스템", en: "Critique system" })}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, { ko: "평론가 · 작가", en: "Critic · Writer" })}
                </span>
                <span className={"pill " + (verdict.passed ? "green" : "amber")}>
                  {L4(language, {
                    ko: verdict.passed ? "통과" : "검토",
                    en: verdict.passed ? "pass" : "review",
                  })}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {CRITIQUE_ORDER.map((perspective) => (
                  <div key={perspective} className="wr-srow">
                    {L4(language, CRITIQUE_LABEL[perspective])}
                    <b>{verdict.byPerspective[perspective]}</b>
                  </div>
                ))}
              </div>
              {audit.length === 0 ? (
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  {L4(language, {
                    ko: "감평 관점에서 바로 볼 후보는 없습니다.",
                    en: "No immediate critique findings.",
                  })}
                </div>
              ) : (
                <>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
                    {audit.slice(0, showRaw ? audit.length : 4).map((f, i) => (
                      <li key={i} className="wr-srow" style={{ alignItems: "flex-start" }}>
                        <span className="pill gray" style={{ flexShrink: 0 }}>
                          {L4(language, CRITIQUE_LABEL[f.perspective])}
                        </span>
                        <span>
                          {f.issue}{" "}
                          <span style={{ color: "var(--ink-3)" }}>
                            ({L4(language, SEVERITY_LABEL[f.severity === "mid" ? "medium" : f.severity])})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!showRaw && audit.length > 4 && (
                    <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                      {L4(language, {
                        ko: `감평 후보 ${audit.length - 4}건은 전체 보기에서 확인할 수 있습니다.`,
                        en: `${audit.length - 4} more critique findings are available in full view.`,
                      })}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* (f) 통합등급 — 중립 표시 (색 경고 없음) */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "원고 준비도", en: "Manuscript readiness" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-1)" }}>{grade.grade}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  {L4(language, {
                    ko: `${grade.weighted}점 · 먼저 볼 항목 ${grade.weakest}`,
                    en: `${grade.weighted} pts · review first: ${grade.weakest}`,
                  })}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                {L4(language, {
                  ko: "원고에서 계산한 문장 상태와 현재 채워진 설정 상태를 함께 본 준비도입니다.",
                  en: "Readiness combines manuscript signals with the setup already filled in.",
                })}
              </p>
            </div>

            {/* + 노아 퇴고 보고서 — studio-proofread (진단 목록 표시만 · 자동 수정 금지) */}
            <div className="pcard">
              <div className="pcard-h">
                <Wand size={15} />
                {L4(language, { ko: "노아 퇴고 보고서", en: "Noa revision report" })}
                <span className="pill gray">{judgementLabel}</span>
                {aiStatus === "success" && (
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    <Check size={12} />
                    {L4(language, { ko: "검토 완료", en: "Done" })}
                  </span>
                )}
              </div>
              <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                {L4(language, {
                  ko: "검토 의견만 보여줍니다. 원고를 고칠지는 작가가 결정합니다.",
                  en: "Shows review notes only. The author decides what to change.",
                })}
              </div>
              {aiTruncNotice && (
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  {L4(language, {
                    ko: `원고가 길어 앞 ${MAX_AI_CHARS.toLocaleString()}자부터 먼저 봅니다`,
                    en: `Long manuscript — reviewing the first ${MAX_AI_CHARS.toLocaleString()} chars first`,
                  })}
                </div>
              )}
              <button
                type="button"
                className="btn primary"
                aria-label={L4(language, {
                  ko: "노아 퇴고 의견 받기",
                  en: "Get Noa revision notes",
                })}
                style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                disabled={aiStatus === "working"}
                onClick={handleAiReport}
              >
                {aiStatus === "working" ? (
                  <>
                    <Sync size={14} className="animate-spin" />
                    {L4(language, { ko: "검토 중…", en: "Reviewing…" })}
                  </>
                ) : (
                  <>
                    <Wand size={14} />
                    {L4(language, { ko: "노아 퇴고 의견 받기", en: "Get Noa notes" })}
                  </>
                )}
              </button>
              {aiStatus === "error" && aiError && (
                <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
                  <span className="rdot amber" />
                  {L4(language, { ko: "검토를 만들지 못했습니다:", en: "Review failed:" })} {aiError}
                  <button
                    type="button"
                    className="mini-btn"
                    style={{ marginLeft: "auto" }}
                    onClick={handleAiReport}
                  >
                    <Sync size={13} />
                    {L4(language, { ko: "다시 시도", en: "Retry" })}
                  </button>
                </div>
              )}
              {aiStatus === "working" && (
                <div className="wr-srow" role="status" aria-live="polite" style={{ marginTop: 6 }}>
                  <span className="rdot blue" />
                  {L4(language, { ko: "반복, 인과, 목소리, 속도를 살피는 중…", en: "Reviewing repetition, causality, voice, and pacing…" })}
                </div>
              )}
              {aiStatus === "success" && aiFindings && (
                aiFindings.length === 0 ? (
                  <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 6 }}>
                    {L4(language, {
                      ko: "노아가 추가로 짚을 부분은 없습니다",
                      en: "Noa found no additional points",
                    })}
                  </div>
                ) : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                    {aiFindings.map((f, i) => (
                      <li
                        key={i}
                        style={{
                          border: "1px solid var(--line)",
                          background: "var(--card-2)",
                          borderRadius: 12,
                          padding: "10px 12px",
                          fontSize: 12.5,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span className="pill gray">
                            {L4(language, FINDING_TYPE_LABEL[f.type])}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                            {L4(language, {
                              ko: `중요도 ${SEVERITY_LABEL[f.severity].ko}`,
                              en: `importance: ${SEVERITY_LABEL[f.severity].en}`,
                            })}
                          </span>
                        </div>
                        {f.location && (
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
                            “{f.location}”
                          </div>
                        )}
                        <div style={{ color: "var(--ink-1)" }}>{f.diagnosis}</div>
                        {f.suggestion && (
                          <div style={{ color: "var(--ink-2)", marginTop: 4 }}>
                            {L4(language, { ko: "고쳐볼 방향:", en: "Direction:" })} {f.suggestion}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
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
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";
import { lazyFirebaseAuth } from "@/lib/firebase";
import {
  buildCharacterDnaBlock,
  buildSceneSheetBlock,
  buildStorySummaryBlock,
  MAX_AI_CHARS,
  parseProofreadFindings,
  PROOFREAD_SCHEMA,
  type ProofreadFinding,
} from "./RevisionPanel.proofread";
import { RevisionPanelView, type RevisionAiStatus } from "./RevisionPanel.view";

export default function RevisionPanel() {
  const { currentSession, language, hasAiAccess, setShowApiKeyModal } = useStudio();
  const [open, setOpen] = useState(false);
  const [requestedEpisode, setRequestedEpisode] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<RevisionAiStatus>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFindings, setAiFindings] = useState<ProofreadFinding[] | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const aiAbortRef = useRef<AbortController | null>(null);

  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ episode?: unknown }>).detail;
      const ep = detail && typeof detail.episode === "number" ? detail.episode : null;
      setRequestedEpisode(ep);
      setOpen(true);
    };
    window.addEventListener("loreguard:open-revision", onOpen);
    return () => window.removeEventListener("loreguard:open-revision", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) return;
    aiAbortRef.current?.abort();
  }, [open]);

  useEffect(() => {
    return () => {
      aiAbortRef.current?.abort();
    };
  }, []);

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

  useEffect(() => {
    setRequestedEpisode(null);
    aiAbortRef.current?.abort();
    setAiStatus("idle");
    setAiError(null);
    setAiFindings(null);
    setShowRaw(false);
  }, [sessionId]);

  const targetEpisode = target?.episode ?? null;

  useEffect(() => {
    aiAbortRef.current?.abort();
    setAiStatus("idle");
    setAiError(null);
    setAiFindings(null);
  }, [targetEpisode]);

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
      try {
        const auth = await lazyFirebaseAuth();
        const u = auth?.currentUser;
        if (u) headers.Authorization = `Bearer ${await u.getIdToken()}`;
      } catch {
        /* BYOK-only flow works without a token. */
      }
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
      const blockedMsg = checkBlockedJson(data, "revision-ai");
      if (blockedMsg) throw new Error(blockedMsg);
      setAiFindings(parseProofreadFindings(data));
      setAiStatus("success");
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setAiStatus("error");
        setAiError(err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160));
      }
    }
  }, [aiStatus, config, target, hasAiAccess, setShowApiKeyModal]);

  if (!open || !currentSession) return null;

  const judgementLabel = L4(language, {
    ko: "작가 결정",
    en: "Author decides",
  });
  const hasText = text.trim().length > 0;

  return (
    <RevisionPanelView
      language={language}
      dialogRef={dialogRef}
      onClose={() => setOpen(false)}
      manuscripts={manuscripts}
      target={target}
      setRequestedEpisode={setRequestedEpisode}
      hasText={hasText}
      metrics={metrics}
      issues={issues}
      sig={sig}
      rhythm={rhythm}
      audit={audit}
      verdict={verdict}
      reactionForecast={reactionForecast}
      episodeReactionForecast={episodeReactionForecast}
      grade={grade}
      judgementLabel={judgementLabel}
      showRaw={showRaw}
      onToggleRaw={() => setShowRaw((v) => !v)}
      aiStatus={aiStatus}
      aiError={aiError}
      aiFindings={aiFindings}
      aiTruncNotice={(target?.content?.length ?? 0) > MAX_AI_CHARS}
      onAiReport={handleAiReport}
    />
  );
}

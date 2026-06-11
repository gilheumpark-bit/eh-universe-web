"use client";

/* ===========================================================
   RevisionPanel — 퇴고 slide-over (B-revision-panel)

   오픈: window CustomEvent 'loreguard:open-revision'
         (mount·dispatch 는 TabWriting 측 담당 — 이 파일은 수신만.
          detail.episode(number) 가 오면 해당 회차, 없으면 config.episode).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — CpJournalPanel 과 동일 slide-over 패턴.

   내용 (데스크톱 src/app/desktop/page.tsx RevisionPanel 흡수 — 전부 기존 엔진 재사용·신규 엔진 0):
   (a) 기본 지표      → @/lib/desktop/revision-analysis  analyzeRevision·revisionIssues
   (b) AI 시그니처    → @/lib/creative/ai-signature-scan  scanAISignature
   (c) 리듬           → @/lib/creative/rhythm-analysis    analyzeRhythm
   (d) QA 4감사관     → @/lib/creative/qa-auditor         auditManuscript·auditVerdict (비수렴 4관점 그대로)
   (e) 16독자 패널    → @/lib/creative/reader-persona-16  panelReaction (시뮬레이션 근사 — 실측 아님)
   (f) 통합등급       → @/lib/creative/integrated-grade   computeIntegratedGrade
       · writing/revision 축 = 실측 산식 (데스크톱 RevisionPanel 동일 공식)
       · world/character/scene/direction 축 = config 보유 여부 75/45 프록시
         (데스크톱 contextItems has() 프록시와 동일 정신 — 실측 아님·판단용 명시)
   (g) 신호 압축      → ./RevisionCompressionCard (하인리히 300→29→1·X3)
       · (a)(b)(d) raw 검출을 클러스터·FMEA 로 압축 → vital-few + 1 verdict
         우선 표시. raw 목록은 "전체 보기" 토글(showRaw·본 파일 소유)로 접근
         유지 — 정보 은닉 아님. near-miss 누적은 카드 unmount 에서 기록.

   + AI 퇴고 보고서: buildAgentSystemPrompt('studio-proofread') — 레지스트리 선등록
     (리포트 전용·재작성 금지 duty + no-yap-json 가드 자동 주입) → /api/structured-generate
     (TabDirection handleAiSuggest 와 동일 호출 패턴: passthrough 라우트 → 가드는 클라이언트
     prompt 합성으로만 주입·BYOK 또는 Firebase JWT). 결과 = 진단 목록 *표시만* —
     자동 수정 절대 금지 (BareWrite 정책 — 수정은 작가가 리포트 검토 후 직접).

   대상 텍스트 = useStudio() currentSession.config.manuscripts[episode].content.
   모든 산출물에 '판단용 — 작가 결정 영역' 라벨. 점수 색 경고 없음(중립 표시).
   가드: currentSession null → 미렌더. 리스너 전부 cleanup. 엔진은 빈 입력 안전(순수 함수).
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Alert, Check, Sync, Wand, X } from "@/components/loreguard/icons";
import type {
  Character,
  EpisodeManuscript,
  EpisodeSceneSheet,
  StoryConfig,
} from "@/lib/studio-types";
// (a)-(f) 분석 엔진 — 전부 순수 함수(React/DOM/fetch 0)·정적 import 경량 안전
import { analyzeRevision, revisionIssues } from "@/lib/desktop/revision-analysis";
import { scanAISignature } from "@/lib/creative/ai-signature-scan";
import { analyzeRhythm } from "@/lib/creative/rhythm-analysis";
import {
  auditManuscript,
  auditVerdict,
  type AuditPerspective,
} from "@/lib/creative/qa-auditor";
import { panelReaction } from "@/lib/creative/reader-persona-16";
import { computeIntegratedGrade } from "@/lib/creative/integrated-grade";
// (g) 하인리히 신호 압축 카드 — 매핑·near-miss 라이프사이클 포함 (X3)
import RevisionCompressionCard from "./RevisionCompressionCard";
// AI 퇴고 보고서 — 선등록 studio-proofread 에이전트 + 기존 범용 JSON 라우트
import { buildAgentSystemPrompt } from "@/lib/ai/writing-agent-registry";
import { getActiveProvider, getApiKey } from "@/lib/ai-providers";
// [N4 — 2026-06-11] 서버 게이트 차단 응답 고지 (noa:toast + 인라인 에러) — 사일런트 차단 금지
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { lazyFirebaseAuth } from "@/lib/firebase";

// ============================================================
// PART 1 — AI 퇴고 보고서 계약 (studio-proofread duty 스키마와 1:1)
// ============================================================

const FINDING_TYPES = ["repetition", "causality", "voice", "pacing"] as const;
type FindingType = (typeof FINDING_TYPES)[number];
const FINDING_SEVERITIES = ["high", "medium", "low"] as const;
type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

interface ProofreadFinding {
  type: FindingType;
  severity: FindingSeverity;
  location: string;
  diagnosis: string;
  suggestion: string;
}

/** structured-generate schema — studio-proofread duty 의 출력 스키마와 동일 (계약 단일화). */
const PROOFREAD_SCHEMA = {
  type: "object" as const,
  properties: {
    findings: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const, enum: [...FINDING_TYPES] },
          severity: { type: "string" as const, enum: [...FINDING_SEVERITIES] },
          location: { type: "string" as const },
          diagnosis: { type: "string" as const },
          suggestion: { type: "string" as const },
        },
        required: ["type", "severity", "location", "diagnosis", "suggestion"],
      },
    },
  },
  required: ["findings"],
};

const MAX_FINDINGS = 20;
/** AI 진단 본문 상한 (요청 512KB·토큰 예산 방어). 초과 시 앞부분만 — UI·prompt 양쪽에 정직 고지. */
const MAX_AI_CHARS = 20_000;

/** 응답 → 검증된 finding 목록. 미지 type 은 드랍, severity 는 enum 밖이면 'low' 보정. */
function parseProofreadFindings(data: unknown): ProofreadFinding[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as { findings?: unknown }).findings;
  if (!Array.isArray(raw)) return [];
  const out: ProofreadFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const type =
      typeof f.type === "string" && (FINDING_TYPES as readonly string[]).includes(f.type)
        ? (f.type as FindingType)
        : null;
    const diagnosis = typeof f.diagnosis === "string" ? f.diagnosis.trim() : "";
    if (!type || !diagnosis) continue; // 핵심 필드 결손 → 드랍 (발명 금지)
    const severity =
      typeof f.severity === "string" &&
      (FINDING_SEVERITIES as readonly string[]).includes(f.severity)
        ? (f.severity as FindingSeverity)
        : "low";
    out.push({
      type,
      severity,
      location: typeof f.location === "string" ? f.location.trim().slice(0, 200) : "",
      diagnosis: diagnosis.slice(0, 500),
      suggestion: typeof f.suggestion === "string" ? f.suggestion.trim().slice(0, 500) : "",
    });
    if (out.length >= MAX_FINDINGS) break;
  }
  return out;
}

// ============================================================
// PART 2 — contextBlock 빌더 (studio-proofread 선언 3 블록 — 실데이터 보유분만)
//   TabDirection 의 로컬 빌더와 동일 정신 (그 함수들은 미export — 파일 수정 금지
//   범위라 여기 자체 축약본. 빈 블록은 buildAgentSystemPrompt 가 조용히 스킵).
// ============================================================

/** config.characters → character-dna 블록. 이름 있는 캐릭터 없으면 미주입. */
function buildCharacterDnaBlock(characters: Character[]): string | undefined {
  const named = characters.filter((c) => c.name.trim());
  if (named.length === 0) return undefined;
  const MAX = 12; // 토큰 상한 — 초과분은 명시 생략 (조용한 누락 X)
  const lines = named.slice(0, MAX).map((c) => {
    const bits = [
      c.role.trim() ? `역할: ${c.role.trim()}` : "",
      c.traits.trim() ? `특성: ${c.traits.trim()}` : "",
      c.speechStyle?.trim() ? `말투: ${c.speechStyle.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `- ${c.name.trim()}${bits ? ` (${bits})` : ""}`;
  });
  if (named.length > MAX) lines.push(`(외 ${named.length - MAX}명 생략)`);
  return lines.join("\n");
}

/** 대상 회차 씬시트 → scene-sheet 블록. 해당 화 sheet 없으면 미주입. */
function buildSceneSheetBlock(sheet: EpisodeSceneSheet | undefined): string | undefined {
  if (!sheet) return undefined;
  const head = [
    `${sheet.episode}화${sheet.title ? ` · ${sheet.title}` : ""}`,
    sheet.arc ? `아크: ${sheet.arc}` : "",
    sheet.characters ? `회차 등장인물: ${sheet.characters}` : "",
  ].filter(Boolean);
  const rows = (sheet.scenes ?? []).map(
    (s) => `- ${s.sceneName || s.sceneId || "(제목 없음)"} [${s.tone || "-"}] ${s.summary || ""}`.trimEnd(),
  );
  const body = rows.length ? `씬 ${rows.length}개:\n${rows.join("\n")}` : "등록된 씬 없음";
  return `${head.join("\n")}\n${body}`;
}

/** corePremise + synopsis → story-summary 블록. 둘 다 없으면 미주입. */
function buildStorySummaryBlock(config: StoryConfig): string | undefined {
  const parts = [
    config.corePremise?.trim() ? `핵심 전제: ${config.corePremise.trim().slice(0, 600)}` : "",
    config.synopsis?.trim() ? `시놉시스: ${config.synopsis.trim().slice(0, 1500)}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

// ============================================================
// PART 3 — 표시 상수 (라벨 — 데스크톱 RevisionPanel 어휘 유지)
// ============================================================

const QA_LABEL: Record<AuditPerspective, string> = {
  consistency: "A 정합",
  outsider: "B 외부독자",
  refuter: "C 반증",
  structure: "D 구조",
};

const FINDING_TYPE_LABEL: Record<FindingType, { ko: string; en: string }> = {
  repetition: { ko: "우회 반복", en: "Paraphrased repetition" },
  causality: { ko: "인과 단절", en: "Causality break" },
  voice: { ko: "보이스 드리프트", en: "Voice drift" },
  pacing: { ko: "페이싱", en: "Pacing" },
};

const SEVERITY_LABEL: Record<FindingSeverity, { ko: string; en: string }> = {
  high: { ko: "높음", en: "high" },
  medium: { ko: "중간", en: "medium" },
  low: { ko: "낮음", en: "low" },
};

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
  const panel = useMemo(() => panelReaction(text), [text]);

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

  // ----- AI 퇴고 보고서 — studio-proofread 경유 (진단 표시만·자동 수정 절대 금지) -----
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
    ko: "판단용 — 작가 결정 영역",
    en: "For judgment — author's decision",
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
              ko: "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 퇴고 지표가 표시됩니다",
              en: "No saved episode manuscript — save a draft in the Writing tab to see revision metrics",
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
                {L4(language, { ko: "퇴고 지표", en: "Revision metrics" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                {metric(L4(language, { ko: "자수", en: "Chars" }), metrics.chars.toLocaleString())}
                {metric(L4(language, { ko: "설명형(tell)", en: "Tell" }), `${metrics.tellPct}%`)}
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
                    {L4(language, { ko: `퇴고 이슈 raw (${issues.length})`, en: `Raw issues (${issues.length})` })}
                  </div>
                  {issues.length === 0 ? (
                    <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                      {L4(language, { ko: "지표 양호 — 발견된 이슈 없음", en: "Metrics OK — no issues found" })}
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

            {/* (b)(c)(e) 심화 — AI 시그니처 · 리듬 · 16독자 패널 */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "심화 분석", en: "Deep analysis" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 8,
                }}
              >
                {metric(L4(language, { ko: "AI 시그니처", en: "AI signature" }), `${sig.score}`)}
                {metric(
                  L4(language, { ko: "리듬 burstiness", en: "Rhythm burstiness" }),
                  rhythm.micro.burstiness.toFixed(2),
                )}
                {metric(
                  L4(language, { ko: "단락 수", en: "Paragraphs" }),
                  `${rhythm.macro.paragraphCount}`,
                )}
                {metric(
                  L4(language, { ko: "독자 패널 몰입", en: "Panel engagement" }),
                  `${panel.avgEngagement}`,
                )}
                {metric(
                  L4(language, { ko: "이탈 페르소나", en: "Dropout personas" }),
                  `${panel.dropoutCount}/16`,
                )}
              </div>
              {/* AI 시그니처 적중 raw — 압축에 병합 · 토글 시에만 */}
              {showRaw && sig.hits.length > 0 && (
                <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                  {L4(language, { ko: "AI 시그니처 적중:", en: "AI signature hits:" })}{" "}
                  {sig.hits.slice(0, 4).map((h) => `${h.pattern}(${h.count})`).join(" · ")}
                </p>
              )}
              <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                {L4(language, {
                  ko: "16독자 패널은 표면 지표 기반 시뮬레이션 근사 — 실측 독자 반응이 아닙니다.",
                  en: "The 16-reader panel is a surface-metric simulation — not real reader data.",
                })}
              </p>
            </div>

            {/* (d) QA 4감사관 raw — 비수렴 4관점 그대로 · 압축에 병합 · 토글 시에만 (판단용 라벨 보존) */}
            {showRaw && (
              <div className="pcard">
                <div className="pcard-h">
                  {L4(language, {
                    ko: `QA 감사관 A/B/C/D (비수렴) — ${verdict.passed ? "통과" : "보류"}`,
                    en: `QA auditors A/B/C/D (non-converging) — ${verdict.passed ? "pass" : "hold"}`,
                  })}
                  <span className="pill gray">{judgementLabel}</span>
                </div>
                {audit.length === 0 ? (
                  <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                    {L4(language, {
                      ko: "4관점 감사 — 발견된 결함 없음",
                      en: "4-perspective audit — no findings",
                    })}
                  </div>
                ) : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
                    {audit.map((f, i) => (
                      <li key={i} className="wr-srow" style={{ alignItems: "flex-start" }}>
                        <span className="pill gray" style={{ flexShrink: 0 }}>
                          {QA_LABEL[f.perspective]}
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
                )}
              </div>
            )}

            {/* (f) 통합등급 — 중립 표시 (색 경고 없음) */}
            <div className="pcard">
              <div className="pcard-h">
                {L4(language, { ko: "통합등급", en: "Integrated grade" })}
                <span className="pill gray">{judgementLabel}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-1)" }}>{grade.grade}</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
                  {L4(language, {
                    ko: `${grade.weighted}점 · 최약축 ${grade.weakest}`,
                    en: `${grade.weighted} pts · weakest axis: ${grade.weakest}`,
                  })}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-3)", margin: "8px 0 0" }}>
                {L4(language, {
                  ko: "집필·퇴고 축은 본문 실측, 세계관·캐릭터·씬시트·연출 축은 설정 보유 여부 기반 근사치입니다.",
                  en: "Writing/revision axes are measured from the text; world/character/scene/direction axes are presence-based approximations.",
                })}
              </p>
            </div>

            {/* + AI 퇴고 보고서 — studio-proofread (진단 목록 표시만 · 자동 수정 절대 금지) */}
            <div className="pcard">
              <div className="pcard-h">
                <Wand size={15} />
                {L4(language, { ko: "AI 퇴고 보고서", en: "AI revision report" })}
                <span className="pill gray">{judgementLabel}</span>
                {aiStatus === "success" && (
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    <Check size={12} />
                    {L4(language, { ko: "진단 완료", en: "Done" })}
                  </span>
                )}
              </div>
              <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                {L4(language, {
                  ko: "리포트 전용 진단 — 본문을 자동으로 고치지 않습니다. 수정 여부는 작가가 결정합니다.",
                  en: "Report-only diagnosis — the text is never auto-edited. Revisions are the author's call.",
                })}
              </div>
              {aiTruncNotice && (
                <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
                  {L4(language, {
                    ko: `원고가 길어 앞 ${MAX_AI_CHARS.toLocaleString()}자만 진단 대상입니다`,
                    en: `Long manuscript — only the first ${MAX_AI_CHARS.toLocaleString()} chars are diagnosed`,
                  })}
                </div>
              )}
              <button
                type="button"
                className="btn primary"
                aria-label={L4(language, {
                  ko: "AI 퇴고 보고서 생성 — 진단 목록만 표시",
                  en: "Generate AI revision report — diagnosis list only",
                })}
                style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
                disabled={aiStatus === "working"}
                onClick={handleAiReport}
              >
                {aiStatus === "working" ? (
                  <>
                    <Sync size={14} className="animate-spin" />
                    {L4(language, { ko: "진단 중…", en: "Diagnosing…" })}
                  </>
                ) : (
                  <>
                    <Wand size={14} />
                    {L4(language, { ko: "AI 퇴고 보고서 생성", en: "Generate AI report" })}
                  </>
                )}
              </button>
              {aiStatus === "error" && aiError && (
                <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
                  <span className="rdot amber" />
                  {L4(language, { ko: "진단 실패:", en: "Diagnosis failed:" })} {aiError}
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
                  {L4(language, { ko: "4축 진단 진행 중 (우회 반복·인과·보이스·페이싱)…", en: "Diagnosing 4 axes (repetition · causality · voice · pacing)…" })}
                </div>
              )}
              {aiStatus === "success" && aiFindings && (
                aiFindings.length === 0 ? (
                  <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 6 }}>
                    {L4(language, {
                      ko: "AI 진단 — 보고된 발견 사항 없음",
                      en: "AI diagnosis — no findings reported",
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
                              ko: `심각도 ${SEVERITY_LABEL[f.severity].ko}`,
                              en: `severity: ${SEVERITY_LABEL[f.severity].en}`,
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
                            {L4(language, { ko: "제안 방향:", en: "Suggested direction:" })} {f.suggestion}
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

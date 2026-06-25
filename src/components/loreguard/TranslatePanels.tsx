"use client";

/* ===========================================================
   TranslatePanels — 구 번역 셸 3패널 슬라이드오버 래퍼 (C-translate-panels)

   오픈: TabTranslate 검수 패널(tpanel) '검수 도구' .seg 토글 3개 → open prop.
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — TabWriting PART 4/5·CpJournalPanel
        과 동일 slide-over 패턴 (listener cleanup 포함).

   3패널 (구 TranslatorPanelManager 'audit'/'signoff'/'adoption' 분기와 동일 컴포넌트):
   - AuditPanel            품질 감사 (휴리스틱 + 원문 보존 + 출판 검수 + NOA 채점)
   - SignoffPanel          작가 사인오프 (Faithful/Market boolean 승인 — author-signoff.ts)
   - SegmentAdoptionPanel  세그먼트 채택 (Faithful/Market/직접 편집 → 최종본)

   컨텍스트 브리지 (구 컨텍스트 통째 마운트 금지 — useStudio 기반 최소 어댑터):
   세 패널은 useTranslator() (TranslatorContext) 에 의존한다. 구 TranslatorStudioApp
   provider 를 마운트하지 않고, 패널이 실제로 읽는 필드만 studio 실데이터로 채운
   어댑터를 TranslatorContext.Provider 로 주입한다.

   패널별 소비 필드 (2026-06-10 전수 read 기준 — 패널이 새 필드를 읽기 시작하면
   여기도 같이 채워야 한다. 미브리지 필드는 런타임 undefined):
   - AuditPanel: source·result·setResult·chapters·glossaryText·glossary·setGlossary·
     from·to·provider·getEffectiveApiKeyForProvider·autoRegenEnabled/set·
     autoRegenAttempts·outputMode/set·worldContext·characterProfiles·storySummary·
     completedChapters
   - SignoffPanel: chapters·patchChapterAtIndex·langKo
   - SegmentAdoptionPanel: source·chapters·activeChapterIndex·patchActiveChapter·langKo

   바인딩:
   - chapters       ← config.manuscripts (회차) × config.translatedManuscripts
                      (회차×현재 언어 entry — mode fidelity→resultFaithful /
                      experience→resultMarket)
   - signoff        ← TranslatedManuscriptEntry.faithfulApproved/marketApproved/
                      approvedAt — setConfig 영속 (IndexedDB+Firestore)
   - result 변경    ← onResultChange 단일 경로 (TabTranslate 세그먼트 버퍼 재매핑 +
                      persistTranslations) — 이중 쓰기 방지. 콜백 부재 시에만 entry 직접 patch.
   - glossary       ← config.translationConfig.glossary 읽기/쓰기 (record ↔ list 변환)
   - provider·키    ← ai-providers getActiveProvider()/getApiKey() (전역 단일 소스)

   정직 명세 (시뮬 금지 — 동작 한계 명시):
   - autoRegenEnabled: 어댑터 로컬 state. studio 번역 경로(useTranslation)에는 자동
     재시도 배선이 없어 토글 상태만 유지된다. attempts 는 null (표시 자체가 숨음).
   - outputMode 'dual'/'default': studio 엔진에 듀얼 파이프라인이 없어 로컬 표시만.
     'faithful'/'market' 은 translationConfig.mode (fidelity/experience) 로 실제 영속.
   - 사인오프 = #14 30조건 검증기 전 단계 — 기존 boolean 흐름 그대로 (확장 범위 외).
   =========================================================== */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import dynamic from "next/dynamic";
import { useStudio } from "@/app/studio/StudioContext";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Check, Eye, Layers, X } from "@/components/loreguard/icons";
import {
  TranslatorContext,
  type TranslatorContextState,
} from "@/components/translator/core/TranslatorContext";
import type { ChapterEntry } from "@/types/translator";
import type { StoryConfig, TranslatedManuscriptEntry } from "@/lib/studio-types";
import {
  PROVIDERS,
  getActiveProvider,
  getApiKey,
  type ProviderId,
} from "@/lib/ai-providers";

// ============================================================
// PART 1 — heavy 패널 dynamic import (ssr:false + 스켈레톤 — CpJournalPanel 패턴)
// ============================================================

const AuditPanel = dynamic(
  () => import("@/components/translator/panels/AuditPanel").then((m) => m.AuditPanel),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);
const SignoffPanel = dynamic(
  () => import("@/components/translator/panels/SignoffPanel").then((m) => m.SignoffPanel),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);
const SegmentAdoptionPanel = dynamic(
  () =>
    import("@/components/translator/panels/SegmentAdoptionPanel").then(
      (m) => m.SegmentAdoptionPanel,
    ),
  { ssr: false, loading: () => <LoadingSkeleton height={420} /> },
);

// ============================================================
// PART 2 — 타입 + 상수
// ============================================================

export type TranslatePanelKind = "audit" | "signoff" | "adoption";

type LangKey = "en" | "ja" | "zh";

// TabTranslate PART 1 과 동일 매핑 (UI LangKey ↔ TranslatedManuscriptEntry.targetLang)
const LANG_TO_TARGET: Record<LangKey, "EN" | "JP" | "CN"> = {
  en: "EN",
  ja: "JP",
  zh: "CN",
};

type OutputMode = TranslatorContextState["outputMode"];

const PANEL_META: Record<
  TranslatePanelKind,
  { icon: typeof Eye; label: { ko: string; en: string } }
> = {
  audit: { icon: Eye, label: { ko: "품질 감사", en: "Quality Audit" } },
  signoff: { icon: Check, label: { ko: "작가 사인오프", en: "Author Sign-off" } },
  adoption: { icon: Layers, label: { ko: "세그먼트 채택", en: "Segment Adoption" } },
};

/** translationConfig 기본값 채움 — TabTranslate.addGlossary 와 동일 기본값. */
function withTranslationConfigDefaults(tc: StoryConfig["translationConfig"]) {
  return {
    mode: tc?.mode ?? ("fidelity" as const),
    targetLang: tc?.targetLang ?? ("EN" as const),
    band: tc?.band ?? 0.5,
    scoreThreshold: tc?.scoreThreshold ?? 0.7,
    maxRecreate: tc?.maxRecreate ?? 2,
    contractionLevel: tc?.contractionLevel ?? ("normal" as const),
    glossary: tc?.glossary ?? [],
  };
}

// ============================================================
// PART 3 — 래퍼 본체 (어댑터 + slide-over)
// ============================================================

export default function TranslatePanels({
  open,
  onClose,
  lang,
  activeEpisode,
  source,
  result,
  onResultChange,
}: {
  /** 열려 있는 패널 — null 이면 미렌더 */
  open: TranslatePanelKind | null;
  onClose: () => void;
  /** 현재 대상 언어 (TabTranslate lang state) */
  lang: LangKey;
  /** 활성 회차 episode 번호 (TabTranslate activeManuscript.episode) */
  activeEpisode: number;
  /** 활성 회차 원문 (한국어) */
  source: string;
  /** 현재 언어의 확정 번역 결합 텍스트 (TabTranslate liveResult) */
  result: string;
  /** 패널발 결과 변경 (출판 검수 자동 고침 / 채택 finalize) → 세그먼트 버퍼 재매핑 + 영속 */
  onResultChange?: (text: string) => void;
}) {
  const { currentSession, setConfig, language, isKO } = useStudio();
  const config = currentSession?.config ?? null;
  const target = LANG_TO_TARGET[lang];

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단.
  // Escape 는 아래 기존 핸들러가 전담 → focus trap onEscape 는 미전달 (이중 호출 방지).
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, open != null);
  useBodyScrollLock(open != null);

  // ── Escape 닫기 — open 중에만 listener (cleanup) ──────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 최신 result — setResult 함수형 updater 지원용
  const resultRef = useRef(result);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // ── chapters: config.manuscripts × translatedManuscripts → ChapterEntry[] ──
  const sortedManuscripts = useMemo(
    () => (config?.manuscripts ?? []).slice().sort((a, b) => a.episode - b.episode),
    [config],
  );

  const chapters = useMemo<ChapterEntry[]>(() => {
    const tlist = config?.translatedManuscripts ?? [];
    return sortedManuscripts.map((m) => {
      const entry = tlist.find((e) => e.episode === m.episode && e.targetLang === target);
      const translated = entry?.translatedContent ?? "";
      return {
        name: m.title || `${m.episode}화`,
        content: m.content ?? "",
        result: translated,
        // 단일 mode entry — fidelity→Faithful / experience→Market 한쪽만 존재 (듀얼 엔진 없음)
        resultFaithful: entry && entry.mode === "fidelity" ? translated : undefined,
        resultMarket: entry && entry.mode === "experience" ? translated : undefined,
        isDone: !!translated,
        stageProgress: translated ? 5 : 0,
        faithfulApproved: entry?.faithfulApproved,
        marketApproved: entry?.marketApproved,
        approvedAt: entry?.approvedAt,
      };
    });
  }, [sortedManuscripts, config, target]);

  const activeChapterIndex = useMemo(() => {
    const idx = sortedManuscripts.findIndex((m) => m.episode === activeEpisode);
    return idx >= 0 ? idx : null;
  }, [sortedManuscripts, activeEpisode]);

  // ── 사인오프·결과 patch → translatedManuscripts entry 영속 ──
  const patchChapterAtIndex = useCallback(
    (index: number, patch: Record<string, unknown>) => {
      const episode = sortedManuscripts[index]?.episode;
      if (episode == null) return;
      setConfig((prev: StoryConfig) => {
        const list = prev.translatedManuscripts ?? [];
        const i = list.findIndex((e) => e.episode === episode && e.targetLang === target);
        if (i < 0) return prev; // 번역 entry 없음 — 패널 버튼도 disabled (hasFaithful/hasMarket false)
        const cur = list[i];
        const next: TranslatedManuscriptEntry = { ...cur };
        let changed = false;
        if (
          typeof patch.faithfulApproved === "boolean" &&
          patch.faithfulApproved !== !!cur.faithfulApproved
        ) {
          next.faithfulApproved = patch.faithfulApproved;
          changed = true;
        }
        if (
          typeof patch.marketApproved === "boolean" &&
          patch.marketApproved !== !!cur.marketApproved
        ) {
          next.marketApproved = patch.marketApproved;
          changed = true;
        }
        if (typeof patch.approvedAt === "number" && patch.approvedAt !== cur.approvedAt) {
          next.approvedAt = patch.approvedAt;
          changed = true;
        }
        if (typeof patch.result === "string" && patch.result !== cur.translatedContent) {
          next.translatedContent = patch.result;
          next.charCount = patch.result.length;
          next.lastUpdate = Date.now();
          changed = true;
        }
        if (!changed) return prev;
        return {
          ...prev,
          translatedManuscripts: list.map((e, j) => (j === i ? next : e)),
        };
      });
    },
    [sortedManuscripts, target, setConfig],
  );

  const patchActiveChapter = useCallback(
    (patch: Record<string, unknown>) => {
      if (activeChapterIndex == null) return;
      // 결과 텍스트는 onResultChange 단일 경로 (TabTranslate 가 세그먼트 매핑 후 영속) —
      // entry 직접 쓰기와의 이중 쓰기 방지. 콜백 부재 시에만 fallback 으로 entry patch.
      if (typeof patch.result === "string" && onResultChange) {
        onResultChange(patch.result);
        const rest: Record<string, unknown> = { ...patch };
        delete rest.result;
        if (Object.keys(rest).length > 0) patchChapterAtIndex(activeChapterIndex, rest);
        return;
      }
      patchChapterAtIndex(activeChapterIndex, patch);
    },
    [activeChapterIndex, onResultChange, patchChapterAtIndex],
  );

  // ── setResult 브리지 (출판 검수 자동 고침 / NOA 교정 적용) ──
  const setResultBridge = useCallback<Dispatch<SetStateAction<string>>>(
    (v) => {
      const next = typeof v === "function" ? (v as (p: string) => string)(resultRef.current) : v;
      resultRef.current = next;
      if (onResultChange) onResultChange(next);
      else if (activeChapterIndex != null)
        patchChapterAtIndex(activeChapterIndex, { result: next });
    },
    [onResultChange, activeChapterIndex, patchChapterAtIndex],
  );

  // ── glossary: config.translationConfig.glossary (list) ↔ Record 브리지 ──
  const glossaryRecord = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        (config?.translationConfig?.glossary ?? []).map((g) => [g.source, g.target]),
      ),
    [config],
  );

  const glossaryText = useMemo(
    () =>
      (config?.translationConfig?.glossary ?? [])
        .map((g) => `${g.source}=${g.target}`)
        .join("\n"),
    [config],
  );

  const setGlossaryBridge = useCallback<Dispatch<SetStateAction<Record<string, string>>>>(
    (v) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        const curList = tc?.glossary ?? [];
        const curRec: Record<string, string> = Object.fromEntries(
          curList.map((g) => [g.source, g.target]),
        );
        const nextRec = typeof v === "function" ? v(curRec) : v;
        // 기존 항목의 context/locked 유지, 신규 항목은 locked:false 추가, 제거 반영
        const nextList = Object.entries(nextRec).map(([src, tgt]) => {
          const ex = curList.find((g) => g.source === src);
          return ex ? { ...ex, target: tgt } : { source: src, target: tgt, locked: false };
        });
        return {
          ...prev,
          translationConfig: { ...withTranslationConfigDefaults(tc), glossary: nextList },
        };
      });
    },
    [setConfig],
  );

  // ── outputMode: translationConfig.mode ↔ faithful/market (dual/default 는 로컬 표시만) ──
  const [localOutputMode, setLocalOutputMode] = useState<OutputMode | null>(null);
  const configOutputMode: OutputMode =
    config?.translationConfig?.mode === "experience" ? "market" : "faithful";
  const outputMode = localOutputMode ?? configOutputMode;

  const setOutputModeBridge = useCallback<Dispatch<SetStateAction<OutputMode>>>(
    (v) => {
      const next = typeof v === "function" ? v(outputMode) : v;
      setLocalOutputMode(next);
      if (next === "faithful" || next === "market") {
        setConfig((prev: StoryConfig) => ({
          ...prev,
          translationConfig: {
            ...withTranslationConfigDefaults(prev.translationConfig),
            mode: next === "market" ? ("experience" as const) : ("fidelity" as const),
          },
        }));
      }
    },
    [outputMode, setConfig],
  );

  // ── 자동 재시도 토글 — studio 경로에 배선 없음 (어댑터 로컬 state·정직 명세 §헤더) ──
  const [autoRegenEnabled, setAutoRegenEnabled] = useState(false);

  // ── 컨텍스트 텍스트 (5 도메인 체크리스트 휴리스틱 입력 — 실 config 필드만) ──
  const worldContext = useMemo(
    () =>
      [
        config?.setting,
        config?.corePremise,
        config?.powerStructure,
        config?.currentConflict,
        config?.worldHistory,
        config?.socialSystem,
        config?.economy,
        config?.magicTechSystem,
        config?.factionRelations,
        config?.survivalEnvironment,
        config?.culture,
        config?.religion,
        config?.lawOrder,
        config?.taboo,
        config?.dailyLife,
      ]
        .filter((s): s is string => !!s && !!s.trim())
        .join("\n"),
    [config],
  );

  const characterProfiles = useMemo(
    () =>
      (config?.characters ?? [])
        .map((c) =>
          [
            c.name && `이름: ${c.name}`,
            c.role && `역할: ${c.role}`,
            c.traits && `특성: ${c.traits}`,
            c.personality && `성격: ${c.personality}`,
            c.speechStyle && `말투: ${c.speechStyle}`,
            c.desire && `욕망: ${c.desire}`,
            c.weakness && `약점: ${c.weakness}`,
            c.changeArc && `변화: ${c.changeArc}`,
          ]
            .filter(Boolean)
            .join(" · "),
        )
        .filter(Boolean)
        .join("\n"),
    [config],
  );

  const storySummary = config?.synopsis ?? "";
  const completedChapters = useMemo(
    () => chapters.filter((c) => c.isDone).length,
    [chapters],
  );

  // ── provider / 연결 키 — 전역 단일 소스 (ai-providers) ──
  const [provider] = useState<string>(() => getActiveProvider());
  const getEffectiveApiKeyForProvider = useCallback((providerId: string): string => {
    if (!(providerId in PROVIDERS)) return "";
    return getApiKey(providerId as ProviderId);
  }, []);

  // ── 최소 브리지 객체 — Partial 로 필드 단위 타입 검증 후 cast ──
  // (전체 TranslatorContextState ~100 필드 중 패널 소비분만 — 헤더 §패널별 소비 필드)
  const bridge = useMemo<TranslatorContextState>(() => {
    const partial: Partial<TranslatorContextState> = {
      source,
      result,
      setResult: setResultBridge,
      chapters,
      activeChapterIndex,
      patchChapterAtIndex,
      patchActiveChapter,
      glossary: glossaryRecord,
      setGlossary: setGlossaryBridge,
      glossaryText,
      from: "ko",
      to: lang,
      provider,
      getEffectiveApiKeyForProvider,
      autoRegenEnabled,
      setAutoRegenEnabled,
      autoRegenAttempts: null,
      outputMode,
      setOutputMode: setOutputModeBridge,
      worldContext,
      characterProfiles,
      storySummary,
      completedChapters,
      langKo: isKO,
      loading: false,
    };
    return partial as TranslatorContextState;
  }, [
    source,
    result,
    setResultBridge,
    chapters,
    activeChapterIndex,
    patchChapterAtIndex,
    patchActiveChapter,
    glossaryRecord,
    setGlossaryBridge,
    glossaryText,
    lang,
    provider,
    getEffectiveApiKeyForProvider,
    autoRegenEnabled,
    outputMode,
    setOutputModeBridge,
    worldContext,
    characterProfiles,
    storySummary,
    completedChapters,
    isKO,
  ]);

  // ── 가드 + slide-over 렌더 ──────────────────────────────
  if (!open || !currentSession || !config) return null;

  const meta = PANEL_META[open];
  const MetaIcon = meta.icon;

  return (
    <div
      className="tx-panel-overlay"
      role="presentation"
      onClick={onClose}
    >
      <aside
        ref={dialogRef}
        className="tx-panel-shell"
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, meta.label)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* head */}
        <div className="pcard-h tx-panel-head">
          <MetaIcon size={16} strokeWidth={1.6} />
          {L4(language, meta.label)}
          <button
            type="button"
            className="eh-icbtn tx-panel-close"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* body — 패널 자체가 내부 스크롤 소유 (flex h-full) */}
        <div className="tx-panel-body">
          <TranslatorContext.Provider value={bridge}>
            {open === "audit" && <AuditPanel />}
            {open === "signoff" && <SignoffPanel />}
            {open === "adoption" && <SegmentAdoptionPanel />}
          </TranslatorContext.Provider>
        </div>
      </aside>
    </div>
  );
}

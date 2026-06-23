"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import type { TranslatePanelKind } from "@/components/loreguard/TranslatePanels";
import type { StoryConfig, TranslatedManuscriptEntry } from "@/lib/studio-types";
import { runCatastrophicCheck, type CatastrophicReport } from "@/lib/translation/ncg-nct";
import { lintTranslationese, type TranslationeseLintResult } from "@/lib/translation/translationese-lint";
import { buildTranslationTrackComparison } from "@/lib/translation/track-comparison";
import { buildTranslationRiskReport } from "@/lib/translation/risk-report";
import { LANG_TO_TARGET, type LangKey, type LayoutMode, type SegStatus } from "./TabTranslate.shared";
import { readTxPanelOpen, writeTxPanelOpen } from "./TabTranslate.panel-state";
import { mapStoredToSegments, pickActiveManuscript, splitIntoSegments, termsInText, upsertTranslatedEntry } from "./TabTranslate.logic";

export type TranslationBufferOverride = {
  translations?: Record<string, string>;
  statuses?: Record<string, SegStatus>;
  avgScore?: number | null;
  dirty?: boolean;
};

export function useTabTranslateState() {
  const { setActiveTab: setLoreguardTab } = useLoreguardTab();
  const studio = useStudio();
  const {
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setConfig,
    setCurrentSessionId,
    setCurrentProjectId,
    triggerSave,
    language,
    isKO,
    writingMode,
    editDraft,
  } = studio;

  const config = currentSession?.config ?? null;
  const activeManuscript = useMemo(() => pickActiveManuscript(config), [config]);
  const glossary = useMemo(() => config?.translationConfig?.glossary ?? [], [config]);
  const glossarySources = useMemo(() => glossary.map((g) => g.source).filter(Boolean), [glossary]);

  const segments = useMemo(() => {
    const segs = splitIntoSegments(activeManuscript?.content ?? "");
    return segs.map((s) => ({ ...s, terms: termsInText(s.ko, glossarySources) }));
  }, [activeManuscript, glossarySources]);

  const chapters = useMemo(
    () =>
      (config?.manuscripts ?? [])
        .slice()
        .sort((a, b) => a.episode - b.episode)
        .map((m) => ({ episode: m.episode, title: m.title || `${m.episode}화`, words: m.charCount ?? m.content?.length ?? 0 })),
    [config],
  );

  const [lang, setLang] = useState<LangKey>("en");
  const [layout, setLayout] = useState<LayoutMode>("split");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [aiText, setAiText] = useState("");
  const [openPanel, setOpenPanel] = useState<TranslatePanelKind | null>(null);
  const [panelOpen, setPanelOpen] = useState<boolean>(() => readTxPanelOpen());
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SegStatus>>({});
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>("");

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      const next = !prev;
      writeTxPanelOpen(next);
      return next;
    });
  }, []);

  const firstId = segments[0]?.id ?? "";
  const effectiveSelected = selectedId && segments.some((s) => s.id === selectedId) ? selectedId : firstId;

  const computeTranslatedManuscripts = useCallback(
    (prev: StoryConfig, override?: TranslationBufferOverride): TranslatedManuscriptEntry[] | null => {
      if (!activeManuscript) return null;
      const trans = override?.translations ?? translations;
      const stat = override?.statuses ?? statuses;
      const score = override?.avgScore ?? avgScore;
      const prefix = lang + ":";
      const ordered = segments
        .map((s) => ({ id: s.id, txt: trans[prefix + s.id] }))
        .filter((x): x is { id: string; txt: string } => !!x.txt && stat[x.id] === "done");
      return upsertTranslatedEntry({
        prev,
        episode: activeManuscript.episode,
        title: activeManuscript.title ?? "",
        targetLang: LANG_TO_TARGET[lang],
        ordered,
        avgScore: score,
        glossary,
        dirty: override?.dirty === true,
      });
    },
    [activeManuscript, translations, statuses, avgScore, lang, segments, glossary],
  );

  const persistTranslations = useCallback(
    (override?: TranslationBufferOverride) => {
      if (!activeManuscript) return;
      setConfig((prev: StoryConfig) => {
        const nextTM = computeTranslatedManuscripts(prev, override);
        if (nextTM === null) return prev;
        return { ...prev, translatedManuscripts: nextTM };
      });
    },
    [activeManuscript, computeTranslatedManuscripts, setConfig],
  );

  const handleSelectChapter = useCallback(
    (episode: number) => {
      if (episode === config?.episode) return;
      const nextEp = Math.floor(episode);
      setConfig((prev: StoryConfig) =>
        prev.episode === nextEp ? prev : { ...prev, episode: nextEp },
      );
    },
    [config, setConfig],
  );

  useEffect(() => {
    if (!activeManuscript) return;
    const target = LANG_TO_TARGET[lang];
    const prefix = lang + ":";
    const ownTransKeys = new Set(segments.map((seg) => prefix + seg.id));
    const ownStatusKeys = new Set(segments.map((seg) => seg.id));
    const stripTrans = (prev: Record<string, string>): Record<string, string> => {
      const next: Record<string, string> = {};
      for (const k of Object.keys(prev)) if (!ownTransKeys.has(k)) next[k] = prev[k];
      return next;
    };
    const stripStatus = (prev: Record<string, SegStatus>): Record<string, SegStatus> => {
      const next: Record<string, SegStatus> = {};
      for (const k of Object.keys(prev)) if (!ownStatusKeys.has(k)) next[k] = prev[k];
      return next;
    };
    const stored = (config?.translatedManuscripts ?? []).find(
      (e) => e.episode === activeManuscript.episode && e.targetLang === target,
    );
    if (!stored || !stored.translatedContent) {
      setTranslations((prev) => stripTrans(prev));
      setStatuses((prev) => stripStatus(prev));
      setAvgScore(null);
      return;
    }
    const mapped = mapStoredToSegments(stored.translatedContent, stored.segmentBoundaries, segments.map((seg) => seg.id));
    const t: Record<string, string> = {};
    const s: Record<string, SegStatus> = {};
    for (const seg of segments) {
      const txt = mapped[seg.id];
      if (txt) {
        t[prefix + seg.id] = txt;
        s[seg.id] = "done";
      }
    }
    setTranslations((prev) => ({ ...stripTrans(prev), ...t }));
    setStatuses((prev) => ({ ...stripStatus(prev), ...s }));
    setAvgScore(stored.avgScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeManuscript?.episode, lang]);

  const applyExternalResult = useCallback(
    (text: string) => {
      if (!text || !text.trim()) return;
      const mapped = mapStoredToSegments(text, undefined, segments.map((seg) => seg.id));
      const t: Record<string, string> = {};
      const s: Record<string, SegStatus> = {};
      for (const seg of segments) {
        const txt = mapped[seg.id];
        if (txt) {
          t[lang + ":" + seg.id] = txt;
          s[seg.id] = "done";
        }
      }
      if (Object.keys(t).length === 0) return;
      const nextTrans = { ...translations, ...t };
      const nextStatuses: Record<string, SegStatus> = { ...statuses, ...s };
      setTranslations(nextTrans);
      setStatuses(nextStatuses);
      persistTranslations({ translations: nextTrans, statuses: nextStatuses, dirty: true });
    },
    [segments, lang, translations, statuses, persistTranslations],
  );

  const liveResult = useMemo(() => {
    const prefix = lang + ":";
    return segments
      .map((s) => translations[prefix + s.id])
      .filter(Boolean)
      .join("\n\n");
  }, [segments, translations, lang]);

  const activeTranslatedEntry = useMemo(
    () =>
      (config?.translatedManuscripts ?? []).find(
        (entry) => entry.episode === activeManuscript?.episode && entry.targetLang === LANG_TO_TARGET[lang],
      ) ?? null,
    [activeManuscript?.episode, config?.translatedManuscripts, lang],
  );

  const trackComparison = useMemo(() => {
    if (!activeManuscript) return null;
    return buildTranslationTrackComparison({
      source: activeManuscript.content ?? "",
      translation: liveResult,
      targetLang: lang,
      faithfulApproved: activeTranslatedEntry?.faithfulApproved,
      marketApproved: activeTranslatedEntry?.marketApproved,
    });
  }, [activeManuscript, activeTranslatedEntry?.faithfulApproved, activeTranslatedEntry?.marketApproved, lang, liveResult]);

  const riskReport = useMemo(() => {
    if (!activeManuscript) return null;
    return buildTranslationRiskReport({
      source: activeManuscript.content ?? "",
      translation: liveResult,
      targetLang: lang,
      glossary: glossary.map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
      faithfulApproved: activeTranslatedEntry?.faithfulApproved,
      marketApproved: activeTranslatedEntry?.marketApproved,
    });
  }, [activeManuscript, activeTranslatedEntry?.faithfulApproved, activeTranslatedEntry?.marketApproved, glossary, lang, liveResult]);

  const qualityGate = useMemo((): {
    cat: CatastrophicReport;
    lint: TranslationeseLintResult | null;
  } | null => {
    if (!activeManuscript || segments.length === 0) return null;
    const allDone = segments.every((s) => statuses[s.id] === "done");
    if (!allDone || !liveResult.trim()) return null;
    try {
      const cat = runCatastrophicCheck({
        source: activeManuscript.content ?? "",
        translation: liveResult,
        srcLang: "ko",
        tgtLang: lang,
        glossary: glossary.map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
      });
      const lint = lang === "en" ? lintTranslationese(liveResult) : null;
      return { cat, lint };
    } catch {
      return null;
    }
  }, [activeManuscript, segments, statuses, liveResult, lang, glossary]);

  return {
    setLoreguardTab,
    currentSession,
    currentSessionId,
    currentProjectId,
    projects,
    sessions,
    setConfig,
    setCurrentSessionId,
    setCurrentProjectId,
    triggerSave,
    language,
    isKO,
    writingMode,
    editDraft,
    config,
    activeManuscript,
    glossary,
    segments,
    chapters,
    lang,
    setLang,
    layout,
    setLayout,
    selectedId,
    setSelectedId,
    activeTerm,
    setActiveTerm,
    aiText,
    setAiText,
    openPanel,
    setOpenPanel,
    panelOpen,
    togglePanel,
    translations,
    setTranslations,
    suggestions,
    setSuggestions,
    statuses,
    setStatuses,
    avgScore,
    setAvgScore,
    progressLabel,
    setProgressLabel,
    effectiveSelected,
    persistTranslations,
    handleSelectChapter,
    applyExternalResult,
    liveResult,
    trackComparison,
    riskReport,
    qualityGate,
  };
}

export type TabTranslateState = ReturnType<typeof useTabTranslateState>;

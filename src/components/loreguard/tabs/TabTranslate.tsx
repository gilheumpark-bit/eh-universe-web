"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkle,
  X,
  Sync,
  Download,
  Eye,
  Send,
  Lock,
  Check,
} from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useStudioExport } from "@/hooks/useStudioExport";
import TranslatePanels, { type TranslatePanelKind } from "@/components/loreguard/TranslatePanels";
import type { EpisodeManuscript, StoryConfig, TranslatedManuscriptEntry } from "@/lib/studio-types";
import type { TranslationProgress } from "@/engine/translation";
import { useLoreguardTab } from "@/components/loreguard/LoreguardTabContext";
import { runCatastrophicCheck, type CatastrophicReport } from "@/lib/translation/ncg-nct";
import { lintTranslationese, type TranslationeseLintResult } from "@/lib/translation/translationese-lint";
import {
  buildTranslationTrackComparison,
} from "@/lib/translation/track-comparison";
import {
  buildTranslationRiskReport,
} from "@/lib/translation/risk-report";
import {
  LANGS,
  LANG_TO_TARGET,
  REWRITE_CHIPS,
  type LangKey,
  type LayoutMode,
  type SegStatus,
} from "./TabTranslate.shared";
import { TranslateRail } from "./TabTranslateRail";
import { fireCpLog, getCreativeLogger } from "./TabTranslate.creative-log";
import { EmptyState, TranslateEditor, TranslatePanel } from "./TabTranslate.sections";
import { readTxPanelOpen, writeTxPanelOpen } from "./TabTranslate.panel-state";

export { SEG_JOIN, mapStoredToSegments, splitIntoSegments, upsertTranslatedEntry } from "./TabTranslate.logic";
import { mapStoredToSegments, pickActiveManuscript, splitIntoSegments, termsInText, upsertTranslatedEntry } from "./TabTranslate.logic";

export default function TabTranslate() {
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
  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      const next = !prev;
      writeTxPanelOpen(next);
      return next;
    });
  }, []);

  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SegStatus>>({});
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [progressLabel, setProgressLabel] = useState<string>("");

  const firstId = segments[0]?.id ?? "";
  const effectiveSelected = selectedId && segments.some((s) => s.id === selectedId) ? selectedId : firstId;

  const computeTranslatedManuscripts = useCallback(
    (
      prev: StoryConfig,
      override?: {
        translations?: Record<string, string>;
        statuses?: Record<string, SegStatus>;
        avgScore?: number | null;
        dirty?: boolean;
      },
    ): TranslatedManuscriptEntry[] | null => {
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
    (override?: {
      translations?: Record<string, string>;
      statuses?: Record<string, SegStatus>;
      avgScore?: number | null;
      dirty?: boolean;
    }) => {
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
      // [3-tier 수리 2026-06-11] 회차 전환은 episode 변경만 — 번역 재영속 호출 금지.
      // 사유: 모든 실제 번역 편집(applyExternalResult/acceptSuggestion/handleTranslateAll/
      //   handleRevert)이 이미 즉시 persistTranslations 로 영속한다. 따라서 전환 시점에
      //   미영속 'pending' 번역은 없다. 이전 구현은 전환 직전 computeTranslatedManuscripts 로
      //   재영속했으나, restore effect 의 비멱등 재분해(multi-sentence 세그먼트 꼬리 유실)로
      //   ① contentChanged 오탐 → 영속 작가 사인오프(faithful/market/approvedAt) 조용히 취소,
      //   ② lossy 버퍼로 stored 본문 truncate 의 두 HIGH 데이터무결성 회귀를 유발했다
      //   (독립 7-리뷰어 적발). episode 단일 변경으로 두 회귀를 모두 제거.
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
      // 저장된 번역 없음 — 이전 회차 버퍼 잔존 차단을 위해 현재 회차 키만 비운다.
      setTranslations((prev) => stripTrans(prev));
      setStatuses((prev) => stripStatus(prev));
      setAvgScore(null);
      return;
    }
    // [W2-translate 2026-06-11] 멱등 복원: segmentBoundaries 있으면 길이 슬라이스(왕복 멱등),
    //   부재(레거시)·불일치 시 위치 매핑+꼬리 흡수 fallback. 비멱등 재분해 본문 오염 차단.
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
    // strip 후 stored 로 재구성(replace) — 잔존 키 누수 차단.
    setTranslations((prev) => ({ ...stripTrans(prev), ...t }));
    setStatuses((prev) => ({ ...stripStatus(prev), ...s }));
    setAvgScore(stored.avgScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeManuscript?.episode, lang]);

  // ── [C-translate-panels] slide-over 패널발 결과 반영 ─────
  // 출판 검수 자동 고침 / NOA 교정 적용 / 세그먼트 채택 finalize 가 회차 전체
  // 텍스트를 돌려준다 → 복원 effect 와 동일한 best-effort 1:1 문장 매핑으로
  // 세그먼트 버퍼에 반영 + 즉시 영속. (분해 수 불일치 시 초과분은 매핑 불가 — 정직 한계)
  const applyExternalResult = useCallback(
    (text: string) => {
      if (!text || !text.trim()) return;
      // 외부 텍스트는 stored boundaries 가 없으므로 위치 매핑+꼬리 흡수(fallback) — 복원기와 동일.
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
      // [W2-translate] 외부 패널 결과 적용 = 실제 편집 → dirty (사인오프 재승인 필요).
      persistTranslations({ translations: nextTrans, statuses: nextStatuses, dirty: true });
    },
    [segments, lang, translations, statuses, persistTranslations],
  );

  // 검수 패널용 — 현재 언어의 확정 번역 결합 텍스트 (원고 단위)
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

  const trackComparison = useMemo(
    () => {
      if (!activeManuscript) return null;
      return buildTranslationTrackComparison({
        source: activeManuscript.content ?? "",
        translation: liveResult,
        targetLang: lang,
        faithfulApproved: activeTranslatedEntry?.faithfulApproved,
        marketApproved: activeTranslatedEntry?.marketApproved,
      });
    },
    [activeManuscript, activeTranslatedEntry?.faithfulApproved, activeTranslatedEntry?.marketApproved, lang, liveResult],
  );

  const riskReport = useMemo(
    () => {
      if (!activeManuscript) return null;
      return buildTranslationRiskReport({
        source: activeManuscript.content ?? "",
        translation: liveResult,
        targetLang: lang,
        glossary: glossary.map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
        faithfulApproved: activeTranslatedEntry?.faithfulApproved,
        marketApproved: activeTranslatedEntry?.marketApproved,
      });
    },
    [activeManuscript, activeTranslatedEntry?.faithfulApproved, activeTranslatedEntry?.marketApproved, glossary, lang, liveResult],
  );

  // ── [Z1a-UI] 결정적 품질 점검 (최소 진입점) ────────────
  // Catastrophic 점검 (성별 대명사 변화·신규 고유명사 오삽입) + 어색한 표현 린트(EN만).
  // 전 세그먼트 확정(done) 시에만 산출 — 부분 번역에 대한 오탐을 줄인다.
  // 주의: 세그먼트 결합(liveResult)은 문장 단위 \n\n 결합이라 문단 수가 원문보다
  // 많아짐 → 문단 손실(floor) 검사는 여기선 사실상 비활성 (전체 회차 검사는
  // 구 번역 셸 NCT 경로가 담당) — 본 카드의 핵심은 대명사/고유명사/린트.
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
        tgtLang: lang, // LangKey('en'|'ja'|'zh') ⊂ SupportedLang
        glossary: glossary.map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
      });
      const lint = lang === "en" ? lintTranslationese(liveResult) : null;
      return { cat, lint };
    } catch {
      return null; // 게이트 오류가 탭 본 흐름을 깨지 않게 (silent)
    }
  }, [activeManuscript, segments, statuses, liveResult, lang, glossary]);

  // ── useTranslation 실 엔진 연결 ─────────────────────────
  const onProgress = useCallback((p: TranslationProgress) => {
    if (p.status === "translating") setProgressLabel("번역 중…");
    else if (p.status === "scoring") setProgressLabel("품질 점검 중…");
    else if (p.status === "recreating") setProgressLabel(`재번역 중… (${p.recreateCount})`);
    else if (p.status === "done") setProgressLabel("");
    else if (p.status === "error") setProgressLabel("오류: " + (p.error ?? ""));
  }, []);

  const { translateEpisode, translateBatch, isTranslating, abort } = useTranslation({ onProgress });

  // 현재 언어의 config 스냅샷 — glossary 를 엔진에 주입
  const buildPartialConfig = useCallback(() => {
    const tc = config?.translationConfig;
    return {
      targetLang: LANG_TO_TARGET[lang] as "EN" | "JP" | "CN",
      glossary: glossary.map((g) => ({ source: g.source, target: g.target, context: g.context, locked: g.locked })),
      mode: tc?.mode ?? ("fidelity" as const),
      band: tc?.band,
      scoreThreshold: tc?.scoreThreshold,
      maxRecreate: tc?.maxRecreate,
      contractionLevel: tc?.contractionLevel,
    };
  }, [config, glossary, lang]);

  // 단일 세그먼트 번역 (segment.ko → 1개 문장 manuscript) — translateEpisode 실 엔진.
  // 결과를 제안(suggestions)으로 스트림 → 사용자가 수락 시 확정 번역으로.
  const translateSegment = useCallback(
    async (segId: string, directive?: string) => {
      const seg = segments.find((s) => s.id === segId);
      if (!seg || !seg.ko.trim()) return;
      const key = lang + ":" + segId;
      setProgressLabel("번역 중…");
      const partial = buildPartialConfig();
      const ms: EpisodeManuscript = {
        episode: activeManuscript?.episode ?? config?.episode ?? 1,
        title: activeManuscript?.title ?? currentSession?.title ?? "",
        content: directive ? `${seg.ko}\n\n[지시: ${directive}]` : seg.ko,
        charCount: seg.ko.length,
        lastUpdate: Date.now(),
      };
      const result = await translateEpisode(ms, partial);
      if (result && result.translatedText) {
        setSuggestions((prev) => ({ ...prev, [key]: result.translatedText.trim() }));
        setStatuses((prev) => ({ ...prev, [segId]: "review" }));
        setAvgScore(result.avgScore);
      }
      setProgressLabel("");
    },
    [segments, lang, buildPartialConfig, translateEpisode, activeManuscript, config, currentSession],
  );

  // 제안 수락 → 확정 번역으로 확정 + done + 즉시 영속화 (데이터 유실 방지)
  const acceptSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      const txt = suggestions[key];
      const nextTrans = txt ? { ...translations, [key]: txt } : translations;
      const nextStatuses: Record<string, SegStatus> = { ...statuses, [segId]: "done" };
      setTranslations(nextTrans);
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses(nextStatuses);
      // [W2-translate] 제안 수락 = 실제 편집(신규 확정) → dirty (사인오프 재승인 필요).
      persistTranslations({ translations: nextTrans, statuses: nextStatuses, dirty: true });
      // [s82] 세그먼트 확정 = AI 번역 작가 수락 → AI_SUGGESTION 귀속.
      // 'translate' 구분은 logAcceptAI 에 note 입력이 없어 targetId prefix 로 전달 (정직).
      if (txt) {
        fireCpLog(
          getCreativeLogger()?.logAcceptAI({
            targetType: "manuscript",
            targetId: `translate:${lang}:${activeManuscript?.episode ?? 0}:${segId}`,
            episodeId: activeManuscript?.episode,
            afterContent: txt,
            stage: "translate",
          }),
        );
      }
    },
    [lang, suggestions, translations, statuses, persistTranslations, activeManuscript],
  );

  const rejectSuggestion = useCallback(
    (segId: string) => {
      const key = lang + ":" + segId;
      setSuggestions((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setStatuses((prev) => ({ ...prev, [segId]: "pending" }));
    },
    [lang],
  );

  // AI 바 / chip 재번역 요청 — 선택 세그먼트에 지시문 적용
  const handleAiSend = useCallback(() => {
    const directive = aiText.trim();
    if (!effectiveSelected) return;
    translateSegment(effectiveSelected, directive || undefined);
    setAiText("");
  }, [aiText, effectiveSelected, translateSegment]);

  // 전체 회차 일괄 번역 — translateBatch 실 엔진
  const handleTranslateAll = useCallback(async () => {
    if (!activeManuscript) return;
    setProgressLabel("일괄 번역 중…");
    const partial = buildPartialConfig();
    const results = await translateBatch([activeManuscript], partial);
    const r = results[0];
    if (r && r.translatedText) {
      // 회차 전체 번역문을 세그먼트 수만큼 분배 (외부 텍스트 — 위치 매핑+꼬리 흡수 fallback).
      const mapped = mapStoredToSegments(r.translatedText, undefined, segments.map((seg) => seg.id));
      const next: Record<string, string> = {};
      const nextStatus: Record<string, SegStatus> = {};
      for (const seg of segments) {
        const txt = mapped[seg.id];
        if (txt) {
          next[lang + ":" + seg.id] = txt;
          nextStatus[seg.id] = "done";
        }
      }
      setTranslations((prev) => ({ ...prev, ...next }));
      setStatuses((prev) => ({ ...prev, ...nextStatus }));
      setAvgScore(r.avgScore);
      // [W2-translate] 일괄 번역 = 실제 편집(회차 전량 재확정) → dirty (사인오프 재승인 필요).
      persistTranslations({
        translations: { ...translations, ...next },
        statuses: { ...statuses, ...nextStatus },
        avgScore: r.avgScore,
        dirty: true,
      });
      // [s82] 일괄 번역 적용 = 회차당 1건 배치 기록 (세그먼트별 스팸 방지 — 문서화된 선택)
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "manuscript",
          targetId: `translate:${lang}:${activeManuscript.episode}:batch`,
          episodeId: activeManuscript.episode,
          afterContent: r.translatedText,
          stage: "translate",
        }),
      );
    }
    setProgressLabel("");
  }, [activeManuscript, buildPartialConfig, translateBatch, segments, lang, translations, statuses, persistTranslations]);

  // ── Glossary persist (setConfig → IndexedDB+Firestore) ──
  const addGlossary = useCallback(
    (source: string, target: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        const existing = tc?.glossary ?? [];
        if (existing.some((g) => g.source === source)) return prev;
        const nextGlossary = [...existing, { source, target, locked: false }];
        return {
          ...prev,
          translationConfig: {
            mode: tc?.mode ?? "fidelity",
            targetLang: tc?.targetLang ?? "EN",
            band: tc?.band ?? 0.5,
            scoreThreshold: tc?.scoreThreshold ?? 0.7,
            maxRecreate: tc?.maxRecreate ?? 2,
            contractionLevel: tc?.contractionLevel ?? "normal",
            glossary: nextGlossary,
          },
        };
      });
    },
    [setConfig],
  );

  const removeGlossary = useCallback(
    (source: string) => {
      setConfig((prev: StoryConfig) => {
        const tc = prev.translationConfig;
        if (!tc) return prev;
        return {
          ...prev,
          translationConfig: { ...tc, glossary: (tc.glossary ?? []).filter((g) => g.source !== source) },
        };
      });
    },
    [setConfig],
  );

  // ── 하단 바: export / 저장 / 미리보기 / 되돌리기 ─────────
  const exportApi = useStudioExport({
    currentSession,
    sessions,
    currentSessionId,
    currentProjectId,
    projects,
    // setProjects/setSessions: export 의 manuscripts export 경로는 projects 만 읽으므로 no-op 안전.
    // (이 탭은 import/세션 변경을 호출하지 않음 — exportProjectManuscripts 만 사용.)
    setProjects: () => {},
    setCurrentProjectId,
    setSessions: () => {},
    setCurrentSessionId,
    setActiveTab: () => {},
    isKO,
    language,
    writingMode,
    editDraft,
  });

  const handleExport = useCallback(() => {
    exportApi.exportProjectManuscripts("txt");
  }, [exportApi]);

  // 미리보기 — 현재 언어 번역문을 새 창에 렌더 (실 동작)
  const handlePreview = useCallback(() => {
    const ordered = segments
      .map((s) => translations[lang + ":" + s.id] || suggestions[lang + ":" + s.id] || "")
      .filter(Boolean);
    if (ordered.length === 0) return;
    const esc = (t: string) =>
      t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const body = ordered.map((p) => `<p>${esc(p)}</p>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    const title = esc((activeManuscript?.title ?? currentSession?.title ?? "Translation") + " · " + LANGS[lang].native);
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
        `<style>body{max-width:760px;margin:48px auto;padding:0 24px;font-family:serif;line-height:1.85;color:#222}h1{font-family:sans-serif;font-size:18px;color:#555}p{margin:0 0 1em}</style>` +
        `</head><body><h1>${title}</h1>${body}</body></html>`,
    );
    w.document.close();
  }, [segments, translations, suggestions, lang, activeManuscript, currentSession]);

  // 되돌리기 — 현재 언어의 번역/제안/상태 초기화 (확정 작업 폐기)
  const handleRevert = useCallback(() => {
    const prefix = lang + ":";
    const strip = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith(prefix)));
    // [W2-translate 2026-06-11] 비동기 setState 전에 폐기 후 버퍼를 명시 계산해 override 로
    //   영속에 전달 — functional setState 클로저는 persist 시점에 아직 반영 전이라 직접 계산.
    const nextTrans = strip(translations);
    const nextStatuses: Record<string, SegStatus> = {};
    for (const seg of segments) nextStatuses[seg.id] = "pending";
    setTranslations(nextTrans);
    setSuggestions((prev) => strip(prev));
    setStatuses(nextStatuses);
    setAvgScore(null);
    // 되돌리기 = 실제 편집(확정 폐기) → dirty. 확정 세그먼트 0 → 저장된 엔트리 제거
    // (사인오프 포함) — 폐기 의미와 일치. 영속 entry 가 없으면 no-op(computeTM null).
    persistTranslations({ translations: nextTrans, statuses: nextStatuses, avgScore: null, dirty: true });
  }, [lang, segments, translations, persistTranslations]);

  const handleSave = useCallback(() => {
    persistTranslations();
    triggerSave();
  }, [triggerSave, persistTranslations]);

  // ── 진행률 계산 (실 데이터) ─────────────────────────────
  const doneCount = segments.filter((s) => statuses[s.id] === "done").length;
  const total = segments.length;
  const liveProgress = total > 0 ? doneCount / total : 0;

  // 현재 언어는 실시간 진행률, 그 외 언어는 저장된 번역 엔트리 유무로 추정 (0/1)
  const progressForLang = (k: LangKey): number => {
    if (k === lang) return liveProgress;
    const stored = (config?.translatedManuscripts ?? []).find(
      (e) => e.episode === activeManuscript?.episode && e.targetLang === LANG_TO_TARGET[k],
    );
    return stored ? 1 : 0;
  };
  const progressMap: Record<LangKey, number> = {
    en: progressForLang("en"),
    ja: progressForLang("ja"),
    zh: progressForLang("zh"),
  };
  const stats = { progress: liveProgress, done: doneCount, total, avgScore };
  const lockedGlossaryCount = glossary.filter((term) => term.locked).length;
  const txDecisionItems = [
    {
      label: "원문 보존",
      value: total > 0 ? `${total}문단 기준` : "원고 대기",
      Icon: Eye,
    },
    {
      label: "용어 고정",
      value: lockedGlossaryCount > 0 ? `${lockedGlossaryCount}/${glossary.length}개 고정` : `${glossary.length}개 용어`,
      Icon: Lock,
    },
    {
      label: "검수",
      value: qualityGate ? "품질 게이트 준비" : "확정 후 점검",
      Icon: Check,
    },
    {
      label: "사인오프",
      value: doneCount === total && total > 0 ? "내보내기 준비" : `${doneCount}/${total} 확정`,
      Icon: Download,
    },
  ] as const;

  // ── 빈 상태 가드 ────────────────────────────────────────
  if (!currentSession) {
    return (
      <EmptyState
        reason="no-session"
        onGoProject={() => setLoreguardTab("project")}
        onGoWriting={() => setLoreguardTab("writing")}
      />
    );
  }
  if (!activeManuscript || segments.length === 0) {
    return (
      <EmptyState
        reason="no-manuscript"
        onGoProject={() => setLoreguardTab("project")}
        onGoWriting={() => setLoreguardTab("writing")}
      />
    );
  }

  const bottomActions: [string, typeof Sync, () => void][] = [
    ["되돌리기", Sync, handleRevert],
    ["저장", Download, handleSave],
    ["미리보기", Eye, handlePreview],
  ];

  return (
    <div className="tx-grid">
      <TranslateRail
        lang={lang}
        onLang={setLang}
        progress={progressMap}
        layout={layout}
        onLayout={setLayout}
        chapters={chapters}
        activeManuscriptEp={activeManuscript.episode}
        onSelectChapter={handleSelectChapter}
      />

      <div className="tx-center">
        <div className="tx-decision-strip" aria-label="번역 품질 루프">
          <div className="tx-decision-copy">
            <span>번역 품질 루프</span>
            <b>원문 보존 → 용어 고정 → 검수 → 사인오프</b>
          </div>
          {txDecisionItems.map(({ label, value, Icon }) => (
            <div key={label} className="tx-decision-item">
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>

        <TranslateEditor
          segments={segments}
          lang={lang}
          layout={layout}
          statuses={statuses}
          translations={translations}
          suggestions={suggestions}
          selectedId={effectiveSelected}
          onSelect={setSelectedId}
          activeTerm={activeTerm}
          onTranslateSeg={(id) => translateSegment(id)}
          onAcceptSugg={acceptSuggestion}
          onRejectSugg={rejectSuggestion}
          busy={isTranslating}
        />

        {/* bottom action bar */}
        <div className="tx-bottom">
          <div className="tx-actions">
            {bottomActions.map(([label, Icon, onClick]) => (
              <button key={label} className="tx-act" onClick={onClick}>
                <Icon size={16} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
            <button className="btn primary" style={{ marginLeft: "4px" }} onClick={handleExport}>
              <Download size={15} strokeWidth={1.6} />
              번역본 내보내기
            </button>
          </div>
          <div className="tx-ai">
            <div className="tx-ai-bar">
              <span className="tx-ai-spark">
                <Sparkle size={16} strokeWidth={1.6} />
              </span>
              <input
                className="tx-ai-input"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isTranslating && handleAiSend()}
                placeholder={
                  progressLabel || "선택한 문단을 노아에게 재번역 요청… (Enter)"
                }
                disabled={isTranslating}
              />
              {isTranslating ? (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="번역 취소"
                  title="번역 취소"
                  onClick={abort}
                >
                  <X size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="재번역 요청 전송"
                  title="재번역 요청 전송"
                  onClick={handleAiSend}
                >
                  <Send size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="tx-chips">
              <button
                className="tx-chip"
                onClick={handleTranslateAll}
                disabled={isTranslating}
                title="현재 회차 전체를 일괄 번역"
              >
                <Sparkle size={13} strokeWidth={1.6} />
                전체 번역
              </button>
              {REWRITE_CHIPS.map((c) => (
                <button
                  key={c}
                  className="tx-chip"
                  disabled={isTranslating || !effectiveSelected}
                  onClick={() => {
                    if (effectiveSelected) translateSegment(effectiveSelected, c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TranslatePanel
        lang={lang}
        uiLanguage={language}
        stats={stats}
        glossary={glossary}
        activeTerm={activeTerm}
        onTerm={setActiveTerm}
        onAddGlossary={addGlossary}
        onRemoveGlossary={removeGlossary}
        onOpenPanel={setOpenPanel}
        open={panelOpen}
        onToggle={togglePanel}
        gate={qualityGate}
        trackComparison={trackComparison}
        riskReport={riskReport}
      />

      {/* [C-translate-panels] 구 번역 셸 3패널 slide-over (fixed overlay) */}
      <TranslatePanels
        open={openPanel}
        onClose={() => setOpenPanel(null)}
        lang={lang}
        activeEpisode={activeManuscript.episode}
        source={activeManuscript.content ?? ""}
        result={liveResult}
        onResultChange={applyExternalResult}
      />
    </div>
  );
}

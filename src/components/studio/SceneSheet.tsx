"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { showAlert } from "@/lib/show-alert";
import type { GrammarRegion } from "@/lib/grammar-packs";
import { createT, L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeSceneSheet } from "@/lib/studio-types";
import type { GenreMode } from "@/lib/genre-labels";
import { useStudioUI } from "@/contexts/StudioContext";
import { useGenreLabel } from "@/hooks/useGenreLabel";
// [s82-stage-coverage] 명시 기록 직후 auto-trigger 이중 계상 억제 (HCI 무결성)
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import {
  CLIFF_TYPES,
  DOPAMINE_DEVICES,
  EMOTIONS,
  GENRE_SMART_DEFAULTS,
  HOOK_TYPES,
  SCENE_PRESETS,
  TENSION_LEVEL_MAP,
  TONE_OPTIONS,
  type CanonEntry,
  type CliffEntry,
  type DialogueRule,
  type DopamineEntry,
  type EmotionPoint,
  type ForeshadowEntry,
  type FullDirectionData,
  type GogumaEntry,
  type HookEntry,
  type Lang,
  type PacingEntry,
  type SceneSheetProps,
  type TensionPoint,
  type TransitionEntry,
} from "./SceneSheet.data";
import { PlotBarEditor, SceneSheetHistorySidebar, SceneSheetSetupPanel, Section } from "./SceneSheet.parts";

export type { FullDirectionData, SceneSheetProps } from "./SceneSheet.data";

// ============================================================
// PART 3 — SceneSheet 메인 컴포넌트 (3-section 씬시트 + 13탭 고급 설정)
// ============================================================

export default function SceneSheet({
  lang: langProp, language: languageProp, synopsis, characterNames, tierContext,
  onDirectionUpdate, onSimRefUpdate, initialDirection, onSaveEpisodeSheet,
  initialTab: _initialTab, episodeSceneSheets, currentEpisode, onDeleteEpisodeSheet, onLoadEpisodeSheet,
  grammarRegion: grammarRegionProp, onGrammarRegionChange,
  genreMode, onGenreModeChange,
}: SceneSheetProps) {
  const lang: Lang = langProp ?? ((languageProp === "KO" || languageProp === "JP") ? "ko" : "en");
  const tl = createT(languageProp ?? (lang === "ko" ? "KO" : "EN"));
  const { showConfirm, closeConfirm } = useStudioUI();

  // --- Unified direction state ---
  const [gogumas, setGogumas] = useState<GogumaEntry[]>(initialDirection?.goguma ?? []);
  const [hooks, setHooks] = useState<HookEntry[]>(initialDirection?.hooks ?? []);
  const [emotions, setEmotions] = useState<EmotionPoint[]>(initialDirection?.emotions ?? []);
  const [dialogueRules, setDialogueRules] = useState<DialogueRule[]>(initialDirection?.dialogueRules ?? []);
  const [dopamines, setDopamines] = useState<DopamineEntry[]>(initialDirection?.dopamines ?? []);
  const [cliffs, setCliffs] = useState<CliffEntry[]>(initialDirection?.cliffs ?? []);
  const [foreshadows, setForeshadows] = useState<ForeshadowEntry[]>(initialDirection?.foreshadows ?? []);
  const [pacings, setPacings] = useState<PacingEntry[]>(initialDirection?.pacings ?? [
    { id: "p-1", section: L4(lang, { ko: "도입", en: "Intro", ja: "導入", zh: "引入" }), percent: 20, desc: "" },
    { id: "p-2", section: L4(lang, { ko: "전개", en: "Development", ja: "展開", zh: "发展" }), percent: 50, desc: "" },
    { id: "p-3", section: L4(lang, { ko: "전환", en: "Transition", ja: "転換", zh: "转折" }), percent: 30, desc: "" },
  ]);
  const [tensionPoints, setTensionPoints] = useState<TensionPoint[]>(initialDirection?.tensionPoints ?? []);
  const [canons, setCanons] = useState<CanonEntry[]>(initialDirection?.canons ?? []);
  const [transitions, setTransitions] = useState<TransitionEntry[]>(initialDirection?.transitions ?? []);
  const [writerNotes, setWriterNotes] = useState(initialDirection?.writerNotes ?? "");
  const [plotStructure, setPlotStructure] = useState(initialDirection?.plotStructure ?? "");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [grammarRegion, setGrammarRegion] = useState<GrammarRegion>(grammarRegionProp ?? "KR");
  const [showGrammarPanel, setShowGrammarPanel] = useState(false);
  // [C] "빈 씬시트로 바로 시작" 의도 추적 — 사용자가 EmptyState에서 "빈 시트" 선택하면 EmptyState 숨김
  const [blankStarted, setBlankStarted] = useState(false);

  // [C] 핵심 데이터가 모두 비어 있는지 계산. initialDirection이 있으면 false.
  //     pacings는 기본값으로 3개 세팅되므로 제외.
  const isSceneSheetEmpty =
    !blankStarted &&
    !activePreset &&
    !writerNotes.trim() &&
    (initialDirection?.goguma?.length ?? 0) === 0 &&
    !initialDirection?.writerNotes;

  // grammarRegion 변경 시 상위(StoryConfig)에 전파
  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegion !== grammarRegionProp) {
      onGrammarRegionChange?.(grammarRegion);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegion]);

  // 상위에서 grammarRegion이 변경되면 로컬 state 동기화
  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegionProp !== grammarRegion) {
      setGrammarRegion(grammarRegionProp);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegionProp]);

  const sortedEmotions = useMemo(() => [...emotions].sort((a, b) => a.position - b.position), [emotions]);
  const sortedTensionPoints = useMemo(() => [...tensionPoints].sort((a, b) => a.position - b.position), [tensionPoints]);

  // M5 — Genre translation hook
  const genre = useGenreLabel(genreMode);
  const effectiveGenreMode: GenreMode = genreMode ?? 'novel';
  // game 모드에서는 goguma 입력 UI를 숨긴다 (저장된 값은 그대로 유지).
  const hideGoguma = effectiveGenreMode === 'game';

  // World-check reference checkpoints
  const [simRef, setSimRef] = useState({ worldConsistency: false, civRelations: false, timeline: false, territoryMap: false, languageSystem: false, genreLevel: false });

  /** Build current FullDirectionData snapshot */
  const buildDirection = useCallback((): FullDirectionData => ({
    goguma: gogumas, hooks, emotions, dialogueRules, dopamines, cliffs,
    foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure,
  }), [gogumas, hooks, emotions, dialogueRules, dopamines, cliffs, foreshadows, pacings, tensionPoints, canons, transitions, writerNotes, plotStructure]);

  // Sync direction to parent (debounced 300ms)
  const onDirRef = useRef(onDirectionUpdate);
  onDirRef.current = onDirectionUpdate;
  useEffect(() => {
    const timer = setTimeout(() => onDirRef.current?.(buildDirection()), 300);
    return () => clearTimeout(timer);
  }, [buildDirection]);

  /** Apply a genre preset into current direction state */
  const applyScenePreset = useCallback((presetKey: string) => {
    const preset = SCENE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    showConfirm({
      title: L4(lang, { ko: "프리셋 덮어쓰기", en: "Overwrite with Preset", ja: "プリセット上書き", zh: "预设覆盖" }),
      message: L4(lang, { ko: "현재 연출 데이터를 프리셋으로 덮어쓰시겠습니까?", en: "Overwrite current scene sheet data with this preset?", ja: "現在の演出データをプリセットで上書きしますか？", zh: "要将当前演出数据以预设覆盖吗？" }),
      variant: 'warning',
      confirmLabel: L4(lang, { ko: "덮어쓰기", en: "Overwrite", ja: "上書き", zh: "覆盖" }),
      cancelLabel: L4(lang, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
      onConfirm: () => {
        const ts = Date.now();
        const data = preset.gen(ts, lang === "ko");
        setGogumas(data.gogumas);
        setHooks(data.hooks);
        setEmotions(data.emotions);
        setDialogueRules(data.dialogue);
        setDopamines(data.dopamines);
        setCliffs(data.cliffs);
        setActivePreset(presetKey);
        closeConfirm();
      },
    });
  }, [lang, showConfirm, closeConfirm]);

  /** Apply smart defaults — fills only empty fields based on active genre preset */
  const applySmartDefaults = useCallback((presetKey: string) => {
    const defaults = GENRE_SMART_DEFAULTS[presetKey];
    if (!defaults) return;
    const ts = Date.now();
    const isKO = lang === "ko";

    // Goguma: fill only if empty
    if (gogumas.length === 0) {
      setGogumas([
        { id: `sd-g-${ts}-1`, type: "goguma", intensity: defaults.goguma_intensity, desc: "", episode: 1 },
        { id: `sd-g-${ts}-2`, type: "cider", intensity: "large", desc: "", episode: 1 },
      ]);
    }

    // Hooks: fill only if empty
    if (hooks.length === 0) {
      setHooks(defaults.hooks.map((ht, i) => ({
        id: `sd-h-${ts}-${i}`, position: (i === 0 ? "opening" : "ending") as "opening" | "middle" | "ending",
        hookType: ht, desc: "",
      })));
    }

    // Cliffhanger: fill only if empty
    if (cliffs.length === 0) {
      setCliffs([{ id: `sd-cl-${ts}`, cliffType: defaults.cliffhanger, desc: "", episode: 1 }]);
    }

    // Dopamine: fill only if empty
    if (dopamines.length === 0) {
      setDopamines(defaults.dopamine.map((dev, i) => ({
        id: `sd-dp-${ts}-${i}`, scale: "medium" as const, device: dev, desc: "", resolved: false,
      })));
    }

    // Tension: fill only if empty
    if (tensionPoints.length === 0) {
      const level = TENSION_LEVEL_MAP[defaults.tension] ?? 50;
      setTensionPoints([{ id: `sd-tp-${ts}`, position: 50, level, label: isKO ? "기본 텐션" : "Base tension" }]);
    }

    setActivePreset(presetKey);
  }, [lang, gogumas.length, hooks.length, cliffs.length, dopamines.length, tensionPoints.length]);

  /** Save current direction as episode scene sheet */
  const handleSaveEpisode = useCallback(() => {
    if (!onSaveEpisodeSheet) return;
    const ep = currentEpisode ?? 1;
    const dir = buildDirection();
    const sheet: EpisodeSceneSheet = {
      episode: ep,
      title: L4(lang, { ko: `${ep}화 씬시트`, en: `Episode ${ep} Scene Sheet`, ja: `第${ep}話 シーンシート`, zh: `第${ep}章 场景表` }),
      directionSnapshot: {
        goguma: dir.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc, episode: g.episode })),
        hooks: dir.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
        emotionTargets: dir.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity, position: e.position })),
        dialogueTones: dir.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
        dopamineDevices: dir.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc, resolved: dp.resolved })),
        cliffhanger: dir.cliffs[0] ? { cliffType: dir.cliffs[0].cliffType, desc: dir.cliffs[0].desc, episode: dir.cliffs[0].episode } : undefined,
        foreshadows: dir.foreshadows.map(f => ({ planted: f.planted, payoff: f.payoff, episode: f.episode, resolved: f.resolved })),
        pacings: dir.pacings.map(p => ({ section: p.section, percent: p.percent, desc: p.desc })),
        tensionCurve: dir.tensionPoints.map(t => ({ position: t.position, level: t.level, label: t.label })),
        canonRules: dir.canons.map(c => ({ character: c.character, rule: c.rule })),
        sceneTransitions: dir.transitions.map(t => ({ fromScene: t.fromScene, toScene: t.toScene, method: t.method })),
        writerNotes: dir.writerNotes,
        activeCharacters: dir.dialogueRules.map(d => d.character),
        plotStructure: dir.plotStructure,
      },
      presetUsed: activePreset ?? undefined,
      lastUpdate: Date.now(),
    };
    onSaveEpisodeSheet(sheet);

    // [Phase 1.2-5 — 2026-05-07] SceneSheet 직접 trigger.
    // useCreativeProcessAutoTrigger (signature hash, 1분 cooldown) 보완.
    // window.__creativeLogger 는 StudioShell 에서 mount (Phase 1.2-4).
    // 실패 silent — 부가 가치 (메인 저장 흐름 차단 X).
    // [Loop 1 fix — 2026-05-07] inline cast 제거 (types/creative-logger-global.d.ts 사용).
    try {
      const cl = typeof window !== 'undefined' ? window.__creativeLogger : undefined;
      if (cl?.logHumanEdit) {
        void cl.logHumanEdit({
          targetType: 'scene',
          targetId: `scene-ep${ep}`,
          episodeId: ep,
          afterContent: JSON.stringify(sheet.directionSnapshot),
          note: `Scene sheet save (preset=${activePreset ?? 'none'})`,
          // [s82-stage-coverage] stage 는 별도 optional 필드 — targetType 에
          // 'scene-sheet' 박는 것 금지 (union 외 값 = tsc fail·s81 공격 벡터).
          stage: 'scene-sheet',
        });
        // [s82] 같은 setConfig 변경이 useCreativeProcessAutoTrigger 의
        // scenesHash diff 로 HUMAN_REVISION 1건 더 찍히는 이중 계상 억제.
        markExplicitCreativeLog('scene');
      }
    } catch { /* noop */ }
  }, [onSaveEpisodeSheet, currentEpisode, buildDirection, activePreset, lang]);

  /** AI auto-generate direction */
  const handleAIGenerate = useCallback(async () => {
    const { activeSupportsStructured } = await import("@/lib/ai-providers");
    if (!activeSupportsStructured()) { showAlert(L4(lang, { ko: "현재 설정에서는 구조화 제안을 사용할 수 없습니다. 연결 키나 실행 경로를 확인해 주세요.", en: "Current Noa engine does not support structured suggestions.", ja: "現在のノアエンジンは構造化提案に未対応です。", zh: "当前诺亚引擎不支持结构化建议。" })); return; }
    if (!synopsis) { showAlert(tl("sceneSheet.synopsisRequired")); return; }
    try {
      const { generateSceneDirection } = await import("@/services/geminiService");
      const appLang: AppLanguage = lang === "ko" ? (languageProp === "JP" ? "JP" : languageProp === "CN" ? "CN" : "KO") : "EN";
      const result = await generateSceneDirection(synopsis, characterNames ?? [], appLang, tierContext);
      const ts = Date.now();
      if (result.hooks?.length) setHooks(result.hooks.map((h: { position?: string; hookType?: string; desc?: string }, i: number) => ({ id: `ai-h-${ts}-${i}`, position: (h.position || "opening") as "opening" | "middle" | "ending", hookType: h.hookType || "question", desc: h.desc || "" })));
      if (result.goguma?.length) setGogumas(result.goguma.map((g: { type?: string; intensity?: string; desc?: string }, i: number) => ({ id: `ai-g-${ts}-${i}`, type: (g.type === "cider" ? "cider" : "goguma") as "goguma" | "cider", intensity: (g.intensity || "medium") as "small" | "medium" | "large", desc: g.desc || "", episode: 1 })));
      if (result.cliffhanger) setCliffs([{ id: `ai-c-${ts}`, cliffType: result.cliffhanger.cliffType || "info-before", desc: result.cliffhanger.desc || "", episode: 1 }]);
      if (result.emotionTargets?.length) setEmotions(result.emotionTargets.map((e: { emotion: string; intensity?: number }, i: number) => ({ id: `ai-e-${ts}-${i}`, position: Math.round((i / Math.max(result.emotionTargets.length - 1, 1)) * 100), emotion: e.emotion, intensity: e.intensity || 70 })));
      if (result.dialogueTones?.length) setDialogueRules(result.dialogueTones.map((d: { character: string; tone: string }, i: number) => ({ id: `ai-d-${ts}-${i}`, character: d.character, tone: d.tone, notes: "" })));
      if (result.foreshadows?.length) setForeshadows(result.foreshadows.map((f: { planted: string; payoff: string }, i: number) => ({ id: `ai-f-${ts}-${i}`, planted: f.planted, payoff: f.payoff, episode: 1, resolved: false })));
      if (result.dopamineDevices?.length) setDopamines(result.dopamineDevices.map((dp: { scale?: string; device: string; desc: string }, i: number) => ({ id: `ai-dp-${ts}-${i}`, scale: (dp.scale || "medium") as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: false })));
      if (result.pacings?.length) setPacings(result.pacings.map((p: { section: string; percent?: number; desc: string }, i: number) => ({ id: `ai-p-${ts}-${i}`, section: p.section, percent: p.percent || 25, desc: p.desc })));
      if (result.tensionCurve?.length) setTensionPoints(result.tensionCurve.map((t: { position: number; level: number; label: string }, i: number) => ({ id: `ai-t-${ts}-${i}`, position: t.position, level: t.level, label: t.label })));

      // [s82-stage-coverage] 연출 AI 초안 = AI_DRAFT 귀속 (작가 1.0 오귀속 금지).
      // 로컬 state 만 갱신 (config X) → auto-trigger 미발화 → markExplicit 불필요.
      // CharacterTab.tsx:119-131 null-safe 패턴 — fire-and-forget·실패 비차단.
      try {
        const cl = typeof window !== 'undefined' ? window.__creativeLogger : undefined;
        if (cl?.logAIDraft) {
          void cl.logAIDraft({
            targetType: 'scene',
            targetId: `direction-ai-${ts}`,
            afterContent: JSON.stringify(result),
            promptLabel: 'AI scene direction generate',
            stage: 'direction',
          });
        }
      } catch { /* noop */ }
    } catch { showAlert(tl("sceneSheet.aiFailed")); }
  }, [lang, languageProp, synopsis, characterNames, tierContext, tl]);

  // --- Render ---
  return (
    <div className="flex gap-0">
      {/* Left: main content */}
      <div className="flex-1 space-y-4 min-w-0">
        <SceneSheetSetupPanel
          lang={lang}
          language={languageProp}
          grammarRegion={grammarRegion}
          setGrammarRegion={setGrammarRegion}
          showGrammarPanel={showGrammarPanel}
          setShowGrammarPanel={setShowGrammarPanel}
          onGenerateDirection={handleAIGenerate}
          translate={tl}
          isSceneSheetEmpty={isSceneSheetEmpty}
          setBlankStarted={setBlankStarted}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          applySmartDefaults={applySmartDefaults}
          applyScenePreset={applyScenePreset}
          onGenreModeChange={onGenreModeChange}
          effectiveGenreMode={effectiveGenreMode}
        />

        <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 space-y-2">
          {/* ========== 핵심 3개: goguma/cider, hooks, cliffhanger ========== */}
          <div className="mb-2">
            <span className="text-[9px] font-black text-accent-purple uppercase tracking-widest">
              {L4(lang, { ko: "이번 화에 꼭 설정할 것", en: "Must-set for this episode", ja: "今回必ず設定", zh: "本话必设" })}
            </span>
          </div>

          {/* Section 1: Story (핵심 섹션 강조) */}
          <Section title={L4(lang, { ko: "줄거리", en: "Story", ja: "ストーリー", zh: "故事" })}
            highlight
            desc={L4(lang, { ko: "이번 화의 줄거리, 고구마/사이다, 클리프행어를 설계합니다", en: "Design this episode's story, tension/release, and cliffhanger", ja: "ストーリー・テンション・クリフハンガーを設計", zh: "设计故事、张力/释放和悬念" })}
            badge={(() => {
              const items = [writerNotes.trim(), gogumas.length > 0, cliffs.length > 0, foreshadows.length > 0, hooks.length > 0];
              const filled = items.filter(Boolean).length;
              return `${filled}/5 ${L4(lang, { ko: "항목 설정", en: "set", ja: "項目設定", zh: "项目设置" })}`;
            })()}>
            {/* Writer summary */}
            <input value={writerNotes.split("\n")[0] ?? ""} onChange={e => {
              const lines = writerNotes.split("\n"); lines[0] = e.target.value; setWriterNotes(lines.join("\n"));
            }} placeholder={L4(lang, { ko: "이번 화 요약 (한 줄)", en: "Episode summary (one line)", ja: "Episode summary (one line)", zh: "Episode summary (one line)" })} maxLength={200}
              className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors min-h-[44px]" />
            {/* Goguma / Cider — 핵심 1 (M5: game 모드에서는 UI 숨김, 저장 값 유지) */}
            {!hideGoguma && (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                  {genre.formatted('goguma')}
                </span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "독자가 답답함을 느끼는 장치 (해소 시 사이다)", en: "Device that builds frustration (releases as catharsis)", ja: "読者がもどかしさを感じる仕掛け", zh: "让读者感到焦急的装置 (释放时的爽快感)" })}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(["small", "medium", "large"] as const).map(intensity => (
                  <button key={`g-${intensity}`} onClick={() => setGogumas(prev => [...prev, { id: `g-${Date.now()}`, type: "goguma", intensity, desc: "", episode: 1 }])}
                    className="px-2.5 py-1.5 bg-amber-600/10 border border-amber-600/30 rounded text-[10px] font-bold text-amber-500 hover:bg-amber-600/20 transition-colors min-h-[44px]">
                    {L4(lang, ({ small: { ko: "소", en: "S", ja: "小", zh: "小" }, medium: { ko: "중", en: "M", ja: "中", zh: "中" }, large: { ko: "대", en: "L", ja: "大", zh: "大" } })[intensity])}
                  </button>
                ))}
                <button onClick={() => setGogumas(prev => [...prev, { id: `g-${Date.now()}`, type: "cider", intensity: "large", desc: "", episode: 1 }])}
                  className="px-2.5 py-1.5 bg-cyan-600/10 border border-cyan-600/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-600/20 transition-colors min-h-[44px]">
                  {L4(lang, { ko: "사이다", en: "Cider", ja: "サイダー", zh: "解除" })}
                </button>
              </div>
              {gogumas.map((g, i) => (
                <div key={g.id} className={`flex items-center gap-2 mt-1.5 border rounded px-2.5 py-2 ${g.type === "goguma" ? "border-amber-600/30 bg-amber-600/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                  <span className="text-[9px] font-bold uppercase min-w-[32px]">{g.type === "goguma" ? g.intensity[0].toUpperCase() : "R"}</span>
                  <input value={g.desc} onChange={e => setGogumas(prev => prev.map((gg, ii) => ii === i ? { ...gg, desc: e.target.value } : gg))}
                    placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })} maxLength={500} className="flex-1 bg-transparent text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-secondary min-h-[44px]" />
                  <button onClick={() => setGogumas(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `고구마/사이다 ${i + 1} 삭제`, en: `Delete tension/release ${i + 1}`, ja: `テンション ${i + 1} を削除`, zh: `删除张力 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
            )}
            {/* Cliffhanger — 핵심 3 */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "클리프행어", en: "Cliffhanger", ja: "クリフハンガー", zh: "悬念" })}</span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "화 끝에 긴장감을 남기는 방법", en: "How to leave tension at the end of the episode", ja: "エピソード終わりに緊張感を残す方法", zh: "在每话结尾留下悬念的方法" })}</p>
              <div className="flex gap-2 mt-1.5">
                <select value={cliffs[0]?.cliffType ?? ""} onChange={e => {
                  if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: e.target.value, desc: "", episode: 1 }]);
                  else setCliffs(prev => [{ ...prev[0], cliffType: e.target.value }, ...prev.slice(1)]);
                }} className="bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                  <option value="">{L4(lang, { ko: "-- 선택 --", en: "-- Select --", ja: "-- 選択 --", zh: "-- 选择 --" })}</option>
                  {CLIFF_TYPES.map(ct => <option key={ct.id} value={ct.id}>{L4(lang, ct)}</option>)}
                </select>
                <input value={cliffs[0]?.desc ?? ""} onChange={e => {
                  if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: "crisis-cut", desc: e.target.value, episode: 1 }]);
                  else setCliffs(prev => [{ ...prev[0], desc: e.target.value }, ...prev.slice(1)]);
                }} placeholder={L4(lang, { ko: "클리프행어 내용...", en: "Cliffhanger content...", ja: "クリフハンガー内容...", zh: "悬念钩子内容..." })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              </div>
            </div>
            {/* Foreshadow */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "복선/떡밥", en: "Foreshadow", ja: "伏線", zh: "伏笔" })}</span>
                <button onClick={() => setForeshadows(prev => [...prev, { id: `fs-${Date.now()}`, planted: "", payoff: "", episode: 1, resolved: false }])}
                  className="text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
              </div>
              {foreshadows.map((fs, i) => (
                <div key={fs.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2 py-1.5 bg-bg-primary text-[10px]">
                  <input value={fs.planted} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, planted: e.target.value } : f))}
                    placeholder={L4(lang, { ko: "심기", en: "Plant", ja: "Plant", zh: "Plant" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <span className="text-text-tertiary">&#8594;</span>
                  <input value={fs.payoff} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, payoff: e.target.value } : f))}
                    placeholder={L4(lang, { ko: "회수", en: "Payoff", ja: "Payoff", zh: "Payoff" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                    <input type="checkbox" checked={fs.resolved} onChange={e => setForeshadows(prev => prev.map((f, ii) => ii === i ? { ...f, resolved: e.target.checked } : f))} className="accent-accent-green" />
                    {L4(lang, { ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
                  </label>
                  <button onClick={() => setForeshadows(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `복선 ${i + 1} 삭제`, en: `Delete foreshadow ${i + 1}`, ja: `伏線 ${i + 1} を削除`, zh: `删除伏笔 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
          </Section>

          {/* Section 2: Mood (핵심 2: 훅 포함) */}
          <Section title={L4(lang, { ko: "분위기 · 훅", en: "Mood · Hooks", ja: "ムード · フック", zh: "氛围 · 钩子" })}
            highlight
            desc={L4(lang, { ko: "감정선과 훅(독자 유입 장치)을 설계합니다", en: "Design emotion arcs and hooks to engage readers", ja: "感情線とフックを設計", zh: "设计情绪曲线和读者引入装置" })}
            badge={emotions.length > 0
              ? `${L4(lang, { ko: "감정", en: "Emotion", ja: "Emotion", zh: "Emotion" })}: ${emotions[0].emotion} ${Math.round(emotions[0].intensity)}%`
              : undefined}>
            {/* Emotion chips */}
            <div>
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "감정", en: "Emotion", ja: "感情", zh: "情绪" })}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {EMOTIONS.map(emo => (
                  <button key={emo} onClick={() => setEmotions(prev => [...prev, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, position: prev.length * 20, emotion: emo, intensity: 50 }])}
                    className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors min-h-[44px]">
                    {emo}
                  </button>
                ))}
              </div>
              {emotions.length > 0 && (
                <div className="relative h-20 border border-border rounded-lg bg-bg-primary overflow-hidden mt-2">
                  <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "감정 곡선", en: "Emotion curve", ja: "Emotion curve", zh: "Emotion curve" })}>
                    {emotions.length >= 2 && <polyline fill="none" stroke="var(--color-accent-purple)" strokeWidth="0.5" points={sortedEmotions.map(e => `${e.position},${50 - e.intensity / 2}`).join(" ")} />}
                    {emotions.map(e => <circle key={e.id} cx={e.position} cy={50 - e.intensity / 2} r="1.5" fill="var(--color-accent-purple)" />)}
                  </svg>
                </div>
              )}
              {emotions.map((em, i) => (
                <div key={em.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                  <span className="text-[10px] font-bold w-12 truncate">{em.emotion}</span>
                  <input type="range" min={0} max={100} value={em.intensity} aria-label={L4(lang, { ko: "감정 강도", en: "Emotion intensity", ja: "Emotion intensity", zh: "Emotion intensity" })}
                    onChange={e => setEmotions(prev => prev.map((ee, ii) => ii === i ? { ...ee, intensity: parseInt(e.target.value) } : ee))} className="flex-1 h-1 accent-accent-purple" />
                  <span className="text-[9px] font-bold text-accent-purple w-6 text-right">{em.intensity}</span>
                  <button onClick={() => setEmotions(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `감정점 ${i + 1} 삭제`, en: `Delete emotion point ${i + 1}`, ja: `感情点 ${i + 1} を削除`, zh: `删除情感点 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
            {/* Tension slider */}
            <div>
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "텐션 레벨", en: "Tension Level", ja: "テンション", zh: "张力等级" })}</span>
              {tensionPoints.length === 0 && (
                <button onClick={() => setTensionPoints([{ id: `tp-${Date.now()}`, position: 50, level: 50, label: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "텐션 포인트 추가", en: "Add Tension Point", ja: "テンションポイントを追加", zh: "添加张力点" })}</button>
              )}
              {tensionPoints.length > 0 && tensionPoints.slice(0, 1).map((tp, i) => (
                <div key={tp.id} className="flex items-center gap-2 mt-1.5">
                  <input type="range" min={0} max={100} value={tp.level} aria-label={L4(lang, { ko: "텐션 레벨", en: "Tension level", ja: "Tension level", zh: "Tension level" })}
                    onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, level: parseInt(e.target.value) } : t))} className="flex-1 h-1 accent-accent-red" />
                  <span className="text-[10px] font-bold text-accent-red w-10 text-right">{tp.level}%</span>
                </div>
              ))}
            </div>
            {/* Hook — 핵심 2 */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "훅 배치", en: "Hook Design", ja: "フック", zh: "钩子" })}</span>
              </div>
              <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "독자가 다음 화를 클릭하게 만드는 요소", en: "Elements that make readers click the next episode", ja: "読者が次話をクリックしたくなる要素", zh: "让读者点击下一话的要素" })}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(["opening", "middle", "ending"] as const).map(pos => (
                  <button key={pos} onClick={() => setHooks(prev => [...prev, { id: `h-${Date.now()}`, position: pos, hookType: "question", desc: "" }])}
                    className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors min-h-[44px]">
                    + {L4(lang, ({ opening: { ko: "오프닝", en: "Opening", ja: "オープニング", zh: "开头" }, middle: { ko: "미들", en: "Middle", ja: "ミドル", zh: "中间" }, ending: { ko: "엔딩", en: "Ending", ja: "エンディング", zh: "结尾" } })[pos])}
                  </button>
                ))}
              </div>
              {hooks.map((h, i) => (
                <div key={h.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${h.position === "opening" ? "bg-accent-blue/10 text-accent-blue" : h.position === "ending" ? "bg-accent-red/10 text-accent-red" : "bg-amber-500/10 text-amber-400"}`}>{h.position}</span>
                  <select value={h.hookType} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, hookType: e.target.value } : hh))}
                    className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                    {HOOK_TYPES.map(ht => <option key={ht.id} value={ht.id}>{L4(lang, ht)}</option>)}
                  </select>
                  <input value={h.desc} onChange={e => setHooks(prev => prev.map((hh, ii) => ii === i ? { ...hh, desc: e.target.value } : hh))}
                    placeholder={L4(lang, { ko: "훅 내용...", en: "Hook content...", ja: "フック内容...", zh: "钩子内容..." })} maxLength={500} className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                  <button onClick={() => setHooks(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `훅 ${i + 1} 삭제`, en: `Delete hook ${i + 1}`, ja: `フック ${i + 1} を削除`, zh: `删除钩子 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                </div>
              ))}
            </div>
          </Section>

          {/* ========== 추가 설정 (non-essential sections) ========== */}
          <div className="mt-4 mb-2">
            <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-widest">
              {L4(lang, { ko: "추가 설정", en: "Additional Settings", ja: "追加設定", zh: "附加设置" })}
            </span>
          </div>

          {/* Section 3: Cast */}
          <Section title={L4(lang, { ko: "캐릭터", en: "Cast", ja: "キャスト", zh: "角色" })}
            defaultOpen={false}
            desc={L4(lang, { ko: "캐릭터별 대사 톤과 등장 규칙", en: "Dialogue tone and rules per character", ja: "キャラクター別台詞トーンとルール", zh: "角色对话语气和规则" })}
            badge={dialogueRules.length > 0
              ? `${dialogueRules.length}${L4(lang, { ko: "명 선택", en: " selected", ja: "名 選択", zh: "人 选择" })}`
              : characterNames && characterNames.length > 0
                ? `${characterNames.length}${L4(lang, { ko: "명 등록", en: " available", ja: "名 登録", zh: "人 提交" })}`
                : undefined}>
            {characterNames && characterNames.length > 0 ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => { const names = characterNames ?? []; setDialogueRules(names.map(n => ({ id: `d-${Date.now()}-${n}`, character: n, tone: "", notes: "" }))); }}
                    className="text-[13px] text-accent-purple hover:underline min-h-[44px]">{L4(lang, { ko: "전체 선택", en: "Select All", ja: "すべて 選択", zh: "全部 选择" })}</button>
                  <button onClick={() => setDialogueRules([])} className="text-[13px] text-text-tertiary hover:underline min-h-[44px]">{L4(lang, { ko: "초기화", en: "Clear All", ja: "リセット", zh: "重置" })}</button>
                </div>
                {(characterNames ?? []).map(name => {
                  const rule = dialogueRules.find(d => d.character === name);
                  const isActive = !!rule;
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                        <input type="checkbox" checked={isActive} onChange={e => {
                          if (e.target.checked) setDialogueRules(prev => [...prev, { id: `d-${Date.now()}-${name}`, character: name, tone: "", notes: "" }]);
                          else setDialogueRules(prev => prev.filter(d => d.character !== name));
                        }} className="accent-accent-purple" />
                        <span className="text-xs font-bold">{name}</span>
                      </label>
                      {isActive && (
                        <select value={rule?.tone ?? ""} onChange={e => setDialogueRules(prev => prev.map(d => d.character === name ? { ...d, tone: e.target.value } : d))}
                          className="bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                          <option value="">{L4(lang, { ko: "톤 선택", en: "Select tone", ja: "トーン選択", zh: "选择语调" })}</option>
                          {TONE_OPTIONS.map(t => <option key={t.id} value={t.id}>{L4(lang, t)}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <button onClick={() => setDialogueRules(prev => [...prev, { id: `d-${Date.now()}`, character: "", tone: "", notes: "" }])}
                  className="text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "캐릭터 대사 규칙 추가", en: "Add Dialogue Rule", ja: "キャラクターの台詞ルールを追加", zh: "添加角色台词规则" })}</button>
                {dialogueRules.map((dr, i) => (
                  <div key={dr.id} className="flex items-center gap-2 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={dr.character} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, character: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={dr.tone} onChange={e => setDialogueRules(prev => prev.map((d, ii) => ii === i ? { ...d, tone: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "톤", en: "Tone", ja: "Tone", zh: "Tone" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setDialogueRules(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `대사 규칙 ${i + 1} 삭제`, en: `Delete dialogue rule ${i + 1}`, ja: `台詞ルール ${i + 1} を削除`, zh: `删除对话规则 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Writer Notes (multi-line) */}
          <div className="pt-2">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "작가 메모", en: "Writer Notes", ja: "作家メモ", zh: "作者笔记" })}</span>
            <textarea value={writerNotes} onChange={e => setWriterNotes(e.target.value)} maxLength={10000}
              className="w-full mt-1 min-h-[80px] bg-bg-primary border border-border rounded-lg p-3 text-sm leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors resize-y"
              placeholder={tl("sceneSheet.writerNotesPlaceholder")} />
            <div className="text-[9px] text-text-tertiary font-mono mt-0.5">{writerNotes.length.toLocaleString()}{tl("sceneSheet.chars")}</div>
          </div>

          {/* Advanced Settings */}
          <details className="pt-2">
            <summary className="flex items-center gap-1 cursor-pointer text-[13px] font-bold tracking-wider text-text-tertiary hover:text-text-secondary select-none py-2 min-h-[44px]">
              <span className="text-[10px]">&#9654;</span> {L4(lang, { ko: "고급 설정", en: "Advanced Settings", ja: "詳細設定", zh: "高级设置" })}
            </summary>
            <div className="space-y-4 pt-2">
              {/* Dopamine devices */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "도파민 장치", en: "Dopamine Devices", ja: "Dopamine Devices", zh: "Dopamine Devices" })}</span>
                <button onClick={() => setDopamines(prev => [...prev, { id: `dp-${Date.now()}`, scale: "medium", device: "growth", desc: "", resolved: false }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {dopamines.map((dp, i) => (
                  <div key={dp.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <select value={dp.scale} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, scale: e.target.value as "micro" | "medium" | "macro" } : d))}
                      className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[9px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 uppercase min-h-[44px]">
                      <option value="micro">{L4(lang, { ko: "소", en: "Micro", ja: "Micro", zh: "Micro" })}</option>
                      <option value="medium">{L4(lang, { ko: "중", en: "Medium", ja: "Medium", zh: "Medium" })}</option>
                      <option value="macro">{L4(lang, { ko: "대", en: "Macro", ja: "Macro", zh: "Macro" })}</option>
                    </select>
                    <select value={dp.device} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, device: e.target.value } : d))}
                      className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                      {DOPAMINE_DEVICES.map(dd => <option key={dd.id} value={dd.id}>{L4(lang, dd)}</option>)}
                    </select>
                    <input value={dp.desc} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, desc: e.target.value } : d))}
                      placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })} maxLength={500} className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                      <input type="checkbox" checked={dp.resolved} onChange={e => setDopamines(prev => prev.map((d, ii) => ii === i ? { ...d, resolved: e.target.checked } : d))} className="accent-accent-green" />
                      {L4(lang, { ko: "회수", en: "Resolved", ja: "Resolved", zh: "Resolved" })}
                    </label>
                    <button onClick={() => setDopamines(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `도파민 ${i + 1} 삭제`, en: `Delete dopamine ${i + 1}`, ja: `ドーパミン ${i + 1} を削除`, zh: `删除多巴胺 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Canon rules */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "캐릭터 규칙", en: "Canon Rules", ja: "キャラクタールール", zh: "角色规则" })}</span>
                <button onClick={() => setCanons(prev => [...prev, { id: `cn-${Date.now()}`, character: "", rule: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {canons.map((cn, i) => (
                  <div key={cn.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={cn.character} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, character: e.target.value } : c))}
                      placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={cn.rule} onChange={e => setCanons(prev => prev.map((c, ii) => ii === i ? { ...c, rule: e.target.value } : c))}
                      placeholder={L4(lang, { ko: "규칙", en: "Rule", ja: "Rule", zh: "Rule" })} maxLength={500} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setCanons(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `캐논 규칙 ${i + 1} 삭제`, en: `Delete canon rule ${i + 1}`, ja: `キャノン ${i + 1} を削除`, zh: `删除规则 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Scene transitions */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "장면 전환", en: "Scene Transitions", ja: "シーン転換", zh: "场景切换" })}</span>
                <button onClick={() => setTransitions(prev => [...prev, { id: `tr-${Date.now()}`, fromScene: "", toScene: "", method: "" }])}
                  className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}</button>
                {transitions.map((tr, i) => (
                  <div key={tr.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <input value={tr.fromScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, fromScene: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "장면 A", en: "Scene A", ja: "シーン A", zh: "场景 A" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <span className="text-text-tertiary text-xs">&#8594;</span>
                    <input value={tr.toScene} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, toScene: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "장면 B", en: "Scene B", ja: "シーン B", zh: "场景 B" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <input value={tr.method} onChange={e => setTransitions(prev => prev.map((t, ii) => ii === i ? { ...t, method: e.target.value } : t))}
                      placeholder={L4(lang, { ko: "전환 방법", en: "Method", ja: "Method", zh: "Method" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                    <button onClick={() => setTransitions(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `전환 ${i + 1} 삭제`, en: `Delete transition ${i + 1}`, ja: `トランジション ${i + 1} を削除`, zh: `删除转场 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                  </div>
                ))}
              </div>
              {/* Pacing */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "분량 배분", en: "Pacing", ja: "Pacing", zh: "Pacing" })}</span>
                <div className="flex rounded-lg overflow-hidden h-8 border border-border mt-1.5">
                  {pacings.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${p.percent}%`, background: i === 0 ? "#3b82f6" : i === 1 ? "#f59e0b" : "#10b981" }}>
                      {p.section} {p.percent}%
                    </div>
                  ))}
                </div>
                {pacings.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                    <span className="text-[10px] font-bold w-16">{p.section}</span>
                    <input type="range" min={5} max={80} value={p.percent} aria-label={L4(lang, { ko: "페이싱 비중", en: "Pacing weight", ja: "Pacing weight", zh: "Pacing weight" })}
                      onChange={e => setPacings(prev => prev.map((pp, ii) => ii === i ? { ...pp, percent: parseInt(e.target.value) } : pp))} className="flex-1 h-1 accent-accent-purple" />
                    <span className="text-[10px] font-bold text-accent-purple w-8 text-right">{p.percent}%</span>
                  </div>
                ))}
              </div>
              {/* Plot Bar Editor */}
              <div>
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "플롯 구조", en: "Plot Structure", ja: "Plot Structure", zh: "Plot Structure" })}</span>
                <div className="mt-1.5"><PlotBarEditor lang={lang} onPlotChange={setPlotStructure} initialPlot={plotStructure} /></div>
              </div>
              {/* Tension curve (full) */}
              {tensionPoints.length > 1 && (
                <div>
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "텐션 곡선 (상세)", en: "Tension Curve (Detail)", ja: "Tension Curve (Detail)", zh: "Tension Curve (Detail)" })}</span>
                  <div className="relative h-24 border border-border rounded-lg bg-bg-primary overflow-hidden mt-1.5">
                    <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "텐션 곡선", en: "Tension curve", ja: "Tension curve", zh: "Tension curve" })}>
                      {tensionPoints.length >= 2 && <polyline fill="none" stroke="var(--color-accent-red)" strokeWidth="0.8" points={sortedTensionPoints.map(t => `${t.position},${50 - t.level / 2}`).join(" ")} />}
                      {tensionPoints.map(t => <circle key={t.id} cx={t.position} cy={50 - t.level / 2} r="2" fill="var(--color-accent-red)" />)}
                    </svg>
                  </div>
                  <button onClick={() => setTensionPoints(prev => [...prev, { id: `tp-${Date.now()}`, position: prev.length * 20, level: 50, label: "" }])}
                    className="mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">+ {L4(lang, { ko: "텐션 포인트", en: "Tension Point", ja: "Tension Point", zh: "Tension Point" })}</button>
                  {tensionPoints.map((tp, i) => (
                    <div key={tp.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                      <input value={tp.label} onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, label: e.target.value } : t))}
                        placeholder={L4(lang, { ko: "라벨", en: "Label", ja: "Label", zh: "Label" })} maxLength={100} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                      <span className="text-[9px] text-text-tertiary">Pos</span>
                      <input type="range" min={0} max={100} value={tp.position} aria-label="position" onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, position: parseInt(e.target.value) } : t))} className="w-16 h-1 accent-accent-purple" />
                      <span className="text-[9px] text-text-tertiary">Lv</span>
                      <input type="range" min={0} max={100} value={tp.level} aria-label="level" onChange={e => setTensionPoints(prev => prev.map((t, ii) => ii === i ? { ...t, level: parseInt(e.target.value) } : t))} className="w-16 h-1 accent-accent-red" />
                      <span className="text-[9px] font-bold text-accent-red w-6">{tp.level}</span>
                      <button onClick={() => setTensionPoints(prev => prev.filter((_, ii) => ii !== i))} aria-label={L4(lang, { ko: `긴장점 ${i + 1} 삭제`, en: `Delete tension point ${i + 1}`, ja: `テンション点 ${i + 1} を削除`, zh: `删除张力点 ${i + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* World-check reference checkpoints */}
          <div className="border border-border rounded-xl p-4 bg-bg-primary space-y-3 mt-2">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">{tl("sceneSheet.worldSimRef")}</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {([
                { key: "worldConsistency" as const, ko: "세계관 일관성 검증", en: "World Consistency" },
                { key: "civRelations" as const, ko: "문명 관계도", en: "Civilization Relations" },
                { key: "timeline" as const, ko: "시대 타임라인", en: "Era Timeline" },
                { key: "territoryMap" as const, ko: "세력권 지도", en: "Territory Map" },
                { key: "languageSystem" as const, ko: "세계관 언어", en: "Language System" },
                { key: "genreLevel" as const, ko: "장르 레벨 규칙", en: "Genre Level Rules" },
              ]).map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer group min-h-[44px]">
                  <input type="checkbox" checked={simRef[item.key]} onChange={e => { const next = { ...simRef, [item.key]: e.target.checked }; setSimRef(next); onSimRefUpdate?.(next); }} className="accent-accent-purple w-3.5 h-3.5" />
                  <span className={`text-[10px] font-bold transition-colors ${simRef[item.key] ? "text-accent-purple" : "text-text-tertiary group-hover:text-text-secondary"}`}>{L4(lang, item)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save button */}
          {onSaveEpisodeSheet && (
            <div className="pt-3 border-t border-border mt-2">
              <button onClick={handleSaveEpisode}
                className="w-full px-4 py-2.5 text-xs font-bold bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 rounded-lg text-accent-purple font-mono transition-colors min-h-[44px]">
                {L4(lang, { ko: `${currentEpisode ?? ""}화 씬시트 저장`, en: `Save Episode ${currentEpisode ?? ""} Scene Sheet`, ja: `第${currentEpisode ?? ""}話シーンシートを保存`, zh: `保存第${currentEpisode ?? ""}话场景表` })}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PART 3 — Episode Sheet History Sidebar  (lines ~640–700) */}
      {/* ============================================================ */}
      {episodeSceneSheets && episodeSceneSheets.length > 0 && (
        <SceneSheetHistorySidebar
          episodeSceneSheets={episodeSceneSheets}
          lang={lang}
          showConfirm={showConfirm}
          closeConfirm={closeConfirm}
          onLoadEpisodeSheet={onLoadEpisodeSheet}
          onDeleteEpisodeSheet={onDeleteEpisodeSheet}
        />
      )}
    </div>
  );
}

// ============================================================
// PART 4 — 기본 export 및 타입 재노출
// ============================================================
// `export default function SceneSheet` (PART 3 시작부) + `export interface FullDirectionData` (PART 1)
// 외부 호출자는 이 두 심볼을 직접 import 한다.

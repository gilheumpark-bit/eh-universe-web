"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { showAlert } from "@/lib/show-alert";
import type { GrammarRegion } from "@/lib/grammar-packs";
import { createT, L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeSceneSheet } from "@/lib/studio-types";
import type { GenreMode } from "@/lib/genre-labels";
import { useStudioUI } from "@/contexts/StudioContext";
import { useGenreLabel } from "@/hooks/useGenreLabel";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { SceneSheetAdvancedSection } from "./SceneSheet.advanced-section";
import { SceneSheetCoreSections } from "./SceneSheet.core-sections";
import {
  GENRE_SMART_DEFAULTS,
  SCENE_PRESETS,
  TENSION_LEVEL_MAP,
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
import { SceneSheetHistorySidebar, SceneSheetSetupPanel } from "./SceneSheet.parts";

export type { FullDirectionData, SceneSheetProps } from "./SceneSheet.data";

export default function SceneSheet({
  lang: langProp,
  language: languageProp,
  synopsis,
  characterNames,
  tierContext,
  onDirectionUpdate,
  onSimRefUpdate,
  initialDirection,
  onSaveEpisodeSheet,
  initialTab: _initialTab,
  episodeSceneSheets,
  currentEpisode,
  onDeleteEpisodeSheet,
  onLoadEpisodeSheet,
  grammarRegion: grammarRegionProp,
  onGrammarRegionChange,
  genreMode,
  onGenreModeChange,
}: SceneSheetProps) {
  const lang: Lang = langProp ?? (languageProp === "KO" || languageProp === "JP" ? "ko" : "en");
  const tl = createT(languageProp ?? (lang === "ko" ? "KO" : "EN"));
  const { showConfirm, closeConfirm } = useStudioUI();

  const [gogumas, setGogumas] = useState<GogumaEntry[]>(initialDirection?.goguma ?? []);
  const [hooks, setHooks] = useState<HookEntry[]>(initialDirection?.hooks ?? []);
  const [emotions, setEmotions] = useState<EmotionPoint[]>(initialDirection?.emotions ?? []);
  const [dialogueRules, setDialogueRules] = useState<DialogueRule[]>(initialDirection?.dialogueRules ?? []);
  const [dopamines, setDopamines] = useState<DopamineEntry[]>(initialDirection?.dopamines ?? []);
  const [cliffs, setCliffs] = useState<CliffEntry[]>(initialDirection?.cliffs ?? []);
  const [foreshadows, setForeshadows] = useState<ForeshadowEntry[]>(initialDirection?.foreshadows ?? []);
  const [pacings, setPacings] = useState<PacingEntry[]>(
    initialDirection?.pacings ?? [
      { id: "p-1", section: L4(lang, { ko: "도입", en: "Intro", ja: "導入", zh: "引入" }), percent: 20, desc: "" },
      { id: "p-2", section: L4(lang, { ko: "전개", en: "Development", ja: "展開", zh: "发展" }), percent: 50, desc: "" },
      { id: "p-3", section: L4(lang, { ko: "전환", en: "Transition", ja: "転換", zh: "转折" }), percent: 30, desc: "" },
    ],
  );
  const [tensionPoints, setTensionPoints] = useState<TensionPoint[]>(initialDirection?.tensionPoints ?? []);
  const [canons, setCanons] = useState<CanonEntry[]>(initialDirection?.canons ?? []);
  const [transitions, setTransitions] = useState<TransitionEntry[]>(initialDirection?.transitions ?? []);
  const [writerNotes, setWriterNotes] = useState(initialDirection?.writerNotes ?? "");
  const [plotStructure, setPlotStructure] = useState(initialDirection?.plotStructure ?? "");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [grammarRegion, setGrammarRegion] = useState<GrammarRegion>(grammarRegionProp ?? "KR");
  const [showGrammarPanel, setShowGrammarPanel] = useState(false);
  const [blankStarted, setBlankStarted] = useState(false);
  const [simRef, setSimRef] = useState({
    civRelations: false,
    genreLevel: false,
    languageSystem: false,
    territoryMap: false,
    timeline: false,
    worldConsistency: false,
  });

  const isSceneSheetEmpty =
    !blankStarted &&
    !activePreset &&
    !writerNotes.trim() &&
    (initialDirection?.goguma?.length ?? 0) === 0 &&
    !initialDirection?.writerNotes;

  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegion !== grammarRegionProp) {
      onGrammarRegionChange?.(grammarRegion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegion]);

  useEffect(() => {
    if (grammarRegionProp !== undefined && grammarRegionProp !== grammarRegion) {
      setGrammarRegion(grammarRegionProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grammarRegionProp]);

  const genre = useGenreLabel(genreMode);
  const effectiveGenreMode: GenreMode = genreMode ?? "novel";
  const hideGoguma = effectiveGenreMode === "game";

  const buildDirection = useCallback(
    (): FullDirectionData => ({
      canons,
      cliffs,
      dialogueRules,
      dopamines,
      emotions,
      foreshadows,
      goguma: gogumas,
      hooks,
      pacings,
      plotStructure,
      tensionPoints,
      transitions,
      writerNotes,
    }),
    [canons, cliffs, dialogueRules, dopamines, emotions, foreshadows, gogumas, hooks, pacings, plotStructure, tensionPoints, transitions, writerNotes],
  );

  const onDirRef = useRef(onDirectionUpdate);
  onDirRef.current = onDirectionUpdate;
  useEffect(() => {
    const timer = setTimeout(() => onDirRef.current?.(buildDirection()), 300);
    return () => clearTimeout(timer);
  }, [buildDirection]);

  const applyScenePreset = useCallback(
    (presetKey: string) => {
      const preset = SCENE_PRESETS.find((item) => item.key === presetKey);
      if (!preset) return;
      showConfirm({
        title: L4(lang, { ko: "프리셋 덮어쓰기", en: "Overwrite with Preset", ja: "プリセット上書き", zh: "预设覆盖" }),
        message: L4(lang, {
          ko: "현재 연출 데이터를 프리셋으로 덮어쓰시겠습니까?",
          en: "Overwrite current scene sheet data with this preset?",
          ja: "現在の演出データをプリセットで上書きしますか？",
          zh: "要将当前演出数据以预设覆盖吗？",
        }),
        variant: "warning",
        confirmLabel: L4(lang, { ko: "덮어쓰기", en: "Overwrite", ja: "上書き", zh: "覆盖" }),
        cancelLabel: L4(lang, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
        onConfirm: () => {
          const data = preset.gen(Date.now(), lang === "ko");
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
    },
    [closeConfirm, lang, showConfirm],
  );

  const applySmartDefaults = useCallback(
    (presetKey: string) => {
      const defaults = GENRE_SMART_DEFAULTS[presetKey];
      if (!defaults) return;
      const ts = Date.now();
      const isKO = lang === "ko";

      if (gogumas.length === 0) {
        setGogumas([
          { id: `sd-g-${ts}-1`, type: "goguma", intensity: defaults.goguma_intensity, desc: "", episode: 1 },
          { id: `sd-g-${ts}-2`, type: "cider", intensity: "large", desc: "", episode: 1 },
        ]);
      }
      if (hooks.length === 0) {
        setHooks(defaults.hooks.map((hookType, index) => ({
          id: `sd-h-${ts}-${index}`,
          position: (index === 0 ? "opening" : "ending") as "opening" | "middle" | "ending",
          hookType,
          desc: "",
        })));
      }
      if (cliffs.length === 0) {
        setCliffs([{ id: `sd-cl-${ts}`, cliffType: defaults.cliffhanger, desc: "", episode: 1 }]);
      }
      if (dopamines.length === 0) {
        setDopamines(defaults.dopamine.map((device, index) => ({
          id: `sd-dp-${ts}-${index}`,
          scale: "medium" as const,
          device,
          desc: "",
          resolved: false,
        })));
      }
      if (tensionPoints.length === 0) {
        const level = TENSION_LEVEL_MAP[defaults.tension] ?? 50;
        setTensionPoints([{ id: `sd-tp-${ts}`, position: 50, level, label: isKO ? "기본 텐션" : "Base tension" }]);
      }
      setActivePreset(presetKey);
    },
    [cliffs.length, dopamines.length, gogumas.length, hooks.length, lang, tensionPoints.length],
  );

  const handleSaveEpisode = useCallback(() => {
    if (!onSaveEpisodeSheet) return;
    const episode = currentEpisode ?? 1;
    const direction = buildDirection();
    const sheet: EpisodeSceneSheet = {
      episode,
      title: L4(lang, { ko: `${episode}화 씬시트`, en: `Episode ${episode} Scene Sheet`, ja: `第${episode}話 シーンシート`, zh: `第${episode}章 场景表` }),
      directionSnapshot: {
        activeCharacters: direction.dialogueRules.map((rule) => rule.character),
        canonRules: direction.canons.map((rule) => ({ character: rule.character, rule: rule.rule })),
        cliffhanger: direction.cliffs[0]
          ? { cliffType: direction.cliffs[0].cliffType, desc: direction.cliffs[0].desc, episode: direction.cliffs[0].episode }
          : undefined,
        dialogueTones: direction.dialogueRules.map((rule) => ({ character: rule.character, tone: rule.tone, notes: rule.notes })),
        dopamineDevices: direction.dopamines.map((device) => ({ scale: device.scale, device: device.device, desc: device.desc, resolved: device.resolved })),
        emotionTargets: direction.emotions.map((emotion) => ({ emotion: emotion.emotion, intensity: emotion.intensity, position: emotion.position })),
        foreshadows: direction.foreshadows.map((foreshadow) => ({ planted: foreshadow.planted, payoff: foreshadow.payoff, episode: foreshadow.episode, resolved: foreshadow.resolved })),
        goguma: direction.goguma.map((item) => ({ type: item.type, intensity: item.intensity, desc: item.desc, episode: item.episode })),
        hooks: direction.hooks.map((hook) => ({ position: hook.position, hookType: hook.hookType, desc: hook.desc })),
        pacings: direction.pacings.map((pacing) => ({ section: pacing.section, percent: pacing.percent, desc: pacing.desc })),
        plotStructure: direction.plotStructure,
        sceneTransitions: direction.transitions.map((transition) => ({ fromScene: transition.fromScene, toScene: transition.toScene, method: transition.method })),
        tensionCurve: direction.tensionPoints.map((point) => ({ position: point.position, level: point.level, label: point.label })),
        writerNotes: direction.writerNotes,
      },
      lastUpdate: Date.now(),
      presetUsed: activePreset ?? undefined,
    };
    onSaveEpisodeSheet(sheet);

    try {
      const creativeLogger = typeof window !== "undefined" ? window.__creativeLogger : undefined;
      if (creativeLogger?.logHumanEdit) {
        void creativeLogger.logHumanEdit({
          targetType: "scene",
          targetId: `scene-ep${episode}`,
          episodeId: episode,
          afterContent: JSON.stringify(sheet.directionSnapshot),
          note: `Scene sheet save (preset=${activePreset ?? "none"})`,
          stage: "scene-sheet",
        });
        markExplicitCreativeLog("scene");
      }
    } catch {
      // Non-blocking authorship log.
    }
  }, [activePreset, buildDirection, currentEpisode, lang, onSaveEpisodeSheet]);

  const handleAIGenerate = useCallback(async () => {
    const { activeSupportsStructured } = await import("@/lib/ai-providers");
    if (!activeSupportsStructured()) {
      showAlert(L4(lang, {
        ko: "현재 설정에서는 구조화 제안을 사용할 수 없습니다. 연결 키나 실행 경로를 확인해 주세요.",
        en: "Current Noa engine does not support structured suggestions.",
        ja: "現在のノアエンジンは構造化提案に未対応です。",
        zh: "当前诺亚引擎不支持结构化建议。",
      }));
      return;
    }
    if (!synopsis) {
      showAlert(tl("sceneSheet.synopsisRequired"));
      return;
    }
    try {
      const { generateSceneDirection } = await import("@/services/geminiService");
      const appLang: AppLanguage = lang === "ko" ? (languageProp === "JP" ? "JP" : languageProp === "CN" ? "CN" : "KO") : "EN";
      const result = await generateSceneDirection(synopsis, characterNames ?? [], appLang, tierContext);
      const ts = Date.now();
      if (result.hooks?.length) setHooks(result.hooks.map((hook: { position?: string; hookType?: string; desc?: string }, index: number) => ({ id: `ai-h-${ts}-${index}`, position: (hook.position || "opening") as "opening" | "middle" | "ending", hookType: hook.hookType || "question", desc: hook.desc || "" })));
      if (result.goguma?.length) setGogumas(result.goguma.map((item: { type?: string; intensity?: string; desc?: string }, index: number) => ({ id: `ai-g-${ts}-${index}`, type: (item.type === "cider" ? "cider" : "goguma") as "goguma" | "cider", intensity: (item.intensity || "medium") as "small" | "medium" | "large", desc: item.desc || "", episode: 1 })));
      if (result.cliffhanger) setCliffs([{ id: `ai-c-${ts}`, cliffType: result.cliffhanger.cliffType || "info-before", desc: result.cliffhanger.desc || "", episode: 1 }]);
      if (result.emotionTargets?.length) setEmotions(result.emotionTargets.map((emotion: { emotion: string; intensity?: number }, index: number) => ({ id: `ai-e-${ts}-${index}`, position: Math.round((index / Math.max(result.emotionTargets.length - 1, 1)) * 100), emotion: emotion.emotion, intensity: emotion.intensity || 70 })));
      if (result.dialogueTones?.length) setDialogueRules(result.dialogueTones.map((rule: { character: string; tone: string }, index: number) => ({ id: `ai-d-${ts}-${index}`, character: rule.character, tone: rule.tone, notes: "" })));
      if (result.foreshadows?.length) setForeshadows(result.foreshadows.map((foreshadow: { planted: string; payoff: string }, index: number) => ({ id: `ai-f-${ts}-${index}`, planted: foreshadow.planted, payoff: foreshadow.payoff, episode: 1, resolved: false })));
      if (result.dopamineDevices?.length) setDopamines(result.dopamineDevices.map((device: { scale?: string; device: string; desc: string }, index: number) => ({ id: `ai-dp-${ts}-${index}`, scale: (device.scale || "medium") as "micro" | "medium" | "macro", device: device.device, desc: device.desc, resolved: false })));
      if (result.pacings?.length) setPacings(result.pacings.map((pacing: { section: string; percent?: number; desc: string }, index: number) => ({ id: `ai-p-${ts}-${index}`, section: pacing.section, percent: pacing.percent || 25, desc: pacing.desc })));
      if (result.tensionCurve?.length) setTensionPoints(result.tensionCurve.map((point: { position: number; level: number; label: string }, index: number) => ({ id: `ai-t-${ts}-${index}`, position: point.position, level: point.level, label: point.label })));

      try {
        const creativeLogger = typeof window !== "undefined" ? window.__creativeLogger : undefined;
        if (creativeLogger?.logAIDraft) {
          void creativeLogger.logAIDraft({
            targetType: "scene",
            targetId: `direction-ai-${ts}`,
            afterContent: JSON.stringify(result),
            promptLabel: "AI scene direction generate",
            stage: "direction",
          });
        }
      } catch {
        // Non-blocking authorship log.
      }
    } catch {
      showAlert(tl("sceneSheet.aiFailed"));
    }
  }, [characterNames, lang, languageProp, synopsis, tierContext, tl]);

  return (
    <div className="flex gap-0">
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
          <SceneSheetCoreSections
            lang={lang}
            translate={tl}
            characterNames={characterNames}
            dialogueRules={dialogueRules}
            emotions={emotions}
            foreshadows={foreshadows}
            gogumaLabel={genre.formatted("goguma")}
            gogumas={gogumas}
            hideGoguma={hideGoguma}
            hooks={hooks}
            cliffs={cliffs}
            tensionPoints={tensionPoints}
            writerNotes={writerNotes}
            setCliffs={setCliffs}
            setDialogueRules={setDialogueRules}
            setEmotions={setEmotions}
            setForeshadows={setForeshadows}
            setGogumas={setGogumas}
            setHooks={setHooks}
            setTensionPoints={setTensionPoints}
            setWriterNotes={setWriterNotes}
          />

          <SceneSheetAdvancedSection
            canons={canons}
            dopamines={dopamines}
            lang={lang}
            pacings={pacings}
            plotStructure={plotStructure}
            tensionPoints={tensionPoints}
            transitions={transitions}
            setCanons={setCanons}
            setDopamines={setDopamines}
            setPacings={setPacings}
            setPlotStructure={setPlotStructure}
            setTensionPoints={setTensionPoints}
            setTransitions={setTransitions}
          />

          <div className="border border-border rounded-xl p-4 bg-bg-primary space-y-3 mt-2">
            <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary">
              {tl("sceneSheet.worldSimRef")}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: "worldConsistency" as const, ko: "세계관 일관성 검증", en: "World Consistency" },
                { key: "civRelations" as const, ko: "문명 관계도", en: "Civilization Relations" },
                { key: "timeline" as const, ko: "시대 타임라인", en: "Era Timeline" },
                { key: "territoryMap" as const, ko: "세력권 지도", en: "Territory Map" },
                { key: "languageSystem" as const, ko: "세계관 언어", en: "Language System" },
                { key: "genreLevel" as const, ko: "장르 레벨 규칙", en: "Genre Level Rules" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer group min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={simRef[item.key]}
                    onChange={(event) => {
                      const next = { ...simRef, [item.key]: event.target.checked };
                      setSimRef(next);
                      onSimRefUpdate?.(next);
                    }}
                    className="accent-accent-purple w-3.5 h-3.5"
                  />
                  <span className={`text-[10px] font-bold transition-colors ${simRef[item.key] ? "text-accent-purple" : "text-text-tertiary group-hover:text-text-secondary"}`}>
                    {L4(lang, item)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {onSaveEpisodeSheet && (
            <div className="pt-3 border-t border-border mt-2">
              <button onClick={handleSaveEpisode} className="w-full px-4 py-2.5 text-xs font-bold bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 rounded-lg text-accent-purple font-mono transition-colors min-h-[44px]">
                {L4(lang, { ko: `${currentEpisode ?? ""}화 씬시트 저장`, en: `Save Episode ${currentEpisode ?? ""} Scene Sheet`, ja: `第${currentEpisode ?? ""}話シーンシートを保存`, zh: `保存第${currentEpisode ?? ""}话场景表` })}
              </button>
            </div>
          )}
        </div>
      </div>

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

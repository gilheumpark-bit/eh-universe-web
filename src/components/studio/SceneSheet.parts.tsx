"use client";

import { FileText } from "lucide-react";
import { useCallback, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TermTooltip } from "@/components/ui/TermTooltip";
import GenreModeSelector from "@/components/studio/GenreModeSelector";
import { GRAMMAR_PACKS, GRAMMAR_REGIONS, type GrammarRegion } from "@/lib/grammar-packs";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeSceneSheet } from "@/lib/studio-types";
import type { GenreMode } from "@/lib/genre-labels";
import { GENRE_VISUAL, PLOT_PRESETS, SCENE_PRESETS, type Lang, type PlotSegment, type PlotType } from "./SceneSheet.data";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
};

function formatSceneSheetTime(lastUpdate: number, lang: Lang) {
  const locale = lang === "ko" ? "ko-KR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(lastUpdate));
}

function bindStudioTone(node: HTMLElement | null, color: string) {
  if (!node) return;
  node.style.setProperty("--studio-tone-color", color);
}

function bindSceneSegment(node: HTMLElement | null, width: number, color: string) {
  if (!node) return;
  node.style.setProperty("--scene-segment-width", `${width}%`);
  node.style.setProperty("--scene-segment-color", color);
}

export function Section({
  title,
  children,
  defaultOpen = true,
  badge,
  desc,
  highlight,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  desc?: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-b ${highlight ? "border-accent-purple/30 bg-accent-purple/[0.03] rounded-lg -mx-1 px-1" : "border-border"}`}>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={`${title} ${open ? "collapse" : "expand"}`}
        className="flex items-center gap-2 w-full py-3 px-1 text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {highlight && <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />}
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-text-primary">{title}</span>
          </div>
          {desc && <p className="text-[9px] text-text-quaternary mt-0.5 ml-0 font-normal normal-case tracking-normal">{desc}</p>}
        </div>
        {badge && (
          <span className="text-[9px] font-mono font-bold text-accent-purple bg-accent-purple/10 border border-accent-purple/20 rounded-full px-2 py-0.5 shrink-0">
            {badge}
          </span>
        )}
        <span className={`text-[10px] text-text-tertiary transition-transform shrink-0 ${open ? "rotate-90" : ""}`}>&#9654;</span>
      </button>
      {open && <div className="pb-4 px-1 space-y-3">{children}</div>}
    </div>
  );
}

export function SceneSheetSetupPanel({
  lang,
  language,
  grammarRegion,
  setGrammarRegion,
  showGrammarPanel,
  setShowGrammarPanel,
  onGenerateDirection,
  translate,
  isSceneSheetEmpty,
  setBlankStarted,
  activePreset,
  setActivePreset,
  applySmartDefaults,
  applyScenePreset,
  onGenreModeChange,
  effectiveGenreMode,
}: {
  lang: Lang;
  language?: AppLanguage;
  grammarRegion: GrammarRegion;
  setGrammarRegion: (region: GrammarRegion) => void;
  showGrammarPanel: boolean;
  setShowGrammarPanel: Dispatch<SetStateAction<boolean>>;
  onGenerateDirection: () => void;
  translate: (key: string) => string;
  isSceneSheetEmpty: boolean;
  setBlankStarted: (value: boolean) => void;
  activePreset: string | null;
  setActivePreset: Dispatch<SetStateAction<string | null>>;
  applySmartDefaults: (preset: string) => void;
  applyScenePreset: (preset: string) => void;
  onGenreModeChange?: (mode: GenreMode) => void;
  effectiveGenreMode: GenreMode;
}) {
  const termLanguage = language ?? (lang === "ko" ? "KO" : "EN");

  return (
    <>
      <div className="doc-header rounded-t mb-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 p-0.5 bg-black/30 rounded-lg">
            {GRAMMAR_REGIONS.map(region => (
              <button
                key={region}
                onClick={() => setGrammarRegion(region)}
                aria-pressed={grammarRegion === region}
                aria-label={L4(lang, {
                  ko: `문법팩 ${GRAMMAR_PACKS[region].label.ko}`,
                  en: `Grammar pack ${GRAMMAR_PACKS[region].label.en}`,
                  ja: `文法パック ${GRAMMAR_PACKS[region].label.en}`,
                  zh: `语法包 ${GRAMMAR_PACKS[region].label.en}`,
                })}
                className={`px-2 py-1 rounded text-[11px] transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${grammarRegion === region ? "bg-accent-purple text-white shadow" : "text-text-tertiary hover:text-text-primary"}`}
              >
                {GRAMMAR_PACKS[region].flag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-amber mr-2">SCENE</span>
            {lang === "ko" ? (
              <>
                <TermTooltip term="씬시트" language={termLanguage}>씬시트</TermTooltip>
                {" — 장르 문법 설계"}
              </>
            ) : (
              L4(lang, { ko: "씬시트 — 장르 문법 설계", en: "Scene Sheet — Genre Grammar Design", ja: "シーンシート — ジャンル文法の設計", zh: "场景表 — 类型文法设计" })
            )}
            <span className="text-[10px] text-accent-green/70 font-mono ml-auto">
              {L4(lang, { ko: "자동 저장", en: "Auto-saved", ja: "自動保存", zh: "自动保存" })}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGrammarPanel(value => !value)}
            aria-expanded={showGrammarPanel}
            aria-pressed={showGrammarPanel}
            className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${showGrammarPanel ? "bg-accent-green text-white" : "bg-bg-secondary text-text-tertiary border border-border hover:text-text-primary"}`}
          >
            {GRAMMAR_PACKS[grammarRegion].flag} {L4(lang, { ko: "문법", en: "Grammar", ja: "Grammar", zh: "Grammar" })}
          </button>
          <button
            onClick={onGenerateDirection}
            className="px-3 py-1.5 bg-accent-purple text-white rounded text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity min-h-[44px]"
          >
            {translate("sceneSheet.aiGenerate")}
          </button>
        </div>
      </div>

      {showGrammarPanel && (
        <div className="border border-t-0 border-border bg-bg-secondary/50 p-4 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2">
              <span className="text-lg">{GRAMMAR_PACKS[grammarRegion].flag}</span>
              {L4(lang, GRAMMAR_PACKS[grammarRegion].label)}
            </h3>
            <span className="text-[9px] text-text-tertiary">
              {GRAMMAR_PACKS[grammarRegion].episodeLength.min.toLocaleString()}~{GRAMMAR_PACKS[grammarRegion].episodeLength.max.toLocaleString()} {GRAMMAR_PACKS[grammarRegion].episodeLength.unit}/{translate("sceneSheet.episodeUnit")}
            </span>
          </div>
          <div className="h-2 bg-bg-primary rounded-full overflow-hidden flex">
            {GRAMMAR_PACKS[grammarRegion].beatSheet.map((beat, index) => {
              const nextPosition = GRAMMAR_PACKS[grammarRegion].beatSheet[index + 1]?.position ?? 100;
              return (
                <div
                  key={index}
                  ref={(node) => bindSceneSegment(node, nextPosition - beat.position, `hsl(${(beat.position / 100) * 270}, 60%, 30%)`)}
                  className="h-full relative group cursor-default scene-segment-cell"
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-primary border border-border text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                    <div className="font-bold">{beat.name}</div>
                    <div className="text-text-tertiary">{beat.position}% — {beat.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 space-y-2">
        {isSceneSheetEmpty && (
          <EmptyState
            icon={FileText}
            title={L4(lang, {
              ko: "씬시트가 비어 있습니다",
              en: "Your scene sheet is empty",
              ja: "シーンシートが空です",
              zh: "场景表是空的",
            })}
            description={L4(lang, {
              ko: "장면 개요부터 시작하세요. 10+ 장르 프리셋 지원.",
              en: "Start with a scene outline. Supports 10+ genre presets.",
              ja: "シーン概要から始めましょう。10+ ジャンルプリセット対応。",
              zh: "从场景概述开始。支持 10+ 类型预设。",
            })}
            actions={[
              {
                label: L4(lang, {
                  ko: "장르 프리셋 선택",
                  en: "Choose genre preset",
                  ja: "ジャンルプリセット選択",
                  zh: "选择类型预设",
                }),
                variant: "primary",
                onClick: () => {
                  const firstPreset = document.querySelector<HTMLButtonElement>(
                    '[aria-pressed][aria-label*="preset" i], [aria-pressed][aria-label*="프리셋"]',
                  );
                  firstPreset?.focus();
                },
              },
              {
                label: L4(lang, {
                  ko: "빈 씬시트 시작",
                  en: "Start blank",
                  ja: "空のシーンシートで開始",
                  zh: "从空白开始",
                }),
                variant: "secondary",
                onClick: () => setBlankStarted(true),
              },
            ]}
          />
        )}

        <p className="text-[10px] text-text-quaternary leading-relaxed mb-1.5 px-0.5">
          {L4(lang, {
            ko: "프리셋을 고르면 자동으로 채워집니다. 비워둬도 괜찮아요.",
            en: "Pick a preset and it fills in for you. Leaving it empty is also fine.",
            ja: "プリセットを選ぶと自動で埋まります。空のままでも大丈夫。",
            zh: "选择预设会自动填充。留空也没关系。",
          })}
        </p>
        <div className="grid grid-cols-5 gap-2 pb-2">
          {SCENE_PRESETS.map(preset => {
            const meta = GENRE_VISUAL[preset.key] ?? { emoji: "📖", bg: "bg-bg-tertiary", border: "border-border", text: "text-text-primary" };
            const isActive = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => setActivePreset(preset.key)}
                aria-pressed={isActive}
                aria-label={L4(lang, {
                  ko: `${L4(lang, preset)} 프리셋 선택`,
                  en: `Select ${L4(lang, preset)} preset`,
                  ja: `${L4(lang, preset)} プリセットを選択`,
                  zh: `选择 ${L4(lang, preset)} 预设`,
                })}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-center transition-[transform,opacity,background-color,border-color,color] min-h-[64px] border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                  isActive
                    ? `${meta.bg} ${meta.border} ring-2 ring-offset-1 ring-accent-purple shadow-lg scale-[1.04]`
                    : `bg-bg-primary border-border/50 hover:${meta.bg} hover:${meta.border} hover:shadow-md`
                }`}
              >
                <span className="text-xl leading-none">{meta.emoji}</span>
                <span className={`text-[13px] font-bold leading-tight ${isActive ? meta.text : "text-text-secondary"}`}>
                  {L4(lang, preset)}
                </span>
              </button>
            );
          })}
        </div>

        {activePreset && (
          <div className="flex gap-2 pb-3">
            <button
              onClick={() => applySmartDefaults(activePreset)}
              className="flex-1 px-4 py-2.5 bg-accent-green/10 border border-accent-green/30 rounded-xl text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-colors min-h-[44px] font-mono uppercase tracking-wider"
            >
              {L4(lang, { ko: "기본값 적용 (빈 필드만)", en: "Apply Defaults (empty only)", ja: "デフォルト適用 (空のみ)", zh: "应用默认值 (仅空字段)" })}
            </button>
            <button
              onClick={() => applyScenePreset(activePreset)}
              className="px-4 py-2.5 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-[10px] font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors min-h-[44px] font-mono uppercase tracking-wider"
            >
              {L4(lang, { ko: "전체 덮어쓰기", en: "Full Overwrite", ja: "全上書き", zh: "全部覆盖" })}
            </button>
          </div>
        )}

        {onGenreModeChange && (
          <div className="mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider shrink-0">
                {L4(lang, { ko: "장르 모드", en: "Genre mode", ja: "ジャンルモード", zh: "类型模式" })}
              </span>
              <GenreModeSelector value={effectiveGenreMode} onChange={onGenreModeChange} />
            </div>
            <p className="mt-1 text-[10px] text-text-quaternary leading-relaxed">
              {L4(lang, {
                ko: "대부분 '소설' 모드면 충분합니다. 장르가 분명히 다를 때만 변경하세요.",
                en: "Novel mode works for most projects. Switch only when the genre is clearly different.",
                ja: "たいていは「小説」モードで十分です。ジャンルが明らかに異なるときだけ変更してください。",
                zh: "大多数情况下使用「小说」模式即可。仅当类型明显不同时才切换。",
              })}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function PlotBarEditor({
  lang,
  onPlotChange,
  initialPlot,
}: {
  lang: Lang;
  onPlotChange?: (preset: string) => void;
  initialPlot?: string;
}) {
  const [selectedPreset, setSelectedPreset] = useState<PlotType>((initialPlot as PlotType) || "three-act");
  const [segments, setSegments] = useState<PlotSegment[]>(
    PLOT_PRESETS["three-act"].segments.map((segment, index) => ({ ...segment, id: `seg-${index}` })),
  );

  const loadPreset = (preset: PlotType) => {
    setSelectedPreset(preset);
    setSegments(PLOT_PRESETS[preset].segments.map((segment, index) => ({ ...segment, id: `seg-${Date.now()}-${index}` })));
    onPlotChange?.(preset);
  };

  const updateWidth = useCallback((segmentIndex: number, delta: number) => {
    setSegments(previousSegments => {
      const nextSegments = [...previousSegments];
      const newWidth = Math.max(5, Math.min(80, nextSegments[segmentIndex].width + delta));
      const widthDiff = newWidth - nextSegments[segmentIndex].width;
      const neighborIndex = segmentIndex < nextSegments.length - 1 ? segmentIndex + 1 : segmentIndex - 1;
      if (neighborIndex >= 0 && neighborIndex < nextSegments.length) {
        const neighborNewWidth = nextSegments[neighborIndex].width - widthDiff;
        if (neighborNewWidth >= 5) {
          nextSegments[segmentIndex] = { ...nextSegments[segmentIndex], width: newWidth };
          nextSegments[neighborIndex] = { ...nextSegments[neighborIndex], width: neighborNewWidth };
        }
      }
      return nextSegments;
    });
  }, []);

  const addSegment = () => {
    setSegments(previousSegments => [
      ...previousSegments,
      {
        id: `seg-${Date.now()}`,
        label: L4(lang, { ko: "새 구간", en: "New Segment", ja: "New Segment", zh: "New Segment" }),
        color: "#6b7280",
        width: 10,
        desc: "",
      },
    ]);
  };

  const removeSegment = (segmentIndex: number) => {
    if (segments.length <= 2) return;
    setSegments(previousSegments => previousSegments.filter((_, index) => index !== segmentIndex));
  };

  const updateSegment = (segmentIndex: number, updates: Partial<PlotSegment>) => {
    setSegments(previousSegments => previousSegments.map((segment, index) => index === segmentIndex ? { ...segment, ...updates } : segment));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PLOT_PRESETS) as PlotType[]).map(key => (
          <button
            key={key}
            onClick={() => loadPreset(key)}
            className={`px-3 py-1.5 rounded text-[13px] font-bold border transition-colors min-h-[44px] ${selectedPreset === key ? "bg-accent-purple text-white border-accent-purple" : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"}`}
          >
            {L4(lang, PLOT_PRESETS[key])}
          </button>
        ))}
        <button
          onClick={addSegment}
          className="px-3 py-1.5 rounded text-[10px] font-bold border border-dashed border-border text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-colors min-h-[44px]"
        >
          + {L4(lang, { ko: "구간 추가", en: "Add Segment", ja: "区間を追加", zh: "添加区间" })}
        </button>
      </div>

      <div className="flex rounded-lg overflow-hidden h-12 border border-border">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            ref={(node) => bindSceneSegment(node, segment.width, segment.color)}
            className="relative flex items-center justify-center text-[9px] font-bold text-white cursor-pointer select-none group scene-segment-cell"
          >
            <span className="truncate px-1">{segment.label}</span>
            <span className="absolute bottom-0.5 right-1 text-[7px] opacity-60">{segment.width}%</span>
            {index < segments.length - 1 && (
              <div
                className="absolute right-0 top-0 bottom-0 w-3 sm:w-1 cursor-col-resize hover:bg-white/30 z-10 studio-touch-none"
                onPointerDown={event => {
                  event.stopPropagation();
                  event.preventDefault();
                  const target = event.target as HTMLElement;
                  target.setPointerCapture?.(event.pointerId);
                  const startX = event.clientX;
                  const barWidth = target.closest(".flex")?.getBoundingClientRect().width || 600;
                  const handleMove = (pointerEvent: PointerEvent) => {
                    const widthDelta = Math.round(((pointerEvent.clientX - startX) / barWidth) * 100);
                    if (Math.abs(widthDelta) >= 1) updateWidth(index, widthDelta);
                  };
                  const handleUp = () => {
                    document.removeEventListener("pointermove", handleMove);
                    document.removeEventListener("pointerup", handleUp);
                    document.removeEventListener("pointercancel", handleUp);
                  };
                  document.addEventListener("pointermove", handleMove);
                  document.addEventListener("pointerup", handleUp);
                  document.addEventListener("pointercancel", handleUp);
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            ref={(node) => bindStudioTone(node, segment.color)}
            className="border border-border rounded-lg p-3 bg-bg-primary space-y-2 studio-tone-border-left"
          >
            <div className="flex justify-between items-center">
              <input
                value={segment.label}
                onChange={event => updateSegment(index, { label: event.target.value })}
                maxLength={100}
                className="bg-transparent font-bold text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={segment.color}
                  onChange={event => updateSegment(index, { color: event.target.value })}
                  aria-label={`${segment.label || "segment"} color`}
                  className="w-5 h-5 rounded cursor-pointer border-0"
                />
                {segments.length > 2 && (
                  <button
                    onClick={() => removeSegment(index)}
                    aria-label={L4(lang, {
                      ko: `${segment.label || "구간"} 삭제`,
                      en: `Delete ${segment.label || "segment"}`,
                      ja: `${segment.label || "区間"}を削除`,
                      zh: `删除${segment.label || "区间"}`,
                    })}
                    className="text-text-tertiary hover:text-accent-red text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                  >
                    &#10005;
                  </button>
                )}
              </div>
            </div>
            <input
              value={segment.desc}
              onChange={event => updateSegment(index, { desc: event.target.value })}
              placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })}
              maxLength={500}
              className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-tertiary">{L4(lang, { ko: "비중", en: "Weight", ja: "Weight", zh: "Weight" })}:</span>
              <input
                type="range"
                min={5}
                max={80}
                value={segment.width}
                aria-label={L4(lang, { ko: `${segment.label} 비중`, en: `${segment.label} weight`, ja: `${segment.label} weight`, zh: `${segment.label} weight` })}
                onChange={event => {
                  const nextWidth = parseInt(event.target.value);
                  updateWidth(index, nextWidth - segment.width);
                }}
                className="flex-1 h-1 accent-accent-purple"
              />
              <span className="text-[9px] font-bold text-accent-purple w-8 text-right">{segment.width}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SceneSheetHistorySidebar({
  episodeSceneSheets,
  lang,
  showConfirm,
  closeConfirm,
  onLoadEpisodeSheet,
  onDeleteEpisodeSheet,
}: {
  episodeSceneSheets: EpisodeSceneSheet[];
  lang: Lang;
  showConfirm: (opts: ConfirmOptions) => void;
  closeConfirm: () => void;
  onLoadEpisodeSheet?: (episode: number) => void;
  onDeleteEpisodeSheet?: (episode: number) => void;
}) {
  return (
    <div className="w-64 border-l border-border bg-bg-primary pl-4 ml-4 shrink-0 hidden lg:block">
      <h3 className="text-[10px] font-bold font-mono uppercase tracking-wider text-text-tertiary mb-3 pt-2">
        {L4(lang, { ko: "씬시트 이력", en: "Scene Sheet History", ja: "シーンシート履歴", zh: "场景表历史" })}
      </h3>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {[...episodeSceneSheets].sort((first, second) => second.lastUpdate - first.lastUpdate).map(sheet => {
          const timeLabel = formatSceneSheetTime(sheet.lastUpdate, lang);
          const emotionSummary = sheet.directionSnapshot?.emotionTargets?.slice(0, 2).map(emotionTarget => emotionTarget.emotion).join(", ") ?? "";
          return (
            <div key={sheet.episode} className="border border-border rounded-lg p-3 bg-bg-secondary hover:border-accent-purple/50 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-text-primary">
                  {L4(lang, { ko: `${sheet.episode}화`, en: `EP ${sheet.episode}`, ja: `EP ${sheet.episode}`, zh: `EP ${sheet.episode}` })}
                </span>
                <span className="text-[9px] text-text-tertiary">{timeLabel}</span>
              </div>
              {sheet.presetUsed && (
                <span className="inline-block px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold uppercase mb-1">
                  {sheet.presetUsed}
                </span>
              )}
              {emotionSummary && <div className="text-[9px] text-text-tertiary truncate">{emotionSummary}</div>}
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onLoadEpisodeSheet?.(sheet.episode)}
                  className="flex-1 px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold hover:bg-accent-purple/20 transition-colors min-h-[44px]"
                >
                  {L4(lang, { ko: "불러오기", en: "Load", ja: "Load", zh: "Load" })}
                </button>
                <button
                  onClick={() => {
                    showConfirm({
                      title: L4(lang, { ko: "씬시트 삭제", en: "Delete Scene Sheet", ja: "シーンシート削除", zh: "删除场景表" }),
                      message: L4(lang, { ko: "이 씬시트를 삭제하시겠습니까? 되돌릴 수 없습니다.", en: "Delete this scene sheet? This cannot be undone.", ja: "このシーンシートを削除しますか? 元に戻せません。", zh: "要删除此场景表吗? 此操作不可恢复。" }),
                      variant: "danger",
                      confirmLabel: L4(lang, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
                      cancelLabel: L4(lang, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
                      onConfirm: () => {
                        onDeleteEpisodeSheet?.(sheet.episode);
                        closeConfirm();
                      },
                    });
                  }}
                  className="px-2 py-1 bg-accent-red/10 text-accent-red rounded text-[9px] font-bold hover:bg-accent-red/20 transition-colors min-h-[44px]"
                >
                  {L4(lang, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

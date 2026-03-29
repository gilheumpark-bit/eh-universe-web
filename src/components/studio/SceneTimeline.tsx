"use client";

// ============================================================
// SceneTimeline — 편집 모드 (타임라인 에디터)
// ============================================================
// 파싱된 장면/비트를 타임라인으로 시각화.
// 드래그 순서 변경, 삭제, 병합, 문제 스팟 표시.
// 편집 후 원고 역동기화.

import { useState, useCallback, useMemo, useRef } from "react";
import {
  Play, GripVertical, Trash2, Merge, Split, AlertTriangle,
  Eye, RotateCcw, Save, Wand2, ChevronDown, ChevronRight,
} from "lucide-react";
import type { ParsedScene, SceneBeat, BeatType } from "@/engine/scene-parser";
import type { AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — Types
// ============================================================

interface SceneTimelineProps {
  scenes: ParsedScene[];
  language: AppLanguage;
  onScenesChange: (scenes: ParsedScene[]) => void;
  onPlayFrom?: (sceneIndex: number, beatIndex: number) => void;
  onExportText?: (text: string) => void;
  warnings?: string[];
}

interface DragState {
  sceneIndex: number;
  beatIndex: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SceneTimelineProps

// ============================================================
// PART 2 — 비트 타입 시각화
// ============================================================

const BEAT_COLORS: Record<BeatType, string> = {
  dialogue: "bg-accent-green/30 border-accent-green/50",
  narration: "bg-accent-blue/20 border-accent-blue/40",
  action: "bg-accent-amber/25 border-accent-amber/45",
  thought: "bg-accent-purple/25 border-accent-purple/45",
  description: "bg-bg-tertiary/60 border-border/40",
};

const BEAT_LABELS: Record<BeatType, string> = {
  dialogue: "대사",
  narration: "서술",
  action: "행동",
  thought: "내면",
  description: "묘사",
};

const BEAT_ICONS: Record<BeatType, string> = {
  dialogue: "💬",
  narration: "📝",
  action: "⚡",
  thought: "💭",
  description: "🌄",
};

// IDENTITY_SEAL: PART-2 | role=beat-visuals | inputs=BeatType | outputs=colors,labels,icons

// ============================================================
// PART 3 — 문제 감지
// ============================================================

interface TimelineWarning {
  sceneIndex: number;
  beatIndex?: number;
  message: string;
  severity: "critical" | "warning" | "info";
}

function detectTimelineWarnings(scenes: ParsedScene[]): TimelineWarning[] {
  const warnings: TimelineWarning[] = [];

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const beats = scene.beats;

    // 대사 없이 서술 8비트 이상
    const dialogueCount = beats.filter((b) => b.type === "dialogue").length;
    if (beats.length > 8 && dialogueCount === 0) {
      warnings.push({ sceneIndex: si, message: `대사 없이 서술만 ${beats.length}비트`, severity: "warning" });
    }

    // 같은 타입 5연속
    let streak = 1;
    for (let bi = 1; bi < beats.length; bi++) {
      if (beats[bi].type === beats[bi - 1].type) {
        streak++;
        if (streak >= 5) {
          warnings.push({ sceneIndex: si, beatIndex: bi, message: `${BEAT_LABELS[beats[bi].type]} ${streak}연속 — 단조로움`, severity: "warning" });
          break;
        }
      } else { streak = 1; }
    }

    // 텐션 급락 (이전 장면 대비 -30 이상)
    if (si > 0) {
      const prevTension = scenes[si - 1].tension;
      const drop = prevTension - scene.tension;
      if (drop >= 30) {
        warnings.push({ sceneIndex: si, message: `텐션 급락 ${prevTension}→${scene.tension} (-${drop})`, severity: "critical" });
      }
    }

    // 화자 미확인 대사
    const noSpeaker = beats.filter((b) => b.type === "dialogue" && !b.speaker).length;
    if (noSpeaker > 0) {
      warnings.push({ sceneIndex: si, message: `화자 미확인 대사 ${noSpeaker}건`, severity: "info" });
    }
  }

  return warnings;
}

// IDENTITY_SEAL: PART-3 | role=warning-detection | inputs=ParsedScene[] | outputs=TimelineWarning[]

// ============================================================
// PART 4 — 비트 블록 컴포넌트
// ============================================================

function BeatBlock({
  beat,
  sceneIndex,
  beatIndex,
  isSelected,
  warning,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  beat: SceneBeat;
  sceneIndex: number;
  beatIndex: number;
  isSelected: boolean;
  warning?: TimelineWarning;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
      onDrop={onDrop}
      onClick={onSelect}
      className={`group relative flex items-start gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all
        ${BEAT_COLORS[beat.type]}
        ${isSelected ? "ring-1 ring-accent-purple" : ""}
        ${warning ? "ring-1 ring-accent-amber/50" : ""}
        hover:brightness-110`}
    >
      {/* 드래그 핸들 */}
      <div className="opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing pt-0.5">
        <GripVertical className="h-3 w-3 text-text-tertiary" />
      </div>

      {/* 아이콘 + 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px]">{BEAT_ICONS[beat.type]}</span>
          {beat.speaker && (
            <span className="text-[9px] font-[family-name:var(--font-mono)] text-accent-green truncate">{beat.speaker}</span>
          )}
          <span className="text-[8px] text-text-tertiary">{BEAT_LABELS[beat.type]}</span>
        </div>
        <div className="text-[11px] text-text-primary leading-tight truncate">{beat.text}</div>
      </div>

      {/* 경고 아이콘 */}
      {warning && (
        <div className="absolute -top-1 -right-1">
          <AlertTriangle className="h-3 w-3 text-accent-amber" />
        </div>
      )}

      {/* 삭제 (호버) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent-red/20 transition-opacity"
        aria-label="삭제"
      >
        <Trash2 className="h-3 w-3 text-accent-red" />
      </button>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=beat-block | inputs=SceneBeat,callbacks | outputs=draggable-beat-UI

// ============================================================
// PART 5 — 장면 레인 컴포넌트
// ============================================================

function SceneLane({
  scene,
  sceneIndex,
  collapsed,
  onToggle,
  selectedBeat,
  sceneWarnings,
  onSelectBeat,
  onDeleteBeat,
  onPlayFrom,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  scene: ParsedScene;
  sceneIndex: number;
  collapsed: boolean;
  onToggle: () => void;
  selectedBeat: { sceneIndex: number; beatIndex: number } | null;
  sceneWarnings: TimelineWarning[];
  onSelectBeat: (si: number, bi: number) => void;
  onDeleteBeat: (si: number, bi: number) => void;
  onPlayFrom?: (si: number, bi: number) => void;
  onDragStart: (si: number, bi: number) => void;
  onDragOver: (si: number, bi: number, e: React.DragEvent) => void;
  onDrop: (si: number, bi: number) => void;
}) {
  const dialogueCount = scene.beats.filter((b) => b.type === "dialogue").length;
  const beatCount = scene.beats.length;
  const hasWarnings = sceneWarnings.length > 0;

  return (
    <div className={`border rounded-xl ${hasWarnings ? "border-accent-amber/30" : "border-border/20"} bg-bg-secondary/30`}>
      {/* 장면 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onToggle}>
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" /> : <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />}

        <span className="text-xs font-[family-name:var(--font-mono)] text-text-primary font-medium">{scene.title}</span>

        {scene.timeOfDay && <span className="text-[9px] text-text-tertiary">{scene.timeOfDay}</span>}

        {/* 텐션 바 */}
        <div className="flex-1 flex items-center gap-1.5 mx-2">
          <div className="h-1.5 flex-1 bg-bg-tertiary/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scene.tension > 70 ? "bg-accent-red" : scene.tension > 40 ? "bg-accent-amber" : "bg-accent-green"}`}
              style={{ width: `${scene.tension}%` }}
            />
          </div>
          <span className="text-[9px] text-text-tertiary w-5 text-right">{scene.tension}</span>
        </div>

        {/* 통계 */}
        <span className="text-[9px] text-text-tertiary">{beatCount}비트 · 💬{dialogueCount}</span>

        {hasWarnings && <AlertTriangle className="h-3 w-3 text-accent-amber" />}

        {onPlayFrom && (
          <button onClick={(e) => { e.stopPropagation(); onPlayFrom(sceneIndex, 0); }} className="p-1 rounded hover:bg-accent-purple/20 transition-colors" aria-label="이 장면부터 재생">
            <Play className="h-3 w-3 text-accent-purple" />
          </button>
        )}
      </div>

      {/* 비트 목록 */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-1">
          {scene.beats.map((beat, bi) => {
            const beatWarning = sceneWarnings.find((w) => w.beatIndex === bi);
            return (
              <BeatBlock
                key={beat.id}
                beat={beat}
                sceneIndex={sceneIndex}
                beatIndex={bi}
                isSelected={selectedBeat?.sceneIndex === sceneIndex && selectedBeat?.beatIndex === bi}
                warning={beatWarning}
                onSelect={() => onSelectBeat(sceneIndex, bi)}
                onDelete={() => onDeleteBeat(sceneIndex, bi)}
                onDragStart={() => onDragStart(sceneIndex, bi)}
                onDragOver={(e) => onDragOver(sceneIndex, bi, e)}
                onDrop={() => onDrop(sceneIndex, bi)}
              />
            );
          })}
          {/* 장면 레벨 경고 */}
          {sceneWarnings.filter((w) => w.beatIndex === undefined).map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-accent-amber bg-accent-amber/5 rounded-lg">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=scene-lane | inputs=ParsedScene,callbacks | outputs=collapsible-scene-UI

// ============================================================
// PART 6 — 원고 역동기화
// ============================================================

function scenesToText(scenes: ParsedScene[]): string {
  const parts: string[] = [];

  for (let si = 0; si < scenes.length; si++) {
    if (si > 0) parts.push("\n\n***\n\n");

    for (const beat of scenes[si].beats) {
      switch (beat.type) {
        case "dialogue":
          parts.push(beat.speaker ? `${beat.speaker}: "${beat.text}"` : `"${beat.text}"`);
          break;
        case "thought":
          parts.push(`'${beat.text}'`);
          break;
        default:
          parts.push(beat.text);
      }
    }
  }

  return parts.join("\n");
}

// IDENTITY_SEAL: PART-6 | role=reverse-sync | inputs=ParsedScene[] | outputs=text

// ============================================================
// PART 7 — 메인 타임라인
// ============================================================

export default function SceneTimeline({
  scenes: initialScenes,
  language,
  onScenesChange,
  onPlayFrom,
  onExportText,
  warnings: externalWarnings,
}: SceneTimelineProps) {
  const isKO = language === "KO";
  const [scenes, setScenes] = useState(initialScenes);
  const [collapsedScenes, setCollapsedScenes] = useState<Set<number>>(new Set());
  const [selectedBeat, setSelectedBeat] = useState<DragState | null>(null);
  const [dragSource, setDragSource] = useState<DragState | null>(null);
  const [undoStack, setUndoStack] = useState<ParsedScene[][]>([]);

  const timelineWarnings = useMemo(() => detectTimelineWarnings(scenes), [scenes]);
  const allWarnings = [...timelineWarnings, ...(externalWarnings ?? []).map((w) => ({ sceneIndex: -1, message: w, severity: "info" as const }))];

  // Undo 지원
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), scenes.map((s) => ({ ...s, beats: [...s.beats] }))]);
  }, [scenes]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setScenes(last);
      onScenesChange(last);
      return prev.slice(0, -1);
    });
  }, [onScenesChange]);

  // 비트 삭제
  const deleteBeat = useCallback((si: number, bi: number) => {
    pushUndo();
    setScenes((prev) => {
      const next = prev.map((s, i) => i === si ? { ...s, beats: s.beats.filter((_, j) => j !== bi) } : s);
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, onScenesChange]);

  // 드래그앤드롭 순서 변경
  const handleDrop = useCallback((targetSi: number, targetBi: number) => {
    if (!dragSource) return;
    if (dragSource.sceneIndex === targetSi && dragSource.beatIndex === targetBi) return;

    pushUndo();
    setScenes((prev) => {
      const next = prev.map((s) => ({ ...s, beats: [...s.beats] }));
      const [removed] = next[dragSource.sceneIndex].beats.splice(dragSource.beatIndex, 1);
      if (!removed) return prev;
      next[targetSi].beats.splice(targetBi, 0, removed);
      onScenesChange(next);
      return next;
    });
    setDragSource(null);
  }, [dragSource, pushUndo, onScenesChange]);

  // 원고 내보내기
  const handleExport = useCallback(() => {
    const text = scenesToText(scenes);
    onExportText?.(text);
  }, [scenes, onExportText]);

  // 통계
  const totalBeats = scenes.reduce((s, sc) => s + sc.beats.length, 0);
  const typeDistribution = useMemo(() => {
    const dist: Record<BeatType, number> = { dialogue: 0, narration: 0, action: 0, thought: 0, description: 0 };
    for (const scene of scenes) for (const beat of scene.beats) dist[beat.type]++;
    return dist;
  }, [scenes]);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-[family-name:var(--font-mono)] font-semibold text-text-primary uppercase tracking-wider">
            {isKO ? "타임라인 편집" : "Timeline Editor"}
          </h3>
          <span className="text-[9px] text-text-tertiary">{scenes.length}장면 · {totalBeats}비트</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={undoStack.length === 0} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-colors text-text-secondary" aria-label="되돌리기">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleExport} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-text-secondary" aria-label="원고 내보내기">
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 비율 바 */}
      <div className="flex h-2 mx-3 mt-2 rounded-full overflow-hidden bg-bg-tertiary/30">
        {(["dialogue", "narration", "action", "thought", "description"] as BeatType[]).map((type) => (
          <div
            key={type}
            className={BEAT_COLORS[type].split(" ")[0]}
            style={{ width: `${(typeDistribution[type] / Math.max(1, totalBeats)) * 100}%` }}
            title={`${BEAT_LABELS[type]}: ${typeDistribution[type]}개 (${Math.round((typeDistribution[type] / Math.max(1, totalBeats)) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 py-1">
        {(["dialogue", "narration", "action", "thought", "description"] as BeatType[]).map((type) => (
          <span key={type} className="flex items-center gap-1 text-[8px] text-text-tertiary">
            <span>{BEAT_ICONS[type]}</span>
            {BEAT_LABELS[type]} {typeDistribution[type]}
          </span>
        ))}
      </div>

      {/* 경고 배너 */}
      {timelineWarnings.filter((w) => w.severity === "critical").length > 0 && (
        <div className="mx-3 mt-1 px-3 py-1.5 bg-accent-red/10 border border-accent-red/20 rounded-lg flex items-center gap-2 text-[10px] text-accent-red">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {isKO ? "텐션 급락 감지 — 독자 이탈 위험 구간이 있습니다" : "Tension drop detected — risk of reader dropout"}
        </div>
      )}

      {/* 장면 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {scenes.map((scene, si) => (
          <SceneLane
            key={scene.id}
            scene={scene}
            sceneIndex={si}
            collapsed={collapsedScenes.has(si)}
            onToggle={() => setCollapsedScenes((prev) => {
              const next = new Set(prev);
              next.has(si) ? next.delete(si) : next.add(si);
              return next;
            })}
            selectedBeat={selectedBeat}
            sceneWarnings={timelineWarnings.filter((w) => w.sceneIndex === si)}
            onSelectBeat={(si2, bi) => setSelectedBeat({ sceneIndex: si2, beatIndex: bi })}
            onDeleteBeat={deleteBeat}
            onPlayFrom={onPlayFrom}
            onDragStart={(si2, bi) => setDragSource({ sceneIndex: si2, beatIndex: bi })}
            onDragOver={(si2, bi, e) => e.preventDefault()}
            onDrop={(si2, bi) => handleDrop(si2, bi)}
          />
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=main-timeline | inputs=SceneTimelineProps | outputs=timeline-editor-UI

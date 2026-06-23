"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import type { BeatType, ParsedScene, SceneBeat } from "@/engine/scene-parser";
import { ProgressFill } from "./ProgressFill";
import {
  BEAT_COLORS,
  BEAT_LABELS,
  BEAT_ORDER,
  type DragState,
  SceneLane,
  type SceneTimelineProps,
  detectTimelineWarnings,
  scenesToText,
} from "./SceneTimeline.parts";

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
  const [_dragOverTarget, setDragOverTarget] = useState<DragState | null>(null);

  const timelineWarnings = useMemo(() => detectTimelineWarnings(scenes), [scenes]);
  const _allWarnings = [
    ...timelineWarnings,
    ...(externalWarnings ?? []).map((warning) => ({ sceneIndex: -1, message: warning, severity: "info" as const })),
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = timelineWarnings.map((warning) => ({
      severity: warning.severity,
      message: warning.message,
      sceneId: String(warning.sceneIndex),
    }));
    window.dispatchEvent(new CustomEvent("noa:scene-warnings", { detail: payload }));
    return () => {
      window.dispatchEvent(new CustomEvent("noa:scene-warnings", { detail: [] }));
    };
  }, [timelineWarnings]);

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), scenes.map((scene) => ({ ...scene, beats: [...scene.beats] }))]);
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

  const deleteBeat = useCallback((sceneIndex: number, beatIndex: number) => {
    pushUndo();
    setScenes((prev) => {
      const next = prev.map((scene, index) => (
        index === sceneIndex ? { ...scene, beats: scene.beats.filter((_, beat) => beat !== beatIndex) } : scene
      ));
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, onScenesChange]);

  const dragSourceRef = useRef(dragSource);
  useEffect(() => { dragSourceRef.current = dragSource; }, [dragSource]);

  const handleDrop = useCallback((targetSceneIndex: number, targetBeatIndex: number) => {
    const src = dragSourceRef.current;
    if (!src) return;
    if (src.sceneIndex === targetSceneIndex && src.beatIndex === targetBeatIndex) return;

    pushUndo();
    setScenes((prev) => {
      const next = prev.map((scene) => ({ ...scene, beats: [...scene.beats] }));
      const [removed] = next[src.sceneIndex].beats.splice(src.beatIndex, 1);
      if (!removed) return prev;
      next[targetSceneIndex].beats.splice(targetBeatIndex, 0, removed);
      onScenesChange(next);
      return next;
    });
    setDragSource(null);
  }, [pushUndo, onScenesChange]);

  const editBeat = useCallback((sceneIndex: number, beatIndex: number, text: string, type: BeatType) => {
    pushUndo();
    setScenes((prev) => {
      const next = prev.map((scene, index) => (
        index === sceneIndex
          ? { ...scene, beats: scene.beats.map((beat, currentIndex) => (currentIndex === beatIndex ? { ...beat, text, type } : beat)) }
          : scene
      ));
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, onScenesChange]);

  const insertBeat = useCallback((sceneIndex: number, afterBeatIndex: number) => {
    pushUndo();
    const newBeat: SceneBeat = {
      id: `beat-${Date.now()}`,
      type: "narration",
      text: "",
      tempo: "normal",
      camera: "medium",
      lineStart: 0,
      lineEnd: 0,
    };
    setScenes((prev) => {
      const next = prev.map((scene, index) => {
        if (index !== sceneIndex) return scene;
        const beats = [...scene.beats];
        beats.splice(afterBeatIndex + 1, 0, newBeat);
        return { ...scene, beats };
      });
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, onScenesChange]);

  const splitBeat = useCallback((sceneIndex: number, beatIndex: number, splitPos: number) => {
    pushUndo();
    setScenes((prev) => {
      const next = prev.map((scene, index) => {
        if (index !== sceneIndex) return scene;
        const beat = scene.beats[beatIndex];
        if (!beat || splitPos <= 0 || splitPos >= beat.text.length) return scene;
        const firstHalf: SceneBeat = { ...beat, id: `beat-${Date.now()}-a`, text: beat.text.slice(0, splitPos).trim() };
        const secondHalf: SceneBeat = { ...beat, id: `beat-${Date.now()}-b`, text: beat.text.slice(splitPos).trim() };
        const beats = [...scene.beats];
        beats.splice(beatIndex, 1, firstHalf, secondHalf);
        return { ...scene, beats };
      });
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, onScenesChange]);

  const addScene = useCallback(() => {
    pushUndo();
    const newScene: ParsedScene = {
      id: `scene-${Date.now()}`,
      index: scenes.length,
      title: `장면 ${scenes.length + 1}`,
      beats: [{ id: `beat-${Date.now()}`, type: "narration", text: "", tempo: "normal", camera: "medium", lineStart: 0, lineEnd: 0 }],
      tension: 50,
    };
    setScenes((prev) => {
      const next = [...prev, newScene];
      onScenesChange(next);
      return next;
    });
  }, [pushUndo, scenes.length, onScenesChange]);

  const handleExport = useCallback(() => {
    onExportText?.(scenesToText(scenes));
  }, [scenes, onExportText]);

  const totalBeats = scenes.reduce((sum, scene) => sum + scene.beats.length, 0);
  const typeDistribution = useMemo(() => {
    const dist: Record<BeatType, number> = { dialogue: 0, narration: 0, action: 0, thought: 0, description: 0 };
    for (const scene of scenes) for (const beat of scene.beats) dist[beat.type]++;
    return dist;
  }, [scenes]);

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="flex items-center justify-between border-b border-border/20 px-3 py-2">
        <div className="flex items-center gap-3">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
            {isKO ? "타임라인 편집" : "Timeline Editor"}
          </h3>
          <span className="text-[9px] text-text-tertiary">{scenes.length}장면 · {totalBeats}비트</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={undoStack.length === 0} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/5 disabled:opacity-40" aria-label="되돌리기">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleExport} className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/5" aria-label="원고 내보내기">
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-3 mt-2 flex h-2 overflow-hidden rounded-full bg-bg-tertiary/30">
        {BEAT_ORDER.map((type) => (
          <ProgressFill
            key={type}
            value={(typeDistribution[type] / Math.max(1, totalBeats)) * 100}
            className={BEAT_COLORS[type].split(" ")[0]}
            title={`${BEAT_LABELS[type]}: ${typeDistribution[type]}개 (${Math.round((typeDistribution[type] / Math.max(1, totalBeats)) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 px-3 py-1">
        {BEAT_ORDER.map((type) => (
          <span key={type} className="flex items-center gap-1 text-[8px] text-text-tertiary">
            {BEAT_LABELS[type]} {typeDistribution[type]}
          </span>
        ))}
      </div>

      {timelineWarnings.some((warning) => warning.severity === "critical") && (
        <div className="mx-3 mt-1 flex items-center gap-2 rounded-lg border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-[10px] text-accent-red">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          {isKO ? "텐션 급락 감지 - 독자 이탈 위험 구간이 있습니다" : "Tension drop detected - risk of reader dropout"}
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {scenes.map((scene, sceneIndex) => (
          <SceneLane
            key={scene.id}
            scene={scene}
            sceneIndex={sceneIndex}
            collapsed={collapsedScenes.has(sceneIndex)}
            onToggle={() => setCollapsedScenes((prev) => {
              const next = new Set(prev);
              if (next.has(sceneIndex)) next.delete(sceneIndex);
              else next.add(sceneIndex);
              return next;
            })}
            selectedBeat={selectedBeat}
            sceneWarnings={timelineWarnings.filter((warning) => warning.sceneIndex === sceneIndex)}
            onSelectBeat={(nextSceneIndex, beatIndex) => setSelectedBeat({ sceneIndex: nextSceneIndex, beatIndex })}
            onDeleteBeat={deleteBeat}
            onEditBeat={(nextSceneIndex, beatIndex, text, type) => editBeat(nextSceneIndex, beatIndex, text, type)}
            onInsertBeat={(nextSceneIndex, beatIndex) => insertBeat(nextSceneIndex, beatIndex)}
            onSplitBeat={(nextSceneIndex, beatIndex, pos) => splitBeat(nextSceneIndex, beatIndex, pos)}
            onPlayFrom={onPlayFrom}
            onDragStart={(nextSceneIndex, beatIndex) => setDragSource({ sceneIndex: nextSceneIndex, beatIndex })}
            onDragOver={(nextSceneIndex, beatIndex, event) => { event.preventDefault(); setDragOverTarget({ sceneIndex: nextSceneIndex, beatIndex }); }}
            onDrop={(nextSceneIndex, beatIndex) => { handleDrop(nextSceneIndex, beatIndex); setDragOverTarget(null); }}
          />
        ))}

        <button
          onClick={addScene}
          className="w-full rounded-xl border-2 border-dashed border-border/40 py-3 font-mono text-xs text-text-tertiary transition-colors hover:border-accent-purple/40 hover:text-text-primary"
        >
          + {isKO ? "새 장면 추가" : "Add Scene"}
        </button>
      </div>
    </div>
  );
}

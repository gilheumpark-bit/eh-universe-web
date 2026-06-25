"use client";

import { useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import {
  Activity,
  AlignLeft,
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  GripVertical,
  ImageIcon,
  MessageSquare,
  Play,
  Plus,
  Split,
  Trash2,
} from "lucide-react";
import type { BeatType, ParsedScene, SceneBeat } from "@/engine/scene-parser";
import type { AppLanguage } from "@/lib/studio-types";
import { ProgressFill } from "./ProgressFill";

export interface SceneTimelineProps {
  scenes: ParsedScene[];
  language: AppLanguage;
  onScenesChange: (scenes: ParsedScene[]) => void;
  onPlayFrom?: (sceneIndex: number, beatIndex: number) => void;
  onExportText?: (text: string) => void;
  warnings?: string[];
}

export interface DragState {
  sceneIndex: number;
  beatIndex: number;
}

export interface TimelineWarning {
  sceneIndex: number;
  beatIndex?: number;
  message: string;
  severity: "critical" | "warning" | "info";
}

export const BEAT_ORDER: BeatType[] = ["dialogue", "narration", "action", "thought", "description"];

export const BEAT_COLORS: Record<BeatType, string> = {
  dialogue: "bg-accent-green/30 border-accent-green/50",
  narration: "bg-accent-blue/20 border-accent-blue/40",
  action: "bg-accent-amber/25 border-accent-amber/45",
  thought: "bg-accent-purple/25 border-accent-purple/45",
  description: "bg-bg-tertiary/60 border-border/40",
};

export const BEAT_LABELS: Record<BeatType, string> = {
  dialogue: "대사",
  narration: "서술",
  action: "행동",
  thought: "내면",
  description: "묘사",
};

const BEAT_ICONS = {
  dialogue: MessageSquare,
  narration: FileText,
  action: Activity,
  thought: Brain,
  description: ImageIcon,
} as const satisfies Record<BeatType, typeof AlignLeft>;

export function detectTimelineWarnings(scenes: ParsedScene[]): TimelineWarning[] {
  const warnings: TimelineWarning[] = [];

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const beats = scene.beats;

    const dialogueCount = beats.filter((beat) => beat.type === "dialogue").length;
    if (beats.length > 8 && dialogueCount === 0) {
      warnings.push({ sceneIndex: si, message: `대사 없이 서술만 ${beats.length}비트`, severity: "warning" });
    }

    let streak = 1;
    for (let bi = 1; bi < beats.length; bi++) {
      if (beats[bi].type === beats[bi - 1].type) {
        streak++;
        if (streak >= 5) {
          warnings.push({ sceneIndex: si, beatIndex: bi, message: `${BEAT_LABELS[beats[bi].type]} ${streak}연속 - 단조로움`, severity: "warning" });
          break;
        }
      } else {
        streak = 1;
      }
    }

    if (si > 0) {
      const prevTension = scenes[si - 1].tension;
      const drop = prevTension - scene.tension;
      if (drop >= 30) {
        warnings.push({ sceneIndex: si, message: `텐션 급락 ${prevTension}->${scene.tension} (-${drop})`, severity: "critical" });
      }
    }

    const noSpeaker = beats.filter((beat) => beat.type === "dialogue" && !beat.speaker).length;
    if (noSpeaker > 0) {
      warnings.push({ sceneIndex: si, message: `화자 미확인 대사 ${noSpeaker}건`, severity: "info" });
    }
  }

  return warnings;
}

function BeatBlock({
  beat,
  isSelected,
  warning,
  onSelect,
  onDelete,
  onEdit,
  onInsertAfter,
  onSplit,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  beat: SceneBeat;
  isSelected: boolean;
  warning?: TimelineWarning;
  onSelect: () => void;
  onDelete: () => void;
  onEdit?: (text: string, type: BeatType) => void;
  onInsertAfter?: () => void;
  onDragStart: () => void;
  onSplit?: (splitPos: number) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(beat.text);
  const [editType, setEditType] = useState<BeatType>(beat.type);
  const [splitting, setSplitting] = useState(false);
  const [splitPos, setSplitPos] = useState(0);
  const BeatIcon = BEAT_ICONS[beat.type];

  const handleSave = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim(), editType);
    }
    setEditing(false);
  };

  if (splitting) {
    return (
      <div className={`relative space-y-1.5 rounded-lg border px-2 py-2 ${BEAT_COLORS[beat.type]}`}>
        <div className="mb-1 font-mono text-[10px] text-text-secondary">분할 위치를 클릭하세요</div>
        <div
          className="cursor-text select-none text-[11px] leading-relaxed text-text-primary"
          onClick={(event) => {
            const range = document.caretRangeFromPoint(event.clientX, event.clientY);
            if (range) setSplitPos(range.startOffset);
          }}
        >
          <span className="bg-accent-blue/20">{beat.text.slice(0, splitPos)}</span>
          <span className="border-l-2 border-accent-blue" />
          <span>{beat.text.slice(splitPos)}</span>
        </div>
        <div className="flex justify-end gap-1">
          <button onClick={() => setSplitting(false)} className="rounded px-2 py-0.5 text-[9px] text-text-tertiary hover:text-text-primary">취소</button>
          <button onClick={() => { onSplit?.(splitPos); setSplitting(false); }} className="rounded bg-accent-blue/15 px-2 py-0.5 text-[9px] font-bold text-accent-blue">분할</button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className={`relative space-y-1.5 rounded-lg border px-2 py-2 ${BEAT_COLORS[beat.type]}`}>
        <select
          value={editType}
          onChange={(event) => setEditType(event.target.value as BeatType)}
          className="w-full rounded border border-border/50 bg-bg-secondary px-2 py-1 font-mono text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          {BEAT_ORDER.map((type) => (
            <option key={type} value={type}>{BEAT_LABELS[type]}</option>
          ))}
        </select>
        <textarea
          value={editText}
          onChange={(event) => setEditText(event.target.value)}
          autoFocus
          className="min-h-[60px] w-full resize-none rounded border border-border/50 bg-bg-secondary px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent-purple focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSave();
            }
            if (event.key === "Escape") setEditing(false);
          }}
        />
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(false)} className="rounded px-2 py-0.5 text-[9px] text-text-tertiary hover:text-text-primary">ESC</button>
          <button onClick={handleSave} className="rounded bg-accent-purple/15 px-2 py-0.5 text-[9px] font-bold text-accent-purple">Enter 저장</button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(event) => { event.preventDefault(); onDragOver(event); }}
        onDrop={onDrop}
        onClick={onSelect}
        onDoubleClick={() => {
          setEditText(beat.text);
          setEditType(beat.type);
          setEditing(true);
        }}
        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 transition-[transform,opacity,background-color,border-color,color]
          ${BEAT_COLORS[beat.type]}
          ${isSelected ? "ring-2 ring-accent-purple shadow-sm shadow-accent-purple/20" : ""}
          ${warning ? "ring-1 ring-accent-amber/50" : ""}
          hover:brightness-110 active:scale-[0.98]`}
      >
        <div className="cursor-grab pt-0.5 opacity-0 group-hover:opacity-50 active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-text-tertiary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <BeatIcon className="h-3 w-3 text-text-tertiary" />
            {beat.speaker && (
              <span className="truncate font-mono text-[9px] text-accent-green">{beat.speaker}</span>
            )}
            <span className="text-[8px] text-text-tertiary">{BEAT_LABELS[beat.type]}</span>
          </div>
          <div className="truncate text-[11px] leading-tight text-text-primary">{beat.text}</div>
        </div>

        {warning && (
          <div className="absolute -right-1 -top-1">
            <AlertTriangle className="h-3 w-3 text-accent-amber" />
          </div>
        )}

        {onSplit && (
          <button
            onClick={(event) => { event.stopPropagation(); setSplitting(true); setSplitPos(Math.floor(beat.text.length / 2)); }}
            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent-blue/20 group-hover:opacity-100"
            aria-label="분할"
          >
            <Split className="h-3 w-3 text-accent-blue" />
          </button>
        )}

        <button
          onClick={(event) => { event.stopPropagation(); onDelete(); }}
          className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent-red/20 group-hover:opacity-100"
          aria-label="삭제"
        >
          <Trash2 className="h-3 w-3 text-accent-red" />
        </button>
      </div>

      {onInsertAfter && (
        <div className="relative h-0 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(event) => { event.stopPropagation(); onInsertAfter(); }}
            className="absolute -top-1 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-accent-purple/40 bg-accent-purple/20 text-accent-purple transition-colors hover:bg-accent-purple/30"
            title="비트 삽입"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export function SceneLane({
  scene,
  sceneIndex,
  collapsed,
  onToggle,
  selectedBeat,
  sceneWarnings,
  onSelectBeat,
  onDeleteBeat,
  onEditBeat,
  onInsertBeat,
  onSplitBeat,
  onPlayFrom,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  scene: ParsedScene;
  sceneIndex: number;
  collapsed: boolean;
  onToggle: () => void;
  selectedBeat: DragState | null;
  sceneWarnings: TimelineWarning[];
  onSelectBeat: (sceneIndex: number, beatIndex: number) => void;
  onDeleteBeat: (sceneIndex: number, beatIndex: number) => void;
  onEditBeat?: (sceneIndex: number, beatIndex: number, text: string, type: BeatType) => void;
  onInsertBeat?: (sceneIndex: number, beatIndex: number) => void;
  onSplitBeat?: (sceneIndex: number, beatIndex: number, splitPos: number) => void;
  onPlayFrom?: (sceneIndex: number, beatIndex: number) => void;
  onDragStart: (sceneIndex: number, beatIndex: number) => void;
  onDragOver: (sceneIndex: number, beatIndex: number, event: DragEvent) => void;
  onDrop: (sceneIndex: number, beatIndex: number) => void;
}) {
  const dialogueCount = scene.beats.filter((beat) => beat.type === "dialogue").length;
  const hasWarnings = sceneWarnings.length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`rounded-xl border ${hasWarnings ? "border-accent-amber/30" : "border-border/20"} bg-bg-secondary/30 transition-transform`}>
      <div role="button" tabIndex={0} className="group/scene flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/[0.02]" onClick={onToggle} onKeyDown={handleKeyDown}>
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-text-tertiary opacity-0 group-hover/scene:opacity-50 active:cursor-grabbing" />
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-text-tertiary" /> : <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />}

        <span className="font-mono text-xs font-medium text-text-primary">{scene.title}</span>
        {scene.timeOfDay && <span className="text-[9px] text-text-tertiary">{scene.timeOfDay}</span>}

        <div className="mx-2 flex flex-1 items-center gap-1.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-tertiary/50">
            <ProgressFill
              value={scene.tension}
              className={`h-full rounded-full transition-[transform,opacity,background-color,border-color,color] ${scene.tension > 70 ? "bg-accent-red" : scene.tension > 40 ? "bg-accent-amber" : "bg-accent-green"}`}
            />
          </div>
          <span className="w-5 text-right text-[9px] text-text-tertiary">{scene.tension}</span>
        </div>

        <span className="text-[9px] text-text-tertiary">{scene.beats.length}비트 · 대사 {dialogueCount}</span>

        {hasWarnings && <AlertTriangle className="h-3 w-3 text-accent-amber" />}

        {onPlayFrom && (
          <button onClick={(event) => { event.stopPropagation(); onPlayFrom(sceneIndex, 0); }} className="rounded p-1 transition-colors hover:bg-accent-purple/20" aria-label="이 장면부터 재생">
            <Play className="h-3 w-3 text-accent-purple" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-1 px-2 pb-2">
          {scene.beats.map((beat, beatIndex) => {
            const beatWarning = sceneWarnings.find((warning) => warning.beatIndex === beatIndex);
            return (
              <BeatBlock
                key={beat.id}
                beat={beat}
                isSelected={selectedBeat?.sceneIndex === sceneIndex && selectedBeat?.beatIndex === beatIndex}
                warning={beatWarning}
                onSelect={() => onSelectBeat(sceneIndex, beatIndex)}
                onDelete={() => onDeleteBeat(sceneIndex, beatIndex)}
                onEdit={(text, type) => onEditBeat?.(sceneIndex, beatIndex, text, type)}
                onInsertAfter={() => onInsertBeat?.(sceneIndex, beatIndex)}
                onSplit={onSplitBeat ? (pos) => onSplitBeat(sceneIndex, beatIndex, pos) : undefined}
                onDragStart={() => onDragStart(sceneIndex, beatIndex)}
                onDragOver={(event) => onDragOver(sceneIndex, beatIndex, event)}
                onDrop={() => onDrop(sceneIndex, beatIndex)}
              />
            );
          })}

          {sceneWarnings.filter((warning) => warning.beatIndex === undefined).map((warning, index) => (
            <div key={`${warning.message}-${index}`} className="flex items-center gap-1.5 rounded-lg bg-accent-amber/5 px-2 py-1 text-[10px] text-accent-amber">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function scenesToText(scenes: ParsedScene[]): string {
  const parts: string[] = [];

  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    if (sceneIndex > 0) parts.push("\n\n***\n\n");

    let prevType: string | null = null;
    for (const beat of scenes[sceneIndex].beats) {
      if (prevType && prevType !== beat.type) parts.push("");

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
      prevType = beat.type;
    }
  }

  return parts.join("\n");
}

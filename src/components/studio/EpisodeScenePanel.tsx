"use client";

import React, { useState, useCallback } from "react";
import type { EpisodeSceneSheet, EpisodeSceneEntry } from "@/lib/studio-types";

// ============================================================
// PART 0 — TYPES & CONSTANTS
// ============================================================

type Lang = string; // accepts "ko"/"en"/"KO"/"EN"/"JP" etc.

interface EpisodeScenePanelProps {
  lang: Lang;
  currentEpisode: number;
  episodeSceneSheets: EpisodeSceneSheet[];
  onSave: (sheet: EpisodeSceneSheet) => void;
  onDelete: (episode: number) => void;
  onUpdate: (sheet: EpisodeSceneSheet) => void;
}

const TONE_OPTIONS = ["감동", "긴장", "개그", "액션", "일상", "반전", "공포", "서사"];

const LABELS = {
  ko: {
    title: "에피소드 씬시트",
    save: "현재 화 씬시트 저장",
    edit: "편집",
    delete: "삭제",
    confirm: "저장",
    cancel: "취소",
    addScene: "+ 씬 추가",
    epTitle: "화 제목",
    arc: "아크",
    characters: "등장인물",
    sceneId: "씬#",
    sceneName: "씬명",
    sceneChars: "등장인물",
    tone: "톤",
    summary: "씬 요약",
    keyDialogue: "핵심 대사",
    emotionPoint: "포인트",
    nextScene: "다음 씬",
    empty: "저장된 씬시트가 없습니다",
    deleteConfirm: "삭제하시겠습니까?",
    ep: "화",
  },
  en: {
    title: "Episode Scene Sheets",
    save: "Save Current Episode",
    edit: "Edit",
    delete: "Delete",
    confirm: "Save",
    cancel: "Cancel",
    addScene: "+ Add Scene",
    epTitle: "Episode Title",
    arc: "Arc",
    characters: "Characters",
    sceneId: "#",
    sceneName: "Scene",
    sceneChars: "Characters",
    tone: "Tone",
    summary: "Summary",
    keyDialogue: "Key Dialogue",
    emotionPoint: "Point",
    nextScene: "Next",
    empty: "No saved scene sheets",
    deleteConfirm: "Delete this scene sheet?",
    ep: "ep.",
  },
};

// ============================================================
// PART 1 — EDITOR FORM
// ============================================================

function SceneEditor({
  lang,
  episode,
  initial,
  onConfirm,
  onCancel,
}: {
  lang: Lang;
  episode: number;
  initial?: EpisodeSceneSheet;
  onConfirm: (sheet: EpisodeSceneSheet) => void;
  onCancel: () => void;
}) {
  const normalizedLang = lang.toLowerCase() as "ko" | "en";
  const L = LABELS[normalizedLang] ?? LABELS.en;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [arc, setArc] = useState(initial?.arc ?? "");
  const [characters, setCharacters] = useState(initial?.characters ?? "");
  const [scenes, setScenes] = useState<EpisodeSceneEntry[]>(
    initial?.scenes ?? [
      { sceneId: `${episode}-1`, sceneName: "", characters: "", tone: "긴장", summary: "", keyDialogue: "", emotionPoint: "", nextScene: "" },
    ]
  );

  const updateScene = useCallback((idx: number, field: keyof EpisodeSceneEntry, value: string) => {
    setScenes(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }, []);

  const addScene = useCallback(() => {
    const nextNum = scenes.length + 1;
    setScenes(prev => [
      ...prev,
      { sceneId: `${episode}-${nextNum}`, sceneName: "", characters: "", tone: "긴장", summary: "", keyDialogue: "", emotionPoint: "", nextScene: "" },
    ]);
  }, [scenes.length, episode]);

  const removeScene = useCallback((idx: number) => {
    setScenes(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = () => {
    onConfirm({
      episode,
      title,
      arc,
      characters,
      scenes,
      lastUpdate: Date.now(),
    });
  };

  const inputCls = "w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:border-purple-500 focus:outline-none";
  const selectCls = "bg-gray-800 border border-gray-600 rounded px-1 py-1 text-xs text-gray-200 focus:border-purple-500 focus:outline-none";

  return (
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header fields */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-400">{L.epTitle}</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="밥 먹다" />
        </div>
        <div>
          <label className="text-xs text-gray-400">{L.arc}</label>
          <input className={inputCls} value={arc} onChange={e => setArc(e.target.value)} placeholder="아크1" />
        </div>
        <div>
          <label className="text-xs text-gray-400">{L.characters}</label>
          <input className={inputCls} value={characters} onChange={e => setCharacters(e.target.value)} placeholder="민지/엄마" />
        </div>
      </div>

      {/* Scene table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-700/50">
              <th className="border border-gray-600 px-2 py-1 text-gray-300 w-14">{L.sceneId}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300 w-20">{L.sceneName}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300 w-16">{L.tone}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300">{L.summary}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300">{L.keyDialogue}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300 w-24">{L.emotionPoint}</th>
              <th className="border border-gray-600 px-2 py-1 text-gray-300 w-16">{L.nextScene}</th>
              <th className="border border-gray-600 px-2 py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene, idx) => (
              <tr key={idx} className="hover:bg-gray-700/30">
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 text-center focus:outline-none" value={scene.sceneId} onChange={e => updateScene(idx, "sceneId", e.target.value)} />
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 focus:outline-none" value={scene.sceneName} onChange={e => updateScene(idx, "sceneName", e.target.value)} placeholder="씬명" />
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <select className={selectCls} value={scene.tone} onChange={e => updateScene(idx, "tone", e.target.value)}>
                    {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 focus:outline-none" value={scene.summary} onChange={e => updateScene(idx, "summary", e.target.value)} placeholder="씬 요약..." />
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 focus:outline-none" value={scene.keyDialogue} onChange={e => updateScene(idx, "keyDialogue", e.target.value)} placeholder="핵심 대사..." />
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 focus:outline-none" value={scene.emotionPoint} onChange={e => updateScene(idx, "emotionPoint", e.target.value)} placeholder="포인트" />
                </td>
                <td className="border border-gray-600 px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-gray-200 focus:outline-none text-center" value={scene.nextScene} onChange={e => updateScene(idx, "nextScene", e.target.value)} placeholder="→" />
                </td>
                <td className="border border-gray-600 px-1 py-1 text-center">
                  <button onClick={() => removeScene(idx)} className="text-red-400 hover:text-red-300 text-xs" title="삭제">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addScene} className="text-xs text-purple-400 hover:text-purple-300">{L.addScene}</button>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300">{L.cancel}</button>
        <button onClick={handleSave} className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded text-white">{L.confirm}</button>
      </div>
    </div>
  );
}

// ============================================================
// PART 2 — READ-ONLY SCENE TABLE
// ============================================================

function SceneTable({ sheet, lang }: { sheet: EpisodeSceneSheet; lang: Lang }) {
  const normalizedLang = lang.toLowerCase() as "ko" | "en";
  const L = LABELS[normalizedLang] ?? LABELS.en;
  const toneColor: Record<string, string> = {
    감동: "bg-green-900/40 text-green-300",
    긴장: "bg-yellow-900/40 text-yellow-300",
    개그: "bg-blue-900/40 text-blue-300",
    액션: "bg-red-900/40 text-red-300",
    일상: "bg-gray-700/40 text-gray-300",
    반전: "bg-purple-900/40 text-purple-300",
    공포: "bg-orange-900/40 text-orange-300",
    서사: "bg-indigo-900/40 text-indigo-300",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-700/50">
            <th className="border border-gray-600 px-2 py-1 text-gray-400 w-12">{L.sceneId}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400 w-16">{L.sceneName}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400 w-14">{L.tone}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400">{L.summary}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400">{L.keyDialogue}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400 w-20">{L.emotionPoint}</th>
            <th className="border border-gray-600 px-2 py-1 text-gray-400 w-14">{L.nextScene}</th>
          </tr>
        </thead>
        <tbody>
          {sheet.scenes.map((s, i) => (
            <tr key={i} className="hover:bg-gray-700/20">
              <td className="border border-gray-600 px-2 py-1 text-gray-300 text-center font-mono">{s.sceneId}</td>
              <td className="border border-gray-600 px-2 py-1 text-gray-200">{s.sceneName}</td>
              <td className="border border-gray-600 px-1 py-1 text-center">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${toneColor[s.tone] ?? "bg-gray-700 text-gray-300"}`}>{s.tone}</span>
              </td>
              <td className="border border-gray-600 px-2 py-1 text-gray-300">{s.summary}</td>
              <td className="border border-gray-600 px-2 py-1 text-gray-300 italic">{s.keyDialogue}</td>
              <td className="border border-gray-600 px-2 py-1 text-gray-400">{s.emotionPoint}</td>
              <td className="border border-gray-600 px-2 py-1 text-gray-400 text-center">{s.nextScene}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// PART 3 — MAIN PANEL
// ============================================================

export default function EpisodeScenePanel({
  lang,
  currentEpisode,
  episodeSceneSheets,
  onSave,
  onDelete,
  onUpdate,
}: EpisodeScenePanelProps) {
  const normalizedLang = lang.toLowerCase() as "ko" | "en";
  const L = LABELS[normalizedLang] ?? LABELS.en;
  const [editingEp, setEditingEp] = useState<number | null>(null);
  const [expandedEp, setExpandedEp] = useState<number | null>(null);

  const sorted = [...episodeSceneSheets].sort((a, b) => a.episode - b.episode);
  const existingForCurrent = sorted.find(s => s.episode === currentEpisode);

  const handleSaveNew = () => {
    setEditingEp(currentEpisode);
  };

  const handleConfirm = useCallback((sheet: EpisodeSceneSheet) => {
    const exists = episodeSceneSheets.some(s => s.episode === sheet.episode);
    if (exists) {
      onUpdate(sheet);
    } else {
      onSave(sheet);
    }
    setEditingEp(null);
  }, [episodeSceneSheets, onSave, onUpdate]);

  const handleDelete = useCallback((ep: number) => {
    if (confirm(L.deleteConfirm)) {
      onDelete(ep);
      if (expandedEp === ep) setExpandedEp(null);
    }
  }, [onDelete, expandedEp, L.deleteConfirm]);

  return (
    <div className="space-y-2">
      {/* Save button for current episode */}
      <button
        onClick={handleSaveNew}
        className="w-full px-3 py-2 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors"
      >
        📋 {currentEpisode}{L.ep} {L.save}
      </button>

      {/* Editor */}
      {editingEp !== null && (
        <SceneEditor
          lang={lang}
          episode={editingEp}
          initial={episodeSceneSheets.find(s => s.episode === editingEp)}
          onConfirm={handleConfirm}
          onCancel={() => setEditingEp(null)}
        />
      )}

      {/* Saved sheets list */}
      {sorted.length === 0 && editingEp === null && (
        <p className="text-xs text-gray-500 text-center py-2">{L.empty}</p>
      )}

      {sorted.map(sheet => (
        <div key={sheet.episode} className="border border-gray-700 rounded-lg overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpandedEp(expandedEp === sheet.episode ? null : sheet.episode)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-left transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-200">
                {sheet.episode}{L.ep}
                {sheet.title && <> 《{sheet.title}》</>}
              </span>
              {sheet.arc && <span className="ml-2 text-xs text-gray-400">[{sheet.arc}]</span>}
              {sheet.characters && <span className="ml-2 text-xs text-gray-500">{sheet.characters}</span>}
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <span className="text-[10px] text-gray-500">{sheet.scenes.length}씬</span>
              <span className="text-gray-400">{expandedEp === sheet.episode ? "▼" : "▶"}</span>
            </div>
          </button>

          {/* Expanded content */}
          {expandedEp === sheet.episode && (
            <div className="p-2 border-t border-gray-700 bg-gray-900/30">
              <SceneTable sheet={sheet} lang={lang} />
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setEditingEp(sheet.episode)} className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 rounded text-gray-300">{L.edit}</button>
                <button onClick={() => handleDelete(sheet.episode)} className="px-2 py-1 text-[10px] bg-red-900/30 hover:bg-red-900/50 rounded text-red-400">{L.delete}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

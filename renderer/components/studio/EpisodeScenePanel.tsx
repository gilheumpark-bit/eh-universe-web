"use client";

import React, { useState, useCallback } from "react";
import type { EpisodeSceneSheet, EpisodeSceneEntry, AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 0 — TYPES & CONSTANTS
// ============================================================

interface EpisodeScenePanelProps {
  lang: AppLanguage;
  currentEpisode: number;
  episodeSceneSheets: EpisodeSceneSheet[];
  onSave: (sheet: EpisodeSceneSheet) => void;
  onDelete: (episode: number) => void;
  onUpdate: (sheet: EpisodeSceneSheet) => void;
}

const TONE_BY_LANG: Record<string, string[]> = {
  KO: ["감동", "긴장", "개그", "액션", "일상", "반전", "공포", "서사"],
  EN: ["touching", "tension", "comedy", "action", "daily", "twist", "horror", "epic"],
  JP: ["感動", "緊張", "コメディ", "アクション", "日常", "反転", "ホラー", "叙事"],
  CN: ["感人", "紧张", "喜剧", "动作", "日常", "反转", "恐怖", "叙事"],
};

/** Per-component labels (not in global i18n to keep the panel self-contained) */
const LABELS: Record<string, {
  title: string; save: string; edit: string; delete: string;
  confirm: string; cancel: string; addScene: string; epTitle: string;
  arc: string; characters: string; sceneId: string; sceneName: string;
  sceneChars: string; tone: string; summary: string; keyDialogue: string;
  emotionPoint: string; nextScene: string; empty: string;
  deleteConfirm: string; ep: string; scenes: string;
}> = {
  KO: {
    title: "에피소드 씬시트", save: "현재 화 씬시트 저장", edit: "편집",
    delete: "삭제", confirm: "저장", cancel: "취소", addScene: "+ 씬 추가",
    epTitle: "화 제목", arc: "아크", characters: "등장인물",
    sceneId: "씬#", sceneName: "씬명", sceneChars: "등장인물",
    tone: "톤", summary: "씬 요약", keyDialogue: "핵심 대사",
    emotionPoint: "포인트", nextScene: "다음 씬",
    empty: "저장된 씬시트가 없습니다", deleteConfirm: "삭제하시겠습니까?",
    ep: "화", scenes: "씬",
  },
  EN: {
    title: "Episode Scene Sheets", save: "Save Current Episode", edit: "Edit",
    delete: "Delete", confirm: "Save", cancel: "Cancel", addScene: "+ Add Scene",
    epTitle: "Episode Title", arc: "Arc", characters: "Characters",
    sceneId: "#", sceneName: "Scene", sceneChars: "Characters",
    tone: "Tone", summary: "Summary", keyDialogue: "Key Dialogue",
    emotionPoint: "Point", nextScene: "Next",
    empty: "No saved scene sheets", deleteConfirm: "Delete this scene sheet?",
    ep: "ep.", scenes: "scenes",
  },
  JP: {
    title: "エピソードシーンシート", save: "現在話のシーンシート保存", edit: "編集",
    delete: "削除", confirm: "保存", cancel: "キャンセル", addScene: "+ シーン追加",
    epTitle: "話タイトル", arc: "アーク", characters: "登場人物",
    sceneId: "#", sceneName: "シーン名", sceneChars: "登場人物",
    tone: "トーン", summary: "シーン要約", keyDialogue: "核心台詞",
    emotionPoint: "ポイント", nextScene: "次シーン",
    empty: "保存済みシーンシートなし", deleteConfirm: "削除しますか？",
    ep: "話", scenes: "シーン",
  },
  CN: {
    title: "章节场景表", save: "保存当前话场景表", edit: "编辑",
    delete: "删除", confirm: "保存", cancel: "取消", addScene: "+ 添加场景",
    epTitle: "话标题", arc: "篇章", characters: "登场人物",
    sceneId: "#", sceneName: "场景名", sceneChars: "登场人物",
    tone: "基调", summary: "场景概要", keyDialogue: "核心台词",
    emotionPoint: "要点", nextScene: "下一场景",
    empty: "无已保存的场景表", deleteConfirm: "确定删除吗？",
    ep: "话", scenes: "场景",
  },
};

function getL(lang: AppLanguage) {
  return LABELS[lang] ?? LABELS.EN;
}
// IDENTITY_SEAL: PART-0 | role=types+constants | inputs=none | outputs=LABELS,TONE_BY_LANG

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
  lang: AppLanguage;
  episode: number;
  initial?: EpisodeSceneSheet;
  onConfirm: (sheet: EpisodeSceneSheet) => void;
  onCancel: () => void;
}) {
  const L = getL(lang);
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

  const inputCls = "w-full bg-bg-secondary border border-border rounded px-2 py-1 text-sm text-text-primary font-mono focus:border-accent-purple focus:outline-none";
  const selectCls = "bg-bg-secondary border border-border rounded px-1 py-1 text-xs text-text-primary font-mono focus:border-accent-purple focus:outline-none";

  return (
    <div className="space-y-3 p-3 bg-bg-secondary/50 rounded-lg border border-border">
      {/* Header fields */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-text-tertiary">{L.epTitle}</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">{L.arc}</label>
          <input className={inputCls} value={arc} onChange={e => setArc(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-text-tertiary">{L.characters}</label>
          <input className={inputCls} value={characters} onChange={e => setCharacters(e.target.value)} />
        </div>
      </div>

      {/* Scene table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-bg-secondary">
              <th className="border border-border px-2 py-1 text-text-secondary w-14">{L.sceneId}</th>
              <th className="border border-border px-2 py-1 text-text-secondary w-20">{L.sceneName}</th>
              <th className="border border-border px-2 py-1 text-text-secondary w-16">{L.tone}</th>
              <th className="border border-border px-2 py-1 text-text-secondary">{L.summary}</th>
              <th className="border border-border px-2 py-1 text-text-secondary">{L.keyDialogue}</th>
              <th className="border border-border px-2 py-1 text-text-secondary w-24">{L.emotionPoint}</th>
              <th className="border border-border px-2 py-1 text-text-secondary w-16">{L.nextScene}</th>
              <th className="border border-border px-2 py-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene, idx) => (
              <tr key={idx} className="hover:bg-bg-secondary/50">
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary text-center focus:outline-none" value={scene.sceneId} onChange={e => updateScene(idx, "sceneId", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary focus:outline-none" value={scene.sceneName} onChange={e => updateScene(idx, "sceneName", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1">
                  <select className={selectCls} value={scene.tone} onChange={e => updateScene(idx, "tone", e.target.value)}>
                    {(TONE_BY_LANG[lang] ?? TONE_BY_LANG.KO).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary focus:outline-none" value={scene.summary} onChange={e => updateScene(idx, "summary", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary focus:outline-none" value={scene.keyDialogue} onChange={e => updateScene(idx, "keyDialogue", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary focus:outline-none" value={scene.emotionPoint} onChange={e => updateScene(idx, "emotionPoint", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1">
                  <input className="w-full bg-transparent text-xs text-text-primary focus:outline-none text-center" value={scene.nextScene} onChange={e => updateScene(idx, "nextScene", e.target.value)} />
                </td>
                <td className="border border-border px-1 py-1 text-center">
                  <button onClick={() => removeScene(idx)} className="text-red-400 hover:text-red-300 text-xs" title={L.delete}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addScene} className="text-xs text-accent-purple hover:text-accent-purple/80 font-mono">{L.addScene}</button>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs bg-bg-secondary hover:bg-bg-secondary/80 rounded text-text-secondary border border-border font-mono">{L.cancel}</button>
        <button onClick={handleSave} className="px-3 py-1 text-xs bg-accent-purple hover:bg-accent-purple/80 rounded text-white font-mono">{L.confirm}</button>
      </div>
    </div>
  );
}
// IDENTITY_SEAL: PART-1 | role=editor-form | inputs=lang,episode,initial | outputs=EpisodeSceneSheet

// ============================================================
// PART 2 — READ-ONLY SCENE TABLE
// ============================================================

function SceneTable({ sheet, lang }: { sheet: EpisodeSceneSheet; lang: AppLanguage }) {
  const L = getL(lang);
  const toneColor: Record<string, string> = {
    감동: "bg-green-900/40 text-green-300",
    긴장: "bg-yellow-900/40 text-yellow-300",
    개그: "bg-blue-900/40 text-blue-300",
    액션: "bg-red-900/40 text-red-300",
    일상: "bg-bg-secondary text-text-secondary",
    반전: "bg-purple-900/40 text-purple-300",
    공포: "bg-orange-900/40 text-orange-300",
    서사: "bg-indigo-900/40 text-indigo-300",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-bg-secondary">
            <th className="border border-border px-2 py-1 text-text-tertiary w-12">{L.sceneId}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary w-16">{L.sceneName}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary w-14">{L.tone}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary">{L.summary}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary">{L.keyDialogue}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary w-20">{L.emotionPoint}</th>
            <th className="border border-border px-2 py-1 text-text-tertiary w-14">{L.nextScene}</th>
          </tr>
        </thead>
        <tbody>
          {sheet.scenes.map((s, i) => (
            <tr key={i} className="hover:bg-bg-secondary/30">
              <td className="border border-border px-2 py-1 text-text-secondary text-center">{s.sceneId}</td>
              <td className="border border-border px-2 py-1 text-text-primary">{s.sceneName}</td>
              <td className="border border-border px-1 py-1 text-center">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${toneColor[s.tone] ?? "bg-bg-secondary text-text-secondary"}`}>{s.tone}</span>
              </td>
              <td className="border border-border px-2 py-1 text-text-secondary">{s.summary}</td>
              <td className="border border-border px-2 py-1 text-text-secondary italic">{s.keyDialogue}</td>
              <td className="border border-border px-2 py-1 text-text-tertiary">{s.emotionPoint}</td>
              <td className="border border-border px-2 py-1 text-text-tertiary text-center">{s.nextScene}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
// IDENTITY_SEAL: PART-2 | role=read-only-table | inputs=sheet,lang | outputs=JSX

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
  const L = getL(lang);
  const [editingEp, setEditingEp] = useState<number | null>(null);
  const [expandedEp, setExpandedEp] = useState<number | null>(null);

  const sorted = [...episodeSceneSheets].sort((a, b) => a.episode - b.episode);

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
        className="w-full px-3 py-2 text-xs bg-accent-purple/20 hover:bg-accent-purple/30 border border-accent-purple/30 rounded-lg text-accent-purple font-mono transition-colors"
      >
        {currentEpisode}{L.ep} {L.save}
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
        <p className="text-xs text-text-tertiary text-center py-2 font-mono">{L.empty}</p>
      )}

      {sorted.map(sheet => (
        <div key={sheet.episode} className="border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpandedEp(expandedEp === sheet.episode ? null : sheet.episode)}
            className="w-full flex items-center justify-between px-3 py-2 bg-bg-secondary/50 hover:bg-bg-secondary text-left transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary font-mono">
                {sheet.episode}{L.ep}
                {sheet.title && <> &laquo;{sheet.title}&raquo;</>}
              </span>
              {sheet.arc && <span className="ml-2 text-xs text-text-tertiary">[{sheet.arc}]</span>}
              {sheet.characters && <span className="ml-2 text-xs text-text-tertiary">{sheet.characters}</span>}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <span className="text-[10px] text-text-tertiary">{sheet.scenes.length}{L.scenes}</span>
              <span className="text-text-tertiary">{expandedEp === sheet.episode ? "▼" : "▶"}</span>
            </div>
          </button>

          {/* Expanded content */}
          {expandedEp === sheet.episode && (
            <div className="p-2 border-t border-border bg-bg-primary/30">
              <SceneTable sheet={sheet} lang={lang} />
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setEditingEp(sheet.episode)} className="px-2 py-1 text-[10px] bg-bg-secondary hover:bg-bg-secondary/80 rounded text-text-secondary border border-border font-mono">{L.edit}</button>
                <button onClick={() => handleDelete(sheet.episode)} className="px-2 py-1 text-[10px] bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 font-mono">{L.delete}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// IDENTITY_SEAL: PART-3 | role=main-panel | inputs=props | outputs=JSX

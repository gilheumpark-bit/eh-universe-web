"use client";

import { useState } from "react";
import { Check, X } from "@/components/loreguard/icons";
import type { EpisodeSceneEntry } from "@/lib/studio-types";

interface DirectionShotEditorProps {
  initial: EpisodeSceneEntry;
  toneOptions: readonly string[];
  thumbBackground: string;
  onConfirm: (entry: EpisodeSceneEntry) => void;
  onCancel: () => void;
}

export function DirectionShotEditor({
  initial,
  toneOptions,
  thumbBackground,
  onConfirm,
  onCancel,
}: DirectionShotEditorProps) {
  const [draft, setDraft] = useState<EpisodeSceneEntry>(initial);
  const set = (key: keyof EpisodeSceneEntry, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
  const inputStyle = {
    width: "100%",
    border: "1px solid var(--line)",
    background: "var(--card-2)",
    borderRadius: "7px",
    padding: "6px 9px",
    fontSize: "12px",
    color: "var(--ink-1)",
    fontFamily: "inherit",
  } as const;

  return (
    <>
      <div className="dr-trow" style={{ cursor: "default", alignItems: "start" }}>
        <div className="dr-shot">
          <div className="dr-thumb" style={{ background: thumbBackground }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
            <input
              style={inputStyle}
              placeholder="씬 #"
              aria-label="씬 번호"
              value={draft.sceneId}
              onChange={(event) => set("sceneId", event.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="씬명"
              aria-label="씬명"
              value={draft.sceneName}
              onChange={(event) => set("sceneName", event.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="등장인물"
              aria-label="등장인물"
              value={draft.characters}
              onChange={(event) => set("characters", event.target.value)}
            />
          </div>
        </div>
        <span>
          <select
            aria-label="장면 톤"
            value={draft.tone}
            onChange={(event) => set("tone", event.target.value)}
            style={{ ...inputStyle, padding: "5px 6px" }}
          >
            {toneOptions.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </span>
        <span>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: "44px" }}
            placeholder="연출 의도 / 씬 요약"
            aria-label="연출 의도"
            value={draft.summary}
            onChange={(event) => set("summary", event.target.value)}
          />
        </span>
        <span>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: "44px" }}
            placeholder="핵심 대사"
            aria-label="핵심 대사"
            value={draft.keyDialogue}
            onChange={(event) => set("keyDialogue", event.target.value)}
          />
        </span>
        <span>
          <input
            style={inputStyle}
            placeholder="감정 포인트"
            aria-label="감정 포인트"
            value={draft.emotionPoint}
            onChange={(event) => set("emotionPoint", event.target.value)}
          />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <input
            style={inputStyle}
            placeholder="다음 씬"
            aria-label="다음 씬"
            value={draft.nextScene}
            onChange={(event) => set("nextScene", event.target.value)}
          />
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              className="btn"
              style={{ padding: "5px 8px" }}
              onClick={() => onConfirm({ ...draft, sceneId: draft.sceneId.trim() || `${Date.now()}` })}
              aria-label="저장"
              title="저장"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: "5px 8px" }}
              onClick={onCancel}
              aria-label="취소"
              title="취소"
            >
              <X size={13} />
            </button>
          </div>
        </span>
      </div>
      <div
        className="dr-trow"
        style={{
          cursor: "default",
          alignItems: "start",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          borderTop: "0",
        }}
      >
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: "48px" }}
          placeholder="씬 목적"
          aria-label="씬 목적"
          value={draft.purpose ?? ""}
          onChange={(event) => set("purpose", event.target.value)}
        />
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: "48px" }}
          placeholder="장면 갈등"
          aria-label="장면 갈등"
          value={draft.conflict ?? ""}
          onChange={(event) => set("conflict", event.target.value)}
        />
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: "48px" }}
          placeholder="공개 정보"
          aria-label="공개 정보"
          value={draft.publicInfo ?? ""}
          onChange={(event) => set("publicInfo", event.target.value)}
        />
        <textarea
          style={{ ...inputStyle, resize: "vertical", minHeight: "48px" }}
          placeholder="숨김 정보"
          aria-label="숨김 정보"
          value={draft.hiddenInfo ?? ""}
          onChange={(event) => set("hiddenInfo", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="감정곡선"
          aria-label="감정곡선"
          value={draft.emotionCurve ?? ""}
          onChange={(event) => set("emotionCurve", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="보상감"
          aria-label="보상감"
          value={draft.rewardBeat ?? ""}
          onChange={(event) => set("rewardBeat", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="후킹"
          aria-label="후킹"
          value={draft.hookPoint ?? ""}
          onChange={(event) => set("hookPoint", event.target.value)}
        />
        <div className="stat-foot" style={{ alignSelf: "center" }}>
          목적 · 갈등 · 공개/숨김 정보 · 감정곡선 · 보상감 · 후킹 · 다음 연결
        </div>
      </div>
    </>
  );
}

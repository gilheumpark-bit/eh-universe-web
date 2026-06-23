"use client";

import { useState } from "react";
import { Check, X } from "@/components/loreguard/icons";
import type { EpisodeSceneEntry } from "@/lib/studio-types";

interface DirectionShotEditorProps {
  initial: EpisodeSceneEntry;
  toneOptions: readonly string[];
  thumbClassName?: string;
  onConfirm: (entry: EpisodeSceneEntry) => void;
  onCancel: () => void;
}

export function DirectionShotEditor({
  initial,
  toneOptions,
  thumbClassName = "dr-grad-0",
  onConfirm,
  onCancel,
}: DirectionShotEditorProps) {
  const [draft, setDraft] = useState<EpisodeSceneEntry>(initial);
  const set = (key: keyof EpisodeSceneEntry, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="dr-trow dr-edit-row">
        <div className="dr-shot">
          <div className={`dr-thumb ${thumbClassName}`} />
          <div className="dr-shot-form">
            <input
              className="dr-edit-control"
              placeholder="씬 #"
              aria-label="씬 번호"
              value={draft.sceneId}
              onChange={(event) => set("sceneId", event.target.value)}
            />
            <input
              className="dr-edit-control"
              placeholder="씬명"
              aria-label="씬명"
              value={draft.sceneName}
              onChange={(event) => set("sceneName", event.target.value)}
            />
            <input
              className="dr-edit-control"
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
            className="dr-edit-control dr-edit-select"
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
            className="dr-edit-control dr-edit-textarea"
            placeholder="연출 의도 / 씬 요약"
            aria-label="연출 의도"
            value={draft.summary}
            onChange={(event) => set("summary", event.target.value)}
          />
        </span>
        <span>
          <textarea
            className="dr-edit-control dr-edit-textarea"
            placeholder="핵심 대사"
            aria-label="핵심 대사"
            value={draft.keyDialogue}
            onChange={(event) => set("keyDialogue", event.target.value)}
          />
        </span>
        <span>
          <input
            className="dr-edit-control"
            placeholder="감정 포인트"
            aria-label="감정 포인트"
            value={draft.emotionPoint}
            onChange={(event) => set("emotionPoint", event.target.value)}
          />
        </span>
        <span className="dr-edit-actions-cell">
          <input
            className="dr-edit-control"
            placeholder="다음 씬"
            aria-label="다음 씬"
            value={draft.nextScene}
            onChange={(event) => set("nextScene", event.target.value)}
          />
          <div className="dr-edit-actions">
            <button
              type="button"
              className="btn dr-edit-btn"
              onClick={() => onConfirm({ ...draft, sceneId: draft.sceneId.trim() || `${Date.now()}` })}
              aria-label="저장"
              title="저장"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="btn ghost dr-edit-btn"
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
        className="dr-trow dr-edit-row dr-design-edit-row"
      >
        <textarea
          className="dr-edit-control dr-design-edit-textarea"
          placeholder="씬 목적"
          aria-label="씬 목적"
          value={draft.purpose ?? ""}
          onChange={(event) => set("purpose", event.target.value)}
        />
        <textarea
          className="dr-edit-control dr-design-edit-textarea"
          placeholder="장면 갈등"
          aria-label="장면 갈등"
          value={draft.conflict ?? ""}
          onChange={(event) => set("conflict", event.target.value)}
        />
        <textarea
          className="dr-edit-control dr-design-edit-textarea"
          placeholder="공개 정보"
          aria-label="공개 정보"
          value={draft.publicInfo ?? ""}
          onChange={(event) => set("publicInfo", event.target.value)}
        />
        <textarea
          className="dr-edit-control dr-design-edit-textarea"
          placeholder="숨김 정보"
          aria-label="숨김 정보"
          value={draft.hiddenInfo ?? ""}
          onChange={(event) => set("hiddenInfo", event.target.value)}
        />
        <input
          className="dr-edit-control"
          placeholder="감정곡선"
          aria-label="감정곡선"
          value={draft.emotionCurve ?? ""}
          onChange={(event) => set("emotionCurve", event.target.value)}
        />
        <input
          className="dr-edit-control"
          placeholder="보상감"
          aria-label="보상감"
          value={draft.rewardBeat ?? ""}
          onChange={(event) => set("rewardBeat", event.target.value)}
        />
        <input
          className="dr-edit-control"
          placeholder="후킹"
          aria-label="후킹"
          value={draft.hookPoint ?? ""}
          onChange={(event) => set("hookPoint", event.target.value)}
        />
        <div className="stat-foot dr-design-edit-note">
          목적 · 갈등 · 공개/숨김 정보 · 감정곡선 · 보상감 · 후킹 · 다음 연결
        </div>
      </div>
    </>
  );
}

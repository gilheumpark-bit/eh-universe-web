"use client";

import { useState } from "react";
import { Branch, Dots, Edit, X } from "@/components/loreguard/icons";
import type { EpisodeSceneSheet, MainScenarioAct, MainScenarioStructure } from "@/lib/studio-types";
import { accentFor, beatDesc, buildEventChain } from "./TabPlot.shared";

interface BeatCardProps {
  sheet: EpisodeSceneSheet;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}

export function BeatCard({ sheet, index, expanded, onToggle, onRename, onRemove }: BeatCardProps) {
  const accent = accentFor(index);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sheet.title);
  const desc = beatDesc(sheet);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== sheet.title) onRename(next);
    else setDraft(sheet.title);
    setEditing(false);
  };

  return (
    <div className="pl-beat">
      <div className="pl-beat-top">
        <span className="pl-beat-n" style={{ background: accent }}>
          {sheet.episode}
        </span>
        {editing ? (
          <input
            className="pl-beat-t"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(sheet.title);
                setEditing(false);
              }
            }}
            style={{ flex: 1, minWidth: 0, font: "inherit", background: "transparent", color: "inherit", border: "1px solid var(--line)", borderRadius: 4, padding: "2px 4px" }}
            aria-label="비트 제목 편집"
          />
        ) : (
          <span className="pl-beat-t">{sheet.title || `${sheet.episode}화`}</span>
        )}
        <button
          type="button"
          className="eh-icbtn"
          onClick={() => setEditing(true)}
          aria-label="비트 이름 편집"
          title="비트 이름 편집"
          style={{ marginLeft: "auto" }}
        >
          <Edit size={13} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="eh-icbtn"
          onClick={onRemove}
          aria-label="비트 삭제"
          title="비트 삭제"
        >
          <X size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="eh-icbtn"
          onClick={onToggle}
          aria-label={expanded ? "접기" : "펼치기"}
          aria-expanded={expanded}
          title={expanded ? "접기" : "펼치기"}
        >
          <Dots size={14} aria-hidden="true" />
        </button>
      </div>
      {desc && <div className="pl-beat-d">{desc}</div>}
      {expanded && sheet.scenes && sheet.scenes.length > 0 && (
        <div className="pl-beat-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
          {sheet.scenes.map((scene) => (
            <span key={scene.sceneId} className="pl-ten-label">
              {scene.sceneId} {scene.sceneName || scene.summary || ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScenarioStructurePanel({
  structure,
  sheets,
  onChange,
}: {
  structure: MainScenarioStructure;
  sheets: EpisodeSceneSheet[];
  onChange: (next: MainScenarioStructure) => void;
}) {
  const sentences = structure.sevenSentenceSynopsis ?? [];
  const acts = structure.acts ?? [];
  const eventChain = structure.eventChain ?? [];
  const filledSentences = sentences.filter((sentence) => sentence.text.trim()).length;
  const endingLock = structure.endingLock ?? { locked: false };

  const updateSentence = (index: number, text: string) => {
    onChange({
      ...structure,
      sevenSentenceSynopsis: sentences.map((sentence) =>
        sentence.index === index ? { ...sentence, text } : sentence,
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateAct = (id: MainScenarioAct["id"], patch: Partial<MainScenarioAct>) => {
    onChange({
      ...structure,
      acts: acts.map((act) => (act.id === id ? { ...act, ...patch } : act)),
      updatedAt: new Date().toISOString(),
    });
  };

  const updateEndingLock = (patch: Partial<NonNullable<MainScenarioStructure["endingLock"]>>) => {
    onChange({
      ...structure,
      endingLock: { ...endingLock, ...patch, updatedAt: new Date().toISOString() },
      updatedAt: new Date().toISOString(),
    });
  };

  const syncEventChain = () => {
    onChange({
      ...structure,
      eventChain: buildEventChain(sheets),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <section className="pcard" aria-label="메인 시나리오 구조화" style={{ marginBottom: 16 }}>
      <div className="pcard-h">
        <Branch size={15} />
        구조화 설계
        <span className="pill blue" style={{ marginLeft: "auto" }}>{filledSentences} / 7문장</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <div className="pl-sub" style={{ marginBottom: 8 }}>7문장 시놉시스</div>
          <div style={{ display: "grid", gap: 8 }}>
            {sentences.map((sentence) => (
              <label key={sentence.id} className="pl-citem" style={{ display: "grid", gap: 6 }}>
                <span className="pl-citem-t">{sentence.label}</span>
                <textarea
                  value={sentence.text}
                  onChange={(event) => updateSentence(sentence.index, event.target.value)}
                  className="wd-in-field"
                  style={{ minHeight: 52, resize: "vertical" }}
                  placeholder="확정 전이면 비워둡니다"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="pl-sub" style={{ marginBottom: 8 }}>3막 / 시즌 구조</div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {acts.map((act) => (
              <div key={act.id} className="pl-citem">
                <div className="pl-citem-t">{act.title}</div>
                <input
                  value={act.seasonLabel ?? ""}
                  onChange={(event) => updateAct(act.id, { seasonLabel: event.target.value })}
                  className="wd-in-field"
                  placeholder="시즌/부"
                  style={{ marginTop: 6 }}
                />
                <textarea
                  value={act.summary}
                  onChange={(event) => updateAct(act.id, { summary: event.target.value })}
                  className="wd-in-field"
                  placeholder="이 막의 역할"
                  style={{ minHeight: 64, marginTop: 6, resize: "vertical" }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pl-citem">
          <label className="pl-citem-t" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={endingLock.locked}
              onChange={(event) => updateEndingLock({ locked: event.target.checked })}
            />
            결말 잠금
          </label>
          <div style={{ display: "grid", gap: 8, marginTop: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <input
              value={endingLock.finalImage ?? ""}
              onChange={(event) => updateEndingLock({ finalImage: event.target.value })}
              className="wd-in-field"
              placeholder="결말 이미지"
            />
            <input
              value={endingLock.thematicAnswer ?? ""}
              onChange={(event) => updateEndingLock({ thematicAnswer: event.target.value })}
              className="wd-in-field"
              placeholder="주제 답변"
            />
            <input
              value={endingLock.mustResolve ?? ""}
              onChange={(event) => updateEndingLock({ mustResolve: event.target.value })}
              className="wd-in-field"
              placeholder="반드시 회수할 약속"
            />
          </div>
        </div>

        <div className="pl-citem">
          <div className="pl-citem-top">
            <span className="pl-citem-t">이벤트 체인</span>
            <button type="button" className="btn ghost" onClick={syncEventChain} style={{ padding: "5px 10px", fontSize: 12 }}>
              비트에서 갱신
            </button>
          </div>
          {eventChain.length === 0 ? (
            <div className="pl-citem-q">비트가 생기면 사건의 원인과 결과를 분리해 기록합니다.</div>
          ) : (
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {eventChain.map((event) => (
                <div key={event.id} className="pl-citem-q">
                  {event.order}. {event.title}
                  {event.cause ? ` · 원인: ${event.cause}` : ""}
                  {event.effect ? ` · 결과: ${event.effect}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

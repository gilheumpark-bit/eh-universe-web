"use client";

import CandidateDecisionCard from "@/components/loreguard/CandidateDecisionCard";
import {
  ChevronL,
  ChevronR,
  Layers,
  Plus,
  Sparkle,
  Sync,
  User,
} from "@/components/loreguard/icons";
import type { AcceptedImportCandidateRecord, Character } from "@/lib/studio-types";
import {
  AV_COLORS,
  avatarGradient,
  avColor,
  avLetter,
  candidateMeta,
  candidateNotices,
  candidateSubtitle,
  cleanCandidateTitle,
} from "./TabCharacter.shared";

interface EmptyProjectStateProps {
  isKO: boolean;
  onCreate: () => void;
}

export function EmptyProjectState({ isKO, onCreate }: EmptyProjectStateProps) {
  return (
    <div className="ch-grid">
      <section className="ch-center" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <span className="ch-av lg" style={{ background: avatarGradient(AV_COLORS[0]), margin: "0 auto 18px" }}>
            <User size={34} strokeWidth={1.6} />
          </span>
          <h2 className="ch-name" style={{ fontSize: 22 }}>
            {isKO ? "프로젝트가 없습니다" : "No project yet"}
          </h2>
          <div className="ch-oneliner" style={{ margin: "8px auto 20px" }}>
            {isKO
              ? "캐릭터를 관리하려면 먼저 프로젝트를 만들어 주세요."
              : "Create a project first to manage characters."}
          </div>
          <div style={{ display: "grid", gap: 8, margin: "0 auto 20px", textAlign: "left" }}>
            {[
              isKO ? ["욕망과 결핍", "인물이 왜 움직이는지 기준을 잡습니다."] : ["Desire and flaw", "Set why each character moves."],
              isKO ? ["관계도", "갈등, 동맹, 비밀을 장면과 연결합니다."] : ["Relationship map", "Connect conflict, alliance, and secrets to scenes."],
              isKO ? ["자산화 메모", "권리/IP와 매체 확장 가능성을 남깁니다."] : ["Asset notes", "Keep rights/IP and media expansion notes."],
            ].map(([title, body]) => (
              <div key={title} className="pcard" style={{ padding: 12 }}>
                <div className="ch-name" style={{ fontSize: 13 }}>{title}</div>
                <div className="ch-oneliner" style={{ marginTop: 4 }}>{body}</div>
              </div>
            ))}
          </div>
          <button type="button" className="btn primary" onClick={onCreate}>
            <Plus size={15} strokeWidth={1.6} />
            {isKO ? "새 프로젝트" : "New project"}
          </button>
        </div>
      </section>
    </div>
  );
}

interface CharacterRailProps {
  railOpen: boolean;
  isRailSheet: boolean;
  isItems: boolean;
  charView: "profile" | "graph";
  characters: Character[];
  activeId: string | null;
  povCharacter?: string;
  relationCount: number;
  itemCount: number;
  skillCount: number;
  magicSystemCount: number;
  aiBusy: boolean;
  aiMsg: { text: string; tone: "error" | "info" } | null;
  onToggleRail: () => void;
  onCloseRailIfSheet: () => void;
  onSetSubTab: (next: "characters" | "items") => void;
  onSetCharView: (next: "profile" | "graph") => void;
  onAdd: () => void;
  onAiGenerate: () => void;
  onSelectCharacter: (id: string) => void;
}

export function CharacterRail({
  railOpen,
  isRailSheet,
  isItems,
  charView,
  characters,
  activeId,
  povCharacter,
  relationCount,
  itemCount,
  skillCount,
  magicSystemCount,
  aiBusy,
  aiMsg,
  onToggleRail,
  onCloseRailIfSheet,
  onSetSubTab,
  onSetCharView,
  onAdd,
  onAiGenerate,
  onSelectCharacter,
}: CharacterRailProps) {
  const collapsedSummary = isItems
    ? [
        { label: "아이템", value: String(itemCount), tone: itemCount > 0 ? "green" : "amber" },
        { label: "스킬", value: String(skillCount), tone: skillCount > 0 ? "blue" : "gray" },
        { label: "체계", value: String(magicSystemCount), tone: magicSystemCount > 0 ? "blue" : "gray" },
      ]
    : [
        { label: "인물", value: String(characters.length), tone: characters.length > 0 ? "green" : "amber" },
        { label: "관계", value: String(relationCount), tone: relationCount > 0 ? "blue" : "gray" },
        { label: "시점", value: povCharacter ? "ON" : "대기", tone: povCharacter ? "green" : "amber" },
      ];

  if (!railOpen) {
    return (
      <aside id="lg-character-rail" className="ch-rail collapsed" aria-label="캐릭터·아이템 로스터 (접힘)">
        <button
          type="button"
          className="wd-panel-toggle"
          aria-expanded={false}
          aria-controls="lg-character-rail"
          aria-label="캐릭터·아이템 로스터 펼치기"
          title="캐릭터·아이템 로스터 펼치기"
          onClick={onToggleRail}
        >
          <ChevronR size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <span className="wd-vlabel">캐릭터·아이템</span>
        <span
          className="wd-collapsed-summary"
          aria-label={collapsedSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
        >
          {collapsedSummary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="lg-character-rail"
      className="ch-rail"
      aria-label="캐릭터·아이템 로스터"
      role={isRailSheet ? "dialog" : undefined}
      aria-modal={isRailSheet ? true : undefined}
    >
      <div className="ch-rail-head">
        <div className="trail-title">
          <span className="trail-ic">
            {isItems ? <Layers size={18} strokeWidth={1.6} /> : <User size={18} strokeWidth={1.6} />}
          </span>
          <div>
            <div className="trail-name">{isItems ? "아이템 모드" : "캐릭터 모드"}</div>
            <div className="trail-sub">
              {isItems
                ? `아이템 ${itemCount} · 스킬 ${skillCount} · 체계 ${magicSystemCount}`
                : `인물 ${characters.length}명`}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-expanded={true}
          aria-controls="lg-character-rail"
          aria-label="캐릭터·아이템 로스터 접기"
          title="캐릭터·아이템 로스터 접기"
          onClick={onToggleRail}
        >
          <ChevronL size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      </div>

      <div className="seg" style={{ display: "flex", width: "100%", margin: "2px 0 10px" }}>
        <button
          type="button"
          className={!isItems ? "on" : ""}
          style={{ flex: 1 }}
          aria-pressed={!isItems}
          onClick={() => {
            onSetSubTab("characters");
            onCloseRailIfSheet();
          }}
        >
          인물
        </button>
        <button
          type="button"
          className={isItems ? "on" : ""}
          style={{ flex: 1 }}
          aria-pressed={isItems}
          onClick={() => {
            onSetSubTab("items");
            onCloseRailIfSheet();
          }}
        >
          아이템
        </button>
      </div>

      {isItems ? (
        <div className="ch-none" style={{ padding: "8px 10px" }}>
          아이템·스킬·마법 체계는 우측 패널에서 추가·편집합니다. 밸런스 분석 포함.
        </div>
      ) : (
        <>
          <div className="seg" style={{ display: "flex", width: "100%", margin: "0 0 10px" }}>
            <button
              type="button"
              className={charView === "profile" ? "on" : ""}
              style={{ flex: 1 }}
              aria-pressed={charView === "profile"}
              onClick={() => {
                onSetCharView("profile");
                onCloseRailIfSheet();
              }}
            >
              프로필
            </button>
            <button
              type="button"
              className={charView === "graph" ? "on" : ""}
              style={{ flex: 1 }}
              aria-pressed={charView === "graph"}
              onClick={() => {
                onSetCharView("graph");
                onCloseRailIfSheet();
              }}
            >
              관계도
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={onAdd}
            >
              <Plus size={15} strokeWidth={1.6} />
              새 인물
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ flex: 1, justifyContent: "center", opacity: aiBusy ? 0.6 : 1 }}
              onClick={onAiGenerate}
              disabled={aiBusy}
              aria-busy={aiBusy}
            >
              {aiBusy ? (
                <Sync size={15} strokeWidth={1.6} className="animate-spin" />
              ) : (
                <Sparkle size={15} strokeWidth={1.6} />
              )}
              {aiBusy ? "제안 준비 중…" : "노아 제안"}
            </button>
          </div>
          {aiMsg && (
            <div
              role={aiMsg.tone === "error" ? "alert" : "status"}
              className="ch-none"
              style={{
                padding: "0 4px 10px",
                ...(aiMsg.tone === "error" ? { color: "var(--c-red)" } : null),
              }}
            >
              {aiMsg.text}
            </div>
          )}
          {characters.length === 0 ? (
            <div className="ch-none" style={{ padding: "8px 10px" }}>
              아직 등록된 인물이 없습니다. “새 인물”로 추가하세요.
            </div>
          ) : (
            characters.map((character, index) => {
              const isPov = povCharacter === character.id || povCharacter === character.name;
              return (
                <button
                  key={character.id}
                  type="button"
                  className={`ch-rost${activeId === character.id ? " on" : ""}`}
                  onClick={() => onSelectCharacter(character.id)}
                >
                  <span className="ch-av sm" style={{ background: avColor(index) }}>
                    {avLetter(character.name)}
                  </span>
                  <div className="ch-rost-body">
                    <div className="ch-rost-n">{character.name}</div>
                    <div className="ch-rost-r">{character.role || "역할 미정"}</div>
                  </div>
                  <span className={`pill ${isPov ? "blue" : "gray"}`}>{isPov ? "POV" : "인물"}</span>
                </button>
              );
            })
          )}
        </>
      )}
    </aside>
  );
}

interface ImportCandidatesSectionProps {
  isItems: boolean;
  candidates: AcceptedImportCandidateRecord[];
  onAccept: (candidate: AcceptedImportCandidateRecord) => void;
  onHold: (candidate: AcceptedImportCandidateRecord) => void;
  onDiscard: (candidate: AcceptedImportCandidateRecord) => void;
}

export function ImportCandidatesSection({
  isItems,
  candidates,
  onAccept,
  onHold,
  onDiscard,
}: ImportCandidatesSectionProps) {
  if (candidates.length === 0) return null;
  return (
    <section
      className="pcard"
      aria-label={isItems ? "아이템 읽은 자료 검토" : "캐릭터 읽은 자료 검토"}
      style={{ marginBottom: 18 }}
    >
      <div className="pcard-h">
        <Layers size={15} aria-hidden="true" />
        읽은 자료 검토 ({candidates.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {candidates.map((candidate) => (
          <CandidateDecisionCard
            key={candidate.id}
            title={cleanCandidateTitle(candidate.title, isItems ? "아이템" : "캐릭터")}
            body={candidate.excerpt || candidate.text}
            subtitle={candidateSubtitle(candidate)}
            meta={candidateMeta(candidate)}
            notices={candidateNotices(candidate)}
            acceptLabel={isItems ? "아이템 반영" : "인물 반영"}
            onAccept={() => onAccept(candidate)}
            onHold={() => onHold(candidate)}
            onDiscard={() => onDiscard(candidate)}
          />
        ))}
      </div>
    </section>
  );
}

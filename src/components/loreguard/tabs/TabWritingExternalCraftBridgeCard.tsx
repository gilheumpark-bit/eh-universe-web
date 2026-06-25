import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Quote } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, Project, StoryConfig } from "@/lib/studio-types";
import {
  buildExternalCraftBridge,
  type ExternalCraftReference,
} from "@/lib/writing-workspace/cross-project-bridge";

function collectProjectCraftSource(project: Project): string {
  const parts: string[] = [project.name, project.description];
  for (const session of project.sessions ?? []) {
    const sessionConfig = session.config;
    parts.push(
      session.title,
      sessionConfig.title,
      sessionConfig.synopsis ?? "",
      sessionConfig.corePremise ?? "",
      sessionConfig.currentConflict ?? "",
      sessionConfig.sceneDirection?.writerNotes ?? "",
      sessionConfig.sceneDirection?.productionDirection?.proseRhythm ?? "",
    );
    for (const manuscript of sessionConfig.manuscripts ?? []) {
      parts.push(manuscript.title, manuscript.summary ?? "", manuscript.detailedSummary ?? "", manuscript.content);
    }
  }
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 24_000);
}

export const ExternalCraftBridgeCard = memo(function ExternalCraftBridgeCard({
  config,
  language,
  projects,
  currentProjectId,
  setConfig,
}: {
  config: StoryConfig;
  language: AppLanguage;
  projects: Project[];
  currentProjectId: string | null;
  setConfig: (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
}) {
  const activeReferences = config.externalCraftReferences ?? [];
  const sourceProjects = useMemo(
    () => projects.filter((project) => project.id !== currentProjectId && collectProjectCraftSource(project).length > 0),
    [currentProjectId, projects],
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [objective, setObjective] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const nextProjectId = sourceProjects.length === 0
      ? ""
      : sourceProjects.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : sourceProjects[0]?.id ?? "";
    if (nextProjectId === selectedProjectId) return;
    const selectionTimer = window.setTimeout(() => {
      setSelectedProjectId(nextProjectId);
    }, 0);
    return () => window.clearTimeout(selectionTimer);
  }, [selectedProjectId, sourceProjects]);

  const selectedProject = sourceProjects.find((project) => project.id === selectedProjectId) ?? null;

  const addReference = useCallback(() => {
    if (!selectedProject) {
      setNotice(L4(language, { ko: "참조할 다른 작품이 없습니다.", en: "No other work is available." }));
      return;
    }
    const result = buildExternalCraftBridge({
      currentProjectId: currentProjectId ?? "current-project",
      sourceProjectId: selectedProject.id,
      sourceProjectTitle: selectedProject.name,
      objective: objective.trim() || L4(language, {
        ko: "장면 전개, 긴장 상승, 문장 리듬을 현재 작품에 맞게 참고",
        en: "Reference scene progression, tension build, and sentence rhythm for the current work",
      }),
      sourceText: collectProjectCraftSource(selectedProject),
    });
    if (!result.ok || !result.reference) {
      setNotice(result.blockedReasons.join(" / ") || L4(language, { ko: "브릿지 생성 실패", en: "Bridge creation failed" }));
      return;
    }
    const reference: ExternalCraftReference = result.reference;
    setConfig((prev) => {
      const existing = prev.externalCraftReferences ?? [];
      const next = [
        reference,
        ...existing.filter((item) => item.id !== reference.id),
      ].slice(0, 3);
      return { ...prev, externalCraftReferences: next };
    });
    setNotice(L4(language, { ko: "기법 브릿지 연결 완료", en: "Craft bridge linked" }));
  }, [currentProjectId, language, objective, selectedProject, setConfig]);

  const removeReference = useCallback((referenceId: string) => {
    setConfig((prev) => ({
      ...prev,
      externalCraftReferences: (prev.externalCraftReferences ?? []).filter((reference) => reference.id !== referenceId),
    }));
  }, [setConfig]);

  return (
    <div className="pcard">
      <div className="pcard-h">
        <Quote size={15} />
        {L4(language, { ko: "외부 기법 브릿지", en: "External craft bridge" })}
        <span className="pill blue craft-bridge-auto">
          {L4(language, { ko: "원문 제외", en: "No source text" })}
        </span>
      </div>
      <div className="wr-srow craft-bridge-copy">
        {L4(language, {
          ko: "다른 작품의 이름·사건은 빼고, 리듬·텐션·전환 방식만 현재 작품에 연결합니다.",
          en: "Links rhythm, tension, and transition craft without carrying names or events across.",
        })}
      </div>
      <label className="craft-bridge-field">
        {L4(language, { ko: "참조할 기존 작품", en: "Source work" })}
        <select
          value={selectedProjectId}
          disabled={sourceProjects.length === 0}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="craft-bridge-control"
        >
          {sourceProjects.length === 0 ? (
            <option value="">{L4(language, { ko: "다른 작품 없음", en: "No other work" })}</option>
          ) : sourceProjects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </label>
      <label className="craft-bridge-field">
        {L4(language, { ko: "참조 목적", en: "Craft goal" })}
        <textarea
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder={L4(language, {
            ko: "예: 1부 결말부처럼 긴장을 끌어올리되, 현재 작품의 인물과 사건으로만 쓰기",
            en: "Example: build tension like a season finale, using only this work's cast and events",
          })}
          rows={3}
          className="craft-bridge-control craft-bridge-textarea"
        />
      </label>
      <div className="wr-cta craft-bridge-cta">
        <button type="button" className="mini-btn" disabled={!selectedProject} onClick={addReference}>
          <Layers size={13} />
          {L4(language, { ko: "기법만 추출", en: "Extract craft only" })}
        </button>
      </div>
      {notice && (
        <div className="wr-srow craft-bridge-status" role="status">
          {notice}
        </div>
      )}
      {activeReferences.length === 0 ? (
        <div className="wr-srow craft-bridge-status">
          {L4(language, { ko: "연결된 기법 브릿지가 없습니다.", en: "No craft bridge linked." })}
        </div>
      ) : activeReferences.map((reference) => (
        <div key={reference.id} className="wr-srow craft-bridge-reference">
          <span className="rdot blue" />
          <span className="craft-bridge-reference-title">
            {reference.sourceProjectTitle}
          </span>
          <span className="pill amber craft-bridge-auto">
            {L4(language, {
              ko: `주의어 ${reference.prohibitedTerms.length}개`,
              en: `${reference.prohibitedTerms.length} held terms`,
            })}
          </span>
          <button type="button" className="mini-btn" onClick={() => removeReference(reference.id)}>
            {L4(language, { ko: "해제", en: "Remove" })}
          </button>
        </div>
      ))}
    </div>
  );
});
